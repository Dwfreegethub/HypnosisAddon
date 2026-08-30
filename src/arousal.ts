import { log } from "./log";
import { applyEffect, removeEffect } from "./effects";

// Arousal and orgasm control.
//
// Everything here drives BC's OWN arousal system rather than a parallel one of our own —
// verified against Scripts/Activity.js in the live client. That matters more than usual:
// arousal is already visible to the whole room (the meter, the pink screen filter, facial
// expressions), and a hypnosis add-on that tracked its own private number would look
// completely disconnected from what everyone else can see.
//
// The API surface used, and why each one:
//   ActivitySetArousal(C, n)      — sets and clamps Progress, and syncs it to the room.
//   ActivityExpression(C, n)      — blush / eyes / drool for a level. NOT called by
//                                   ActivitySetArousal; BC only runs it from its own timer
//                                   path, so setting arousal without it moves the meter and
//                                   leaves the face blank.
//   ActivityOrgasmPrepare(C)      — starts an orgasm, and is where BC enforces DenialMode
//                                   and edging. Delegated to rather than reimplemented, so
//                                   a chastity belt or an edging item still wins.
//   ActivityOrgasmStart(C)        — the orgasm itself, skipping the 5-second resist window.
//
// The lifecycle after that is BC's: Timer.js watches OrgasmTimer and calls
// ActivityOrgasmStop when it expires, dropping the player to arousal 20.

/** The four levels, and what each one means on BC's own 0-100 scale.
 *
 * Not arbitrary — each lands on a band BC already has an expression for (Activity.js's
 * ActivityExpression floors to the nearest 10): 30 is where blush starts and a penis goes
 * hard, 70 is the "Horny" eyes and drool band, and 95 is exactly what BC itself sets an
 * edged character to, and the cap it applies to any zone that isn't allowed to finish. So
 * "fully aroused, just short of orgasm" is 95 in the game's own terms, not our guess. */
export const AROUSAL_LEVELS = {
	none: 0,
	light: 30,
	high: 70,
	full: 95,
} as const;

export type ArousalLevel = keyof typeof AROUSAL_LEVELS;

export type OrgasmResult = "orgasm" | "denied" | "already" | "unavailable";

/** Is the player playing with arousal at all?
 *
 * "Inactive" is the one mode we refuse: it means the player has switched arousal off
 * entirely, and a hypnotic suggestion is not a reason to override that. Every other mode
 * is fair game — "NoMeter" only hides the display, and "Manual" is *literally* the mode
 * for arousal that changes by something other than automatic activity, which is what a
 * spoken suggestion is. */
export function arousalAvailable(): boolean {
	const settings = Player?.ArousalSettings;
	return !!settings && settings.Active !== "Inactive";
}

/** Set arousal to a named level. Returns false if the player has arousal switched off. */
export function setArousalLevel(level: ArousalLevel): boolean {
	if (!arousalAvailable()) {
		log(`arousal suggestion ignored — the player's arousal meter is set to Inactive`);
		return false;
	}
	const target = AROUSAL_LEVELS[level];
	ActivitySetArousal(Player, target);

	// Match BC's own condition from ActivityTimerProgress: expressions follow arousal only
	// when the player allows it, and never while an orgasm is already running (the orgasm
	// owns the face at that point).
	const settings = Player.ArousalSettings;
	const orgasming = typeof settings.OrgasmTimer === "number" && settings.OrgasmTimer > CurrentTime;
	if (!orgasming && (settings.AffectExpression == null || settings.AffectExpression)) {
		ActivityExpression(Player, target);
	}
	log(`arousal set to ${level} (${target})`);
	return true;
}

/** Push the player over the edge now.
 *
 * Prepare-then-Start deliberately skips BC's 5-second "Try to resist / Surrender" window.
 * A forced orgasm that offers a Resist button isn't forced — and the resist mini-game is
 * already what BC gives you when a vibrator does it, which is the thing this is meant to
 * feel different from.
 *
 * Whether it lands is decided by ActivityOrgasmPrepare, not by us: it bails out (leaving
 * OrgasmTimer untouched) for DenialMode, for an edged character, and for a craft with the
 * Edging property. Reading the timer back is how we tell those apart, which means a real
 * chastity item — or our own denial suggestion — silently wins without this file having to
 * know the rules. */
export function forceOrgasm(): OrgasmResult {
	if (!arousalAvailable()) return "unavailable";
	const settings = Player.ArousalSettings;
	const before = typeof settings.OrgasmTimer === "number" ? settings.OrgasmTimer : 0;
	if (before > CurrentTime) return "already";

	ActivityOrgasmPrepare(Player);
	const after = typeof settings.OrgasmTimer === "number" ? settings.OrgasmTimer : 0;
	if (after <= before) {
		log("forced orgasm refused — denial, edging, or a chastity item is in the way");
		return "denied";
	}
	ActivityOrgasmStart(Player);
	log("forced orgasm");
	return "orgasm";
}

/** Lock or unlock orgasms, using BC's own DenialMode effect so its rules apply everywhere —
 * not just to our suggestion, but to vibrators, activities and anything else that would
 * otherwise tip the player over.
 *
 * removeEffect only touches OUR injected Emoticon entry, so releasing this can never strip
 * denial off a real chastity item the player is actually wearing. */
export function setOrgasmDenied(denied: boolean): void {
	if (denied) applyEffect("DenialMode");
	else removeEffect("DenialMode");
	log(`orgasm denial ${denied ? "applied" : "released"}`);
}

/** Drop our denial lock. Called from every session-exit path — a trance ending must never
 * leave someone locked with no one around to unlock them. Arousal LEVEL is deliberately
 * left alone: it's a value the player carries, not an effect we applied. */
export function clearOrgasmDenial(): void {
	removeEffect("DenialMode");
}
