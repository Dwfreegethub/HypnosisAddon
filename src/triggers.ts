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
	const features = getFeatures();
	if (!features.hypnoEnabled || !features.triggerControl) {
		log(`trigger plant refused: triggerControl not granted`);
		return "Something in the words slides off you. Nothing takes hold.";
	}
	// Relationship trust only — see the gate note above.
	const trust = trustWith(hypnotistId);
	if (trust < TRIGGER_TRUST_THRESHOLD) {
		log(`trigger plant refused: trust ${trust.toFixed(1)} < ${TRIGGER_TRUST_THRESHOLD}`);
		return "The idea won't settle. Some part of you isn't ready to be given something to keep.";
	}
	if (phrase.length < MIN_PHRASE_LENGTH) {
		return "The word slips away before it means anything.";
	}
	recording = { hypnotistId, hypnotistName, phrase, actions: [] };
	log(`recording trigger "${phrase}" for ${hypnotistName}`);
	return `Something is being set aside for "${phrase}". You let it happen.`;
}

/** Record a suggestion instead of running it. Returns true if it was taken. */
export function recordAction(id: string): boolean {
	if (!recording) return false;
	if (recording.actions.length >= MAX_ACTIONS) {
		log(`trigger action ignored — already at the ${MAX_ACTIONS} action cap`);
		return true;
	}
	recording.actions.push(id);
	log(`trigger "${recording.phrase}" now has ${recording.actions.length} action(s)`);
	return true;
}

/** Commit. Returns a message for the subject. */
export function commitRecording(): string {
	if (!recording) return "";
	if (!recording.actions.length) {
		const phrase = recording.phrase;
		recording = null;
		return `Nothing was attached to "${phrase}". It fades.`;
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
	return `"${trigger.phrase}" settles somewhere you won't think to look for it.`;
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
