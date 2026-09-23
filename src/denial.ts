import { log, warn } from "./log";
import { announce } from "./flavor";
import { applyEffect } from "./effects";
import { getFeatures } from "./storage";
import { orgasmDeniedByUs, denialCarrierLost } from "./arousal";

// Spoken orgasm denial, enforced by the add-on itself.
//
// Denial has always been BC's own DenialMode effect on the Emoticon carrier. BC's rule, read from
// the live client by DW on 2026-09-23 (the unhooked original, via bcModSdk.getPatchingInfo()):
//
//   ActivityTimerProgress: ... if (C.ArousalSettings.Progress == 100) ActivityOrgasmPrepare(C);
//   ActivityOrgasmPrepare(C, Bypass):
//     if (C.Effect.includes("DenialMode")) {
//       C.ArousalSettings.Progress = 99;
//       if (C.IsPlayer() && (Bypass || C.Effect.includes("RuinOrgasms"))) ActivityOrgasmRuined = true;
//       else return;
//     }
//     ...then the edging check, then OrgasmTimer / OrgasmStage and the resist game.
//
// So BC does refuse, but only if its CACHED C.Effect carries DenialMode (v0.83.1 made sure it
// does) and only if nobody calls in with Bypass. DW's live run on v0.83.1 still ended in an
// orgasm: the subject was told "you cannot cum", the toy held her meter still (that is BC's 99),
// and her own masturbation then finished her anyway. Something on her client got past BC's check,
// and the room had BCX and WCE hooking these very functions. Rather than depend on every other
// mod leaving that check alone, the add-on stands in front of the orgasm itself, reading OUR
// carrier directly rather than BC's cache.
//
// Prepare is the entry every arousal source funnels into (a toy, an activity, the player's own
// hand, all through ActivityTimerProgress). Start is hooked as well, for anything that skips
// Prepare. While OUR denial is on, both are swallowed and the meter is held where BC's own denial
// holds it.
//
// Only OUR denial. A real chastity item's DenialMode is BC's to enforce, not ours, the same split
// selftouch.ts draws for Freeze. A commanded orgasm ("cum for me") lifts our denial for that one
// act before it calls in (voice.ts applyForcedOrgasm), so it passes straight through here, and
// DW's "command always wins" (2026-09-12) still holds.
//
// v0.84.1 closed two ways past this (review 2026-09-23, DW chose "hold at 99"):
//
// 1. A swallowed orgasm stayed QUEUED. BC's Timer.js, read live the same day:
//      if (OrgasmTimer > 0 && OrgasmTimer < CurrentTime)
//        if (OrgasmStage <= 1) ActivityOrgasmStart(C); else ActivityOrgasmStop(C, 20);
//    Swallowing Start left OrgasmTimer set, so BC retried Start every second, the chat room kept
//    drawing the orgasm overlay (it draws whenever OrgasmTimer > 0), and the first tick after our
//    denial lifted gave her a full orgasm. The easy way in is a denial landing inside BC's
//    5-second window after Prepare, which is exactly when a hypnotist says it. So a hold now
//    cancels any PENDING orgasm (stage 0 window or stage 1 resist game) the way ActivityOrgasmStop
//    does (timer and stage to 0), minus the arousal drop, and leaves her at 99. An orgasm already
//    HAPPENING (stage 2) is left alone: one only gets there while our denial was off, e.g. a
//    commanded "cum for me", and cutting it off would be us taking back a command.
//    LSCG's DeniedState (src/Modules/States/DeniedState.ts) stops the same leak the other way,
//    hooking ActivityOrgasmStart at priority 100 and forcing ActivityOrgasmRuined so BC's own
//    ruined branch clears the state. Technique reference only (rule 7); DW wanted the edge held
//    rather than a ruined orgasm and its drop to 65-85.
//
// 2. The carrier was the only record. Anything that rebuilt the Emoticon item took DenialMode
//    with it and this hook quietly stood aside. The hook now trusts arousal.ts's in-memory flag
//    and puts the carrier back when it finds it gone, so BC's own 99 pin and the room agree again.

