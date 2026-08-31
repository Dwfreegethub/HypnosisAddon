import { log } from "./log";
import { tellPlayer } from "./notify";
import {
	getFeatures,
	listTriggers,
	saveTrigger,
	getTriggerScope,
	Trigger,
	TriggerScope,
} from "./storage";
import { isSessionActiveWith } from "./session";
import { accessFor } from "./trust";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";

/** Setup feedback goes to the HYPNOTIST, not the subject.
 *
 * It's the hypnotist who needs to know recording started, what was captured and that it
 * saved — they're the one driving. Sending it to the subject was backwards, and worse, it
 * showed them the trigger phrase, which the design doc explicitly wants hidden ("trigger
 * words can be hidden from the subject entirely"). A subject who can read their own
 * trigger word can simply avoid reacting to it. */
export function tellHypnotist(hypnotistId: number, text: string): void {
	sendHiddenMessage({ type: "trigger-status", text }, hypnotistId);
}

/** The hypnotist's side: show status their subject sent us. */
export function installTriggers(): void {
	registerHiddenHandler("trigger-status", (sender, message) => {
		const text = typeof message.text === "string" ? message.text : "";
		if (text) tellPlayer(text);
	});
}

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
export const TRIGGER_TRUST_THRESHOLD = 65;
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
	const refuse = (why: string): string => { tellHypnotist(hypnotistId, why); return ""; };
	// Refusals say plainly what's wrong rather than staying in fiction. A blocked trigger
	// is almost always a SETUP problem — an unchecked box, not enough trust — and
	// atmospheric text for that just leaves you guessing, which is exactly what happened
	// the first time this shipped.
	const features = getFeatures();
	if (!features.hypnoEnabled) {
		log("trigger plant refused: hypnoEnabled off");
		return refuse("[trigger] Refused — they have not enabled Hypnosis.");
	}
	if (!features.triggerControl) {
		log("trigger plant refused: triggerControl not granted");
		return refuse('[trigger] Refused — they have not enabled "Triggers" in their Hypnosis Add-on settings.');
	}
	// Relationship trust only — see the gate note above.
	const trust = accessFor(hypnotistId, "persistent");
	if (trust < TRIGGER_TRUST_THRESHOLD) {
		log(`trigger plant refused: trust ${trust.toFixed(1)} < ${TRIGGER_TRUST_THRESHOLD}`);
		return refuse(`[trigger] Refused — planting needs trust ${TRIGGER_TRUST_THRESHOLD}; you are at ${trust.toFixed(1)} with them. Arousal does not count toward this.`);
	}
	if (phrase.length < MIN_PHRASE_LENGTH) {
		return refuse(`[trigger] Refused — "${phrase}" is too short to use as a trigger.`);
	}
	recording = { hypnotistId, hypnotistName, phrase, actions: [] };
	log(`recording trigger "${phrase}" for ${hypnotistName}`);
	tellHypnotist(
		hypnotistId,
		`[trigger] RECORDING "${phrase}". Say each suggestion, then "remember trigger" to save (or "forget the trigger" to cancel).`,
	);
	// The subject gets atmosphere with no phrase in it — see tellHypnotist.
	return "Something is being set aside in you. You let it happen.";
}

/** Record a suggestion instead of running it. Returns the message to show, or null if
 * we're not recording and the caller should run it normally. */
export function recordAction(id: string): string | null {
	if (!recording) return null;
	if (recording.actions.length >= MAX_ACTIONS) {
		log(`trigger action ignored — already at the ${MAX_ACTIONS} action cap`);
		tellHypnotist(recording.hypnotistId, `[trigger] Ignored — already at the ${MAX_ACTIONS} action limit.`);
		return "Nothing more will fit.";
	}
	recording.actions.push(id);
	log(`trigger "${recording.phrase}" now has ${recording.actions.length} action(s)`);
	tellHypnotist(
		recording.hypnotistId,
		`[trigger] Recorded ${id} into "${recording.phrase}" (${recording.actions.length} so far).`,
	);
	return "That settles into place, waiting.";
}

