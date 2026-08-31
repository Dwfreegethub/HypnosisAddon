import { log } from "./log";
import { tellPlayer } from "./notify";
import { getFeatures, getTriggerDuration } from "./storage";
import { accessFor } from "./trust";
import { scheduleTimer, cancelTimer } from "./timers";

// Carry-forward: suggestions given under trance that survive waking.
//
// The gap this fills. Everything else is one of two things — a suggestion, which dies with
// the session, or a trigger, which outlives it but lies dormant until someone says a word.
// There was no way to say "you will still be frozen when you wake up".
//
// TARGETED, not a mode. The hypnotist gives a suggestion and then says that one stays —
// "Missy, you cannot tell what you are wearing. Missy, that will stay with you." Said
// again after another suggestion, it keeps that one too.
//
// The two obvious alternatives are both worse, and it is worth writing down why:
//
//   A capture MODE that runs forward from the phrase reads backwards. You have to declare
//   what you are about to do before doing it, which is not how anyone talks, and the phrase
//   most naturally means "that thing I just said".
//
//   Sweeping up everything currently in force is the blunt one. By the end of a session the
//   subject is typically frozen, silent, unaware of clothing changes and holding an
//   illusion; one phrase carrying all of it means she wakes still unable to move or speak
//   because the hypnotist wanted the illusion to hold. Almost never the intent.
//
// So the phrase takes the most recent suggestion, and accumulates. There is a separate
// all-of-it wording for the rare case where the blunt version really is what you want.
//
// Gates match triggers exactly, and for the same reason: this outlives the session, so it
// needs its own permission and relationship trust, and the arousal floor must not reach it.
//
// Every way out of a trance still clears this: the safeword takes it with everything else,
// it wears off on the shared effect duration, and the person who carried it can release it
// by speaking the ordinary release wording — which works outside a trance ONLY while they
// have something carried, which is what keeps ordinary hypnosis phrasing inert on someone
// who is not under.

export const CARRY_TRUST_THRESHOLD = 65;
/** Same cap as a trigger's action list, for the same reason: a bundle this size is already
 * more than anyone can keep track of, and a runaway one is harder to undo than to make. */
const MAX_CARRIED = 8;
const TIMER_KEY = "carry-forward";

/** Who carried them. Only this person can release them by speaking. */
let carrier: number | null = null;
let carrierName = "";
/** Suggestion ids that survive waking. */
let ids: string[] = [];

/** Re-applies a carried suggestion by id. Registered by voice.ts, which owns the
 * suggestion table — a direct import would make voice.ts and this module circular, the
 * same trap timers.ts exists to avoid. */
let reapplyOne: ((id: string) => void) | null = null;
/** Undoes one by id, same arrangement. */
let undoOne: ((id: string) => void) | null = null;

export function registerCarryHandlers(reapply: (id: string) => void, undo: (id: string) => void): void {
	reapplyOne = reapply;
	undoOne = undo;
}

/** Suggestion ids currently applied by the spoken path, most recent LAST. Lives here
 * rather than in voice.ts because session.ts has to clear it on every exit, and voice.ts
 * already imports session.ts — routing it through this module, which both already depend
 * on, is what keeps the graph acyclic. Same reasoning as timers.ts.
 *
 * Deliberately only the spoken path. The trance defaults (cannot move, cannot speak, the
 * veil) are applied straight by applyTranceState and never appear here, so they can never
 * be carried past waking by accident — a subject always gets their legs and their voice
 * back. Making one of those durable takes saying it out loud as a suggestion first, which
 * is exactly the deliberateness it should require. */
const applied: string[] = [];

export function noteApplied(id: string): void {
	const at = applied.indexOf(id);
	if (at !== -1) applied.splice(at, 1);
	applied.push(id);
}

export function noteReleased(id: string): void {
	const at = applied.indexOf(id);
	if (at !== -1) applied.splice(at, 1);
}

/** Everything currently in force from the spoken path, oldest first. */
export function appliedSuggestions(): string[] {
	return [...applied];
}

/** The one "that" refers to. */
export function lastApplied(): string[] {
	return applied.slice(-1);
}

/** Called from every session-exit path — nothing spoken is still in force afterwards. */
export function clearActiveSuggestions(): void {
	applied.length = 0;
}

export function isCarried(id: string): boolean {
	return ids.includes(id);
}

export function carriedIds(): string[] {
	return [...ids];
}

/** Does this person have something carried on us right now? Gates their ability to release
 * it with ordinary wording outside a trance. */