/** Where the meter is held: 99, exactly what BC's own DenialMode branch sets. Written straight
 * to Progress as BC does there, rather than through ActivitySetArousal, which would send a room
 * sync on every climb. */
export const DENIAL_HOLD = 99;

/** BC's OrgasmStage for an orgasm actually in progress (0 is the pre-orgasm window, 1 the resist
 * game), per ActivityOrgasmStart / ActivityOrgasmGameGenerate. */
const ORGASM_HAPPENING = 2;

/** The held orgasm is announced at most this often. A toy at full power reaches the top again
 * every few seconds, and one line per climb would flood both the subject's chat and the room. */
const ANNOUNCE_EVERY_MS = 60_000;
let lastAnnounced = 0;

function isPlayer(C: any): boolean {
	return !!C && (C === Player || C.IsPlayer?.() === true);
}

/** True when an orgasm BC is about to start should be stopped by us. Exported for the suite. */
export function denialHolds(C: any): boolean {
	return isPlayer(C) && getFeatures().hypnoEnabled && orgasmDeniedByUs();
}

/** True while an orgasm is actually happening, which a hold must not cut short (see header). */
function orgasmHappening(settings: any): boolean {
	return settings.OrgasmStage === ORGASM_HAPPENING
		&& typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > CurrentTime;
}

/** Cancel a queued orgasm the way ActivityOrgasmStop does (timer and stage to 0), without its
 * arousal drop. Returns true if there was one. */
function cancelPendingOrgasm(settings: any): boolean {
	if (!(typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > 0)) return false;
	settings.OrgasmTimer = 0;
	settings.OrgasmStage = 0;
	if (typeof ActivityOrgasmGameTimer === "number") ActivityOrgasmGameTimer = 0;
	return true;
}

function hold(): void {
	// Carrier gone but our flag says denied: put it back, so BC's own 99 pin, the cached C.Effect
	// and everyone else's view of her agree with what this hook is enforcing.
	if (denialCarrierLost()) {
		const restored = applyEffect("DenialMode");
		warn(restored
			? "orgasm denial was missing from the carrier; re-applied it"
			: "orgasm denial is missing from the carrier and could not be re-applied; still enforcing it here");
	}
	const settings = Player?.ArousalSettings;
	if (settings) {
		const cancelled = cancelPendingOrgasm(settings);
		settings.Progress = DENIAL_HOLD;
		// Only when a queued orgasm was cancelled, so the room's copy stops showing one. An
		// ordinary climb-and-hold stays unsynced, as BC's own DenialMode branch does.
		if (cancelled) {
			if (typeof ActivityChatRoomArousalSync === "function") ActivityChatRoomArousalSync(Player);
			log("a queued orgasm was cancelled by denial");
		}
	}
	const now = Date.now();
	if (now - lastAnnounced >= ANNOUNCE_EVERY_MS) {
		lastAnnounced = now;
		announce("orgasm-held");
	}
	log(`orgasm held by denial, arousal kept at ${DENIAL_HOLD}`);
}

export function installDenial(modApi: any): void {
	for (const name of ["ActivityOrgasmPrepare", "ActivityOrgasmStart"]) {
		modApi.hookFunction(
			name,
			10,
			((args: any[], next: (args: any[]) => any) => {
				try {
					if (denialHolds(args[0])) {
						// Mid-orgasm: nothing to stop, and nothing to hold (see header).
						if (!orgasmHappening(Player.ArousalSettings ?? {})) hold();
						return undefined;
					}
				} catch (err) {
					// A bug here must never make orgasms impossible. Fall through to BC.
					warn("orgasm denial check failed:", err);
				}
				return next(args);
			}) as any,
		);
	}
	log("orgasm denial hooks installed on ActivityOrgasmPrepare and ActivityOrgasmStart");
}
