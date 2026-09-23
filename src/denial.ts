import { log, warn } from "./log";
import { announce } from "./flavor";
import { hasOwnEffect } from "./effects";
import { getFeatures } from "./storage";

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

/** Where the meter is held: 99, exactly what BC's own DenialMode branch sets. Written straight
 * to Progress as BC does there, rather than through ActivitySetArousal, which would send a room
 * sync on every climb. */
export const DENIAL_HOLD = 99;

/** The held orgasm is announced at most this often. A toy at full power reaches the top again
 * every few seconds, and one line per climb would flood both the subject's chat and the room. */
const ANNOUNCE_EVERY_MS = 60_000;
let lastAnnounced = 0;

function isPlayer(C: any): boolean {
	return !!C && (C === Player || C.IsPlayer?.() === true);
}

/** True when an orgasm BC is about to start should be stopped by us. Exported for the suite. */
export function denialHolds(C: any): boolean {
	return isPlayer(C) && getFeatures().hypnoEnabled && hasOwnEffect("DenialMode");
}

function hold(): void {
	if (Player?.ArousalSettings) Player.ArousalSettings.Progress = DENIAL_HOLD;
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
						hold();
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
