import { log } from "./log";
import { getFeatures, trustWith, getTriggerDuration } from "./storage";
import { scheduleTimer, cancelTimer } from "./timers";

// Carry-forward: suggestions given under trance that survive waking.
//
// The gap this fills. Everything else is one of two things — a suggestion, which dies with
// the session, or a trigger, which outlives it but lies dormant until someone says a word.
// There was no way to say "you will still be frozen when you wake up".
//
// Shaped deliberately like trigger recording, because it is the same act: the hypnotist
// turns it on, gives the suggestions normally, and they are captured as they land. The
// difference is that a carried suggestion RUNS at the time it is spoken — the subject feels
// it during the trance too — where a recorded trigger is stored instead of run.
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
const TIMER_KEY = "carry-forward";

/** Capturing suggestions as they land. Only true during a session. */
let recording = false;
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

export function isRecordingCarry(): boolean {
	return recording;
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
	const state = recording ? "recording" : ids.length ? "holding" : "idle";
	return `carry-forward: ${state}${ids.length ? ` — ${ids.join(", ")} (from ${carrierName || carrier})` : ""}`;
}

/** Turn capture on. Returns a line for the subject, or a refusal for the hypnotist —
 * the caller decides where each goes, the same split trigger setup uses. */
export function beginCarry(sender: number, name: string): { subject?: string; refusal?: string } {
	const features = getFeatures();
	if (!features.hypnoEnabled) return { refusal: "They have hypnosis switched off." };
	if (!features.carryForward) return { refusal: `They have not enabled "Suggestions that outlive the trance".` };
	const trust = trustWith(sender);
	if (trust < CARRY_TRUST_THRESHOLD)
		return { refusal: `Carrying a suggestion past waking needs trust ${CARRY_TRUST_THRESHOLD}; you are at ${trust.toFixed(1)}.` };

	recording = true;
	carrier = sender;
	carrierName = name;
	log(`carry-forward recording started for ${name} (${sender})`);
	// Deliberately vague to the subject. They are being told something is being made to
	// last, not given a list they could keep track of and check against later.
	return { subject: "Something in what you are being told settles deeper, and stays." };
}

/** Record a suggestion that just landed. Called after it runs, not instead of it. */
export function noteCarried(id: string): void {
	if (!recording) return;
	if (ids.includes(id)) return;
	ids.push(id);
	log(`carry-forward will keep "${id}" (${ids.length} total)`);
}

/** Stop capturing but keep what is already held. Called when the session ends. */
export function stopRecordingCarry(): void {
	recording = false;
}

/** Everything a session-exit path needs: stop capturing, re-apply what survives, and start
 * the clock. Returns a line for the subject, or null if nothing was carried.
 *
 * Re-applying rather than "not clearing" is deliberate. The exit paths clear every effect
 * in one place precisely so nothing can be stranded by a missed branch; carving exceptions
 * into that would put the guarantee at the mercy of this feature. So the clear stays total,
 * and what survives is put back afterwards from a list. */
export function carryThroughWake(): string | null {
	recording = false;
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
			ChatRoomSendLocal("Whatever stayed with you out of the trance quietly stops.");
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
		recording = false;
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
	recording = false;
	carrier = null;
	carrierName = "";
	return true;
}
