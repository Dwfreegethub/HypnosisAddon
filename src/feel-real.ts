// "The ropes feel real" (v1.22.0, DW 2026-11-26): "Can we look at the restrictions that the item
// applies and have a command something like they feel real to you", then "build they feel real and
// make that as the default message to remind the hypnotist that the bindings dont work by default".
//
// A bondage illusion (see.ts) is only a picture. This makes it hold: the imagined items' own BC
// effects (the asset's Effect plus the chosen option's Property.Effect, read off the ghost items
// illusion.ts built) are put on her through effects.ts, the same Emoticon carrier as "you cannot
// move", so BC enforces them as it would the real item: Block (no hands), BlockMouth and Gag* (gagged
// speech, garbled on her own client before it is sent), Blind* (BC's own blindness, capped by her own
// sensory settings), Slow, Prone, Cuffed*. Checked in live R134 Female3DCG.js: arm rope, cuffs, chains
// and tape carry Block + BlockWardrobe; BallGag BlockMouth + GagMedium; LeatherBlindfold BlindNormal.
//
// Each effect needs her permission for its kind, at its depth: body (Movement Restriction), speech
// (Speech Restriction), sight (Sight). What is left out is told to the hypnotist.
//
// Freeze and BlockWardrobe are never taken from the items: ECHS already holds those for "you cannot
// move" and the wardrobe block, and letting go of the ropes must not let go of those. Block already
// stops her changing clothes. Every effect in REAL_EFFECTS is this module's alone, so letting go
// takes them all off, and recovery treats any left on the carrier as orphans.

import { log } from "./log";
import { applyEffect, removeEffect, heldByUs } from "./effects";
import { ghostEffects, onSeeingDropped, currentSee } from "./illusion";
import type { FeatureToggles } from "./storage";
import { REAL_EFFECTS, REAL_EFFECT_NAMES } from "./real-effects";

export { REAL_EFFECTS, REAL_EFFECT_NAMES };

/** Is "they feel real" on? */
let real = false;
export function isReal(): boolean {
	return real;
}

export type RealResult = { applied: string[]; skipped: { key: keyof FeatureToggles; why: string }[]; none: boolean };

/** Put the imagined items' effects on her. `allowed(key)` answers null when she may have that kind,
 * or why not. Called again when more is added to the illusion while it is real. */
export function makeReal(allowed: (key: keyof FeatureToggles) => string | null): RealResult {
	const wanted = ghostEffects().filter((e) => REAL_EFFECTS[e]);
	const applied: string[] = [];
	const skipped: RealResult["skipped"] = [];
	const verdict = new Map<keyof FeatureToggles, string | null>();
	for (const e of wanted) {
		const key = REAL_EFFECTS[e];
		if (!verdict.has(key)) verdict.set(key, allowed(key));
		const why = verdict.get(key);
		if (why) {
			if (!skipped.some((s) => s.key === key)) skipped.push({ key, why });
			continue;
		}
		if (heldByUs(e) || applyEffect(e)) applied.push(e);
	}
	real = true;
	log(`feel real: ${applied.join(", ") || "nothing"}${skipped.length ? `; not ${skipped.map((s) => s.key).join(", ")}` : ""}`);
	return { applied, skipped, none: wanted.length === 0 };
}

/** Back to a picture: every effect this put on comes off. */
export function unmakeReal(): boolean {
	const was = real;
	real = false;
	let any = false;
	for (const e of REAL_EFFECT_NAMES) if (removeEffect(e)) any = true;
	if (any) log("feel real: let go");
	return was || any;
}

/** Is a bondage illusion running, for "they feel real" to act on? */
export function bindingsShown(): boolean {
	return currentSee()?.kind === "bind";
}

// The picture going (released, replaced, the safeword) takes the hold with it.
onSeeingDropped(() => {
	if (real || REAL_EFFECT_NAMES.some((e) => heldByUs(e))) unmakeReal();
});

// --- wording -------------------------------------------------------------------------------------

const THINGS = String.raw`(?:ropes?|cuffs|handcuffs|chains?|tape|gag|blindfold|bonds|bindings|restraints|knots)`;
const REAL_LINES = [
	new RegExp(String.raw`\b(?:the |your |these |those |all the )?${THINGS}(?: on you)? (?:feels?|are|is|become|becomes) (?:completely |very |all too |suddenly |now )?real\b`),
	/\b(?:they|it|this|that|all of it) (?:feels?|are|is|becomes?) (?:completely |very |all too |suddenly |now )?real\b/,
	new RegExp(String.raw`\byou (?:can )?feel (?:the |your )${THINGS}\b(?! (?:loosen|go|fall|slip))`),
];
const UNREAL_LINES = [
	new RegExp(String.raw`\b(?:the |your )?${THINGS} (?:are|is|feels?) (?:not|no longer) real\b`),
	/\b(?:they|it) (?:are|is|feels?) (?:not|no longer) real\b/,
	/\b(?:they|it) (?:do|does) ?n[o']?t feel real\b/,
	new RegExp(String.raw`\b(?:the |your )?${THINGS} (?:are|is) (?:only|just) (?:a picture|in your head|an illusion)\b`),
];

/** "real" (make it hold), "unreal" (back to a picture), or null. */
export function matchFeelReal(line: string): "real" | "unreal" | null {
	const l = line.toLowerCase();
	if (UNREAL_LINES.some((re) => re.test(l))) return "unreal";
	if (REAL_LINES.some((re) => re.test(l))) return "real";
	return null;
}

export const REAL_ACTION = "see:real";

const KIND_WORDS: Partial<Record<keyof FeatureToggles, string>> = { movementRestriction: "holds their body", speechRestriction: "gags them", sightControl: "blinds them" };
const KIND_PERMISSION: Partial<Record<keyof FeatureToggles, string>> = { movementRestriction: "Movement Restriction", speechRestriction: "Speech Restriction", sightControl: "Sight" };

/** What the hypnotist is told. */
export function realReport(r: RealResult): string {
	if (r.none) return "[suggestion] Nothing they see can hold anyone: no restriction to make real.";
	const kinds = [...new Set(r.applied.map((e) => REAL_EFFECTS[e]))];
	const did = kinds.map((k) => KIND_WORDS[k]).filter(Boolean);
	const not = r.skipped.map((s) => `${KIND_PERMISSION[s.key] ?? s.key}: ${s.why}`);
	if (!did.length) return `[suggestion] It can't hold them: ${not.join("; ")}.`;
	return `[suggestion] It feels real to them now: it ${did.join(", ")}.${not.length ? ` Not the rest (${not.join("; ")}).` : ""} "the ropes are gone" or their safeword ends it.`;
}