/** Commit. Returns a message for the subject. */
export function commitRecording(): string {
	if (!recording) return "";
	if (!recording.actions.length) {
		tellHypnotist(recording.hypnotistId, `[trigger] Nothing was recorded for "${recording.phrase}", so nothing was saved.`);
		recording = null;
		return "Whatever it was, it comes to nothing.";
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
	tellHypnotist(
		trigger.installedBy,
		`[trigger] SAVED "${trigger.phrase}" — ${count} action(s): ${trigger.actions.join(", ")}. ` +
			`Saying it will now fire them, in or out of trance.`,
	);
	recording = null;
	return "It settles somewhere you won't think to look for it.";
}

/** Triggers this speaker could fire with this line. Matched on the normalised text so
 * punctuation and case don't matter, same as suggestions.
 *
 * No name gate here, unlike suggestions — "reacts without thinking" means the word itself
 * is the key. The narrowing that keeps this safe is installer-only scope. */
/** The scope options, in the order the dropdown shows them: tightest first.
 *
 * Deliberately mirrors BC's own item-permission ladder (AllowedInteractions in
 * Character.js) so it reads familiar and behaves the way players already expect — the
 * relationship checks below use BC's own helper methods rather than reimplementing what
 * "owner" or "lover" means. The one addition is that the INSTALLER always counts,
 * whatever the level: they're the one who put it there. */
export const TRIGGER_SCOPES: { key: TriggerScope; label: string }[] = [
	{ key: "hypnotist", label: "Hypnotist only" },
	{ key: "owner", label: "Hypnotist and Owner" },
	{ key: "lovers", label: "Hypnotist, Owner and Lovers" },
	{ key: "whitelist", label: "Hypnotist, Owner, Lovers and whitelist" },
	{ key: "dominants", label: "Hypnotist, Owner, Lovers, whitelist & Dominants" },
	{ key: "notblack", label: "Hypnotist and everyone, except blacklist" },
	{ key: "everyone", label: "Hypnotist and everyone, no exceptions" },
];

function characterFor(memberNumber: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(c: any) => c?.MemberNumber === memberNumber,
	);
}

/** Does this speaker clear the subject's chosen scope?
 *
 * Follows the same order of tests as ServerChatRoomGetAllowItem: the owner is allowed at
 * every level and is checked before the blacklist, and "Dominant" means within 25
 * reputation points, both matching BC exactly rather than inventing our own reading. */
function speakerAllowedByScope(speaker: number): boolean {
	const scope = getTriggerScope();
	if (scope === "hypnotist") return false;
	// The ladder is about OTHER PEOPLE. Running it against yourself produced answers nobody
	// chose — "everyone" and "not blacklisted" trivially include you, and the dominants rung
	// asks whether your own reputation plus 25 beats your own reputation, which it always
	// does — so three scopes silently allowed self-firing and four did not. Whether you may
	// fire your own triggers is one explicit setting now; see triggersFiredBy.
	if (speaker === Player?.MemberNumber) return false;
	const C = characterFor(speaker);
	if (!C) return false;
	if (Player?.IsOwnedByCharacter?.(C)) return true;
	if (scope === "everyone") return true;
	if (Player?.HasOnBlacklist?.(C)) return false;
	if (scope === "notblack") return true;
	if (scope === "owner") return false;
	if (C.IsLoverOfCharacter?.(Player)) return true;
	if (scope === "lovers") return false;
	if (Player?.HasOnWhitelist?.(C)) return true;
	if (scope === "whitelist") return false;
	try {
		return ReputationCharacterGet(C, "Dominant") + 25 >= ReputationCharacterGet(Player, "Dominant");
	} catch {
		return false;
	}
}

export function triggersFiredBy(speaker: number, normalisedText: string): Trigger[] {
	if (!normalisedText) return [];
	const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
	// Yourself is decided by one setting and nothing else — including the installedBy
	// shortcut below, which would otherwise let a trigger you somehow planted in yourself
	// fire regardless of the setting.
	if (speaker === Player?.MemberNumber) return getFeatures().selfTrigger ? matching : [];
	const allowedByScope = speakerAllowedByScope(speaker);
	return matching.filter((t) => t.installedBy === speaker || allowedByScope);
}

/** Triggers this speaker may RELEASE by name. Deliberately looser than firing: undoing can
 * never harm the subject, so it does not answer to the self-trigger setting the way firing
 * does. That matters most for the case it was written for — a subject who has been silenced
 * cannot say a release phrase at all, so the ways out that remain (this, `/hypno release`,
 * the duration timer, the safeword) must not be narrowed further than they already are. */
export function triggersReleasableBy(speaker: number, normalisedText: string): Trigger[] {
	if (!normalisedText) return [];
	const matching = listTriggers().filter((t) => normalisedText.includes(t.phrase));
	if (speaker === Player?.MemberNumber) return matching;
	const allowedByScope = speakerAllowedByScope(speaker);
	return matching.filter((t) => t.installedBy === speaker || allowedByScope);
}

/** For the settings screen and /hypno triggers. */
export function describeScope(): string {
	return TRIGGER_SCOPES.find((s) => s.key === getTriggerScope())?.label ?? "Hypnotist only";
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
