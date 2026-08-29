import { log } from "./log";
import { getFeatures, trustWith, listTriggers, saveTrigger, Trigger } from "./storage";
import { isSessionActiveWith } from "./session";

// Persistent triggers: a word planted during a trance that fires afterwards.
//
// The flow DW described, and why each piece is where it is:
//
//   "Missy, your trigger word is sleepy time"   -> starts recording
//   "Missy, you cannot move"                    -> recorded, NOT executed
//   "Missy, you cannot speak"                   -> recorded
//   "Missy, remember trigger"                   -> committed
//   ...later, out of trance...
//   "sleepy time"                               -> both actions fire
//
// Recording does NOT execute. Setting a "you cannot move" trigger would otherwise freeze
// the subject in the middle of setting it up, which is both confusing and something the
// hypnotist then has to undo before continuing.
//
// THREE GATES, and they're deliberately different from everything else in the add-on:
//
// 1. Planting needs relationship trust >= TRIGGER_TRUST_THRESHOLD, checked against
//    trustWith() and NOT effectiveAccess(). The design doc is explicit that the
//    arousal/drug chemical floor must never reach persistent features no matter how high
//    the Stranger ceiling goes — a trigger outlives the state that created it, so it can't
//    be bought with arousal.
// 2. Each action re-checks its OWN permission when the trigger fires, not when it was
//    planted. Revoking movement permission has to disarm the movement half of a trigger
//    planted last week.
// 3. A trigger fires only for the person who installed it. The doc lists wider scopes
//    (per-list, trust-threshold, anyone) as future work; installer-only is the safe start.

/** The doc's threshold for persistent triggers. */
const TRIGGER_TRUST_THRESHOLD = 65;
/** Shortest phrase we'll accept. One-letter triggers would fire constantly. */
const MIN_PHRASE_LENGTH = 3;
/** Cap on actions per trigger — LSCG caps at 3; the doc says we aim higher, but not
 * unbounded, since each one runs on every match. */
const MAX_ACTIONS = 8;

interface Recording {
	hypnotistId: number;
	hypnotistName: string;
	phrase: string;
	actions: string[];
}

let recording: Recording | null = null;

export function isRecording(): boolean {
	return recording !== null;
}

export function cancelRecording(): void {
	recording = null;
}

export function describeRecording(): string {
	if (!recording) return "not recording a trigger";
	return `recording "${recording.phrase}" — ${recording.actions.length} action(s): ${recording.actions.join(", ") || "none yet"}`;
}

/** Begin recording. Returns a message to show the subject, or null if not allowed. */
export function beginRecording(hypnotistId: number, hypnotistName: string, phrase: string): string {
	// Refusals say plainly what's wrong rather than staying in fiction. A blocked trigger
	// is almost always a SETUP problem — an unchecked box, not enough trust — and
	// atmospheric text for that just leaves you guessing, which is exactly what happened
	// the first time this shipped.
	const features = getFeatures();
	if (!features.hypnoEnabled) {
		log("trigger plant refused: hypnoEnabled off");
		return "[trigger] Refused — Hypnosis Enabled is off in your settings.";
	}
	if (!features.triggerControl) {
		log("trigger plant refused: triggerControl not granted");
		return '[trigger] Refused — you have not enabled "Triggers" in the Hypnosis Add-on settings (Permissions tab).';
	}
	// Relationship trust only — see the gate note above.
	const trust = trustWith(hypnotistId);
	if (trust < TRIGGER_TRUST_THRESHOLD) {
		log(`trigger plant refused: trust ${trust.toFixed(1)} < ${TRIGGER_TRUST_THRESHOLD}`);
		return `[trigger] Refused — planting needs trust ${TRIGGER_TRUST_THRESHOLD} with ${hypnotistName}; you're at ${trust.toFixed(1)}. Arousal doesn't count toward this.`;
	}
	if (phrase.length < MIN_PHRASE_LENGTH) {
		return `[trigger] Refused — "${phrase}" is too short to use as a trigger.`;
	}
	recording = { hypnotistId, hypnotistName, phrase, actions: [] };
	log(`recording trigger "${phrase}" for ${hypnotistName}`);
	return `[trigger] RECORDING "${phrase}". Say each suggestion, then "remember trigger" to save (or "forget the trigger" to cancel).`;
}

/** Record a suggestion instead of running it. Returns the message to show, or null if
 * we're not recording and the caller should run it normally. */
export function recordAction(id: string): string | null {
	if (!recording) return null;
	if (recording.actions.length >= MAX_ACTIONS) {
		log(`trigger action ignored — already at the ${MAX_ACTIONS} action cap`);
		return `[trigger] Ignored — "${recording.phrase}" is already at the ${MAX_ACTIONS} action limit.`;
	}
	recording.actions.push(id);
	log(`trigger "${recording.phrase}" now has ${recording.actions.length} action(s)`);
	return `[trigger] Recorded ${id} into "${recording.phrase}" (${recording.actions.length} so far).`;
}

/** Commit. Returns a message for the subject. */
export function commitRecording(): string {
	if (!recording) return "";
	if (!recording.actions.length) {
		const phrase = recording.phrase;
		recording = null;
		return `[trigger] Nothing was recorded for "${phrase}", so nothing was saved.`;
	}
	const trigger: Trigger = {
		phrase: recording.phrase,
		actions: recording.actions.slice(),
		installedBy: recording.hypnotistId,
		installedByName: recording.hypnotistName,
		installedAt: Date.now(),
	};
	saveTrigger(trigger);
	const count = trigger.actions.length;
	log(`trigger committed: "${trigger.phrase}" (${count} actions) by ${trigger.installedByName}`);
	recording = null;
	return (
		`[trigger] SAVED "${trigger.phrase}" — ${count} action(s): ${trigger.actions.join(", ")}. ` +
		`${trigger.installedByName} saying it will now fire them.`
	);
}

/** Triggers this speaker could fire with this line. Matched on the normalised text so
 * punctuation and case don't matter, same as suggestions.
 *
 * No name gate here, unlike suggestions — "reacts without thinking" means the word itself
 * is the key. The narrowing that keeps this safe is installer-only scope. */
export function triggersFiredBy(speaker: number, normalisedText: string): Trigger[] {
	if (!normalisedText) return [];
	return listTriggers().filter((t) => t.installedBy === speaker && normalisedText.includes(t.phrase));
}

/** Can this hypnotist still reach us at all? Firing needs Hypnosis Enabled and the trigger
 * permission — revoking either disarms every trigger they planted, without needing to hunt
 * them down individually. */
export function triggersArmed(): boolean {
	const features = getFeatures();
	return features.hypnoEnabled && features.triggerControl;
}

/** True while the trigger's installer has a live trance on us. Used only to keep a trigger
 * from double-firing the suggestions the hypnotist is already speaking directly. */
export function installerHasSession(trigger: Trigger): boolean {
	return isSessionActiveWith(trigger.installedBy);
}