export function isCarrierOf(sender: number): boolean {
	return carrier === sender && ids.length > 0;
}

export function describeCarry(): string {
	if (!ids.length) return "carry-forward: nothing held";
	return `carry-forward: holding ${ids.join(", ")} (from ${carrierName || carrier})`;
}

/** Mark suggestions to survive waking. Returns a line for the subject, or a refusal for
 * the hypnotist — the caller decides where each goes, the same split trigger setup uses.
 *
 * ACCUMULATES rather than replacing, so "that stays with you" can be said after each
 * suggestion the hypnotist actually wants kept. That is the whole design: the alternative
 * of sweeping up everything currently in force would make one phrase carry the freeze, the
 * silence and the suppression along with the thing you meant, and nobody wants their
 * subject to wake up still unable to speak because they wanted the illusion to hold. */
export function carryThese(sender: number, name: string, wanted: string[]): { subject?: string; refusal?: string } {
	const features = getFeatures();
	if (!features.hypnoEnabled) return { refusal: "They have hypnosis switched off." };
	if (!features.carryForward) return { refusal: `They have not enabled "Suggestions that outlive the trance".` };
	const trust = accessFor(sender, "persistent");
	if (trust < CARRY_TRUST_THRESHOLD)
		return { refusal: `Making a suggestion outlive the trance needs trust ${CARRY_TRUST_THRESHOLD}; you are at ${trust.toFixed(1)}.` };
	if (!wanted.length)
		return { refusal: "Nothing to keep — give the suggestion first, then say it stays with them." };

	// A different person taking over replaces the set rather than adding to it; two people
	// each holding half of a bundle has no sensible release story.
	if (carrier !== null && carrier !== sender) releaseCarried("someone else took over");
	carrier = sender;
	carrierName = name;

	const added: string[] = [];
	for (const id of wanted) {
		if (ids.includes(id)) continue;
		if (ids.length >= MAX_CARRIED) {
			log(`carry-forward is full at ${MAX_CARRIED}, dropping "${id}"`);
			continue;
		}
		ids.push(id);
		added.push(id);
	}
	if (!added.length) return { refusal: "That is already set to stay with them." };
	log(`carry-forward will keep ${added.join(", ")} (${ids.length} total)`);
	// Deliberately vague to the subject. They are being told something is being made to
	// last, not given a list they could keep track of and check against later.
	return { subject: "Something in what you were just told settles deeper, and stays." };
}

/** Everything a session-exit path needs: stop capturing, re-apply what survives, and start
 * the clock. Returns a line for the subject, or null if nothing was carried.
 *
 * Re-applying rather than "not clearing" is deliberate. The exit paths clear every effect
 * in one place precisely so nothing can be stranded by a missed branch; carving exceptions
 * into that would put the guarantee at the mercy of this feature. So the clear stays total,
 * and what survives is put back afterwards from a list. */
export function carryThroughWake(): string | null {
	if (!ids.length) return null;
	for (const id of ids) {
		try {
			reapplyOne?.(id);
		} catch (err) {
			log(`carry-forward could not re-apply "${id}":`, err);
		}
	}
	const minutes = getTriggerDuration();
	cancelTimer(TIMER_KEY);
	if (minutes > 0) {
		scheduleTimer(TIMER_KEY, minutes * 60_000, () => {
			releaseCarried("it wore off");
			tellPlayer("Whatever stayed with you out of the trance quietly stops.");
		});
	}
	log(`carry-forward kept ${ids.length} suggestion(s) past waking, for ${minutes || "unlimited"} min`);
	return "You wake up. Something they told you comes with you, and you do not question it.";
}

/** Drop one carried suggestion, after its release has already been spoken and run. */
export function dropCarried(id: string): void {
	const i = ids.indexOf(id);
	if (i === -1) return;
	ids.splice(i, 1);
	log(`carry-forward let go of "${id}" (${ids.length} left)`);
	if (!ids.length) {
		cancelTimer(TIMER_KEY);
		carrier = null;
		carrierName = "";
	}
}

/** Undo everything carried and forget it. The one path every ending goes through. */
export function releaseCarried(reason: string): boolean {
	cancelTimer(TIMER_KEY);
	if (!ids.length) {
		carrier = null;
		return false;
	}
	for (const id of ids) {
		try {
			undoOne?.(id);
		} catch (err) {
			log(`carry-forward could not undo "${id}":`, err);
		}
	}
	log(`carry-forward released ${ids.length} suggestion(s) — ${reason}`);
	ids = [];
	carrier = null;
	carrierName = "";
	return true;
}
