import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose, setSpeechBlocked } from "./effects";
import { setSuppressed } from "./suppression";
import { BODY_PARTS, setBodyPartBlocked, setAllSelfTouchBlocked } from "./selftouch";
import { getFeatures, getTriggerDuration, FeatureToggles, Trigger } from "./storage";
import { isSessionActiveWith, hasLiveSessionWith, wakeByHypnotist } from "./session";
import { flavor, bodyPartFlavor, FlavorKey } from "./flavor";
import { scheduleTimer, cancelTimer } from "./timers";
import {
	isRecording,
	cancelRecording,
	commitRecording,
	beginRecording,
	recordAction,
	triggersFiredBy,
	triggersArmed,
	installerHasSession,
} from "./triggers";

// Natural-language suggestion parsing — the design doc's "free-form primary, /suggest as
// fallback" approach, in stub form with three suggestions.
//
// Runs entirely on the SUBJECT's client: it watches chat from the person currently running
// a session on them and matches against a small pattern library. Same subject-authoritative
// rule as everything else — the hypnotist's client isn't consulted and can't assert a
// match; it just talks, and the subject's own client decides whether anything landed.

// --- Normalisation -------------------------------------------------------------------
// Doing this well is most of what buys wording flexibility: expand contractions and strip
// punctuation FIRST, so each pattern below only has to describe one canonical phrasing
// instead of every typographic variant of it.
function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[‘’ʼ]/g, "'") // curly apostrophes → straight
		.replace(/\bcan'?t\b/g, "cannot")
		.replace(/\bcan not\b/g, "cannot")
		.replace(/\bdon'?t\b/g, "do not")
		.replace(/\bwon'?t\b/g, "will not")
		.replace(/\bdoesn'?t\b/g, "does not")
		.replace(/\bisn'?t\b/g, "is not")
		.replace(/\baren'?t\b/g, "are not")
		.replace(/\byou'?re\b/g, "you are")
		.replace(/\byou'?ve\b/g, "you have")
		.replace(/\bur\b/g, "your")
		.replace(/[^a-z\s]/g, " ") // punctuation → space, so "move!" == "move"
		.replace(/\s+/g, " ")
		.trim();
}

// --- The pattern library -------------------------------------------------------------

interface Suggestion {
	/** Doubles as the flavor-text key — the two lists are deliberately kept in step. */
	id: FlavorKey;
	/** Which permission(s) the subject must have granted. With several, ANY one grants the
	 * suggestion — "you notice nothing" is worth saying if even one category is permitted,
	 * and run() then applies only the categories actually allowed. */
	permission: keyof FeatureToggles | (keyof FeatureToggles)[];
	/** Undoes a restriction rather than applying one. Still needs a live trance like
	 * everything else — releases briefly skipped that, which turned out to be too broad:
	 * it left ordinary hypnosis wording working on someone who wasn't under. What it does
	 * skip is the permission check, since a revoked permission must never leave an
	 * already-applied effect stuck on. */
	release?: boolean;
	/** Reverses this suggestion. Used when a trigger is released by name — the release
	 * has to undo exactly what that trigger applied, not everything of that kind. */
	undo?: () => void;
	patterns: RegExp[];
	run: () => void;
}

function permitted(suggestion: Suggestion, features: FeatureToggles): boolean {
	const keys = Array.isArray(suggestion.permission) ? suggestion.permission : [suggestion.permission];
	return keys.some((k) => features[k]);
}

// ORDER MATTERS: releases are listed before their matching restrictions, because a release
// phrase usually contains the same verb ("you can move again" vs "you cannot move") and the
// first match wins.
const SUGGESTIONS: Suggestion[] = [
	{
		id: "movement-release",
		release: true,
		permission: "movementRestriction",
		patterns: [
			/\byou (can|may) move\b/,
			/\byou are (free|able|allowed) to move\b/,
			/\byou are no longer (frozen|paralyzed|rooted|immobile|still)\b/,
			/\byou (can|may) move (again|now|freely)\b/,
			/\bmove (again|freely)\b/,
			/\byour body is your own\b/,
		],
		run: () => removeEffect("Freeze"),
	},
	{
		id: "movement-block",
		permission: "movementRestriction",
		patterns: [
			// The optional (\w+ ) throughout lets one adverb slip in without needing a
			// separate pattern for it — "you are completely frozen", "you cannot even move".
			/\byou cannot (\w+ )?move\b/,
			/\byou are (unable|not able) to move\b/,
			/\byou are (\w+ )?(frozen|paralyzed|rooted|immobile|stuck)\b/,
			/\b(do not|never) move\b/,
			/\b(stay|hold|remain) (still|frozen|put)\b/,
			/\b(stay|remain) where you are\b/,
			/\byour body (will not|does not|cannot) (move|respond|obey)\b/,
			/\byou (cannot|will not) move (a muscle|an inch|at all)\b/,
			// Future phrasing, natural when building a trigger: "when I say sleepy time,
			// you will not be able to move". Same effect either way — the tense is for the
			// hypnotist's benefit, not a different mechanic.
			/\byou will (not be able|be unable) to move\b/,
			/\byou will not move\b/,
		],
		run: () => applyEffect("Freeze"),
		undo: () => removeEffect("Freeze"),
	},
	{
		id: "clothing-release",
		release: true,
		permission: "clothingRestriction",
		patterns: [
			/\byou (can|may) (change|remove|touch|adjust) your (clothes|clothing|outfit)\b/,
			/\byou are (free|able|allowed) to (change|dress|undress)\b/,
			/\byou (can|may) (dress|undress)\b/,
			/\byour (clothes|clothing|outfit) are yours again\b/,
		],
		run: () => removeEffect("BlockWardrobe"),
	},
	{
		id: "clothing-block",
		permission: "clothingRestriction",
		patterns: [
			/\byou cannot (change|remove|take off|touch|adjust) your (clothes|clothing|outfit)\b/,
			/\byou cannot (dress|undress|get dressed|get undressed)\b/,
			/\byou are (unable|not able) to (change|remove) your (clothes|clothing|outfit)\b/,
			/\byour (clothes|clothing|outfit) (stay|stays|will stay|must stay|are staying)\b/,
			/\b(do not|never) (touch|change|remove|adjust) your (clothes|clothing|outfit)\b/,
			/\bleave your (clothes|clothing|outfit) alone\b/,
			/\byou have forgotten how to (dress|undress|change)\b/,
			/\byou will (not be able|be unable) to (change|remove|touch) your (clothes|clothing|outfit)\b/,
		],
		run: () => applyEffect("BlockWardrobe"),
		undo: () => removeEffect("BlockWardrobe"),
	},
	{
		// The broad one: clothing, bondage and touch together. Each category is still
		// applied only if separately permitted — saying it doesn't override a box the
		// subject left unchecked.
		id: "awareness-release",
		release: true,
		permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
		patterns: [
			/\byou notice (everything|things|them|it) again\b/,
			/\byou (notice|feel) what (happens|is happening|is done) to you\b/,
			// "awake" deliberately NOT here — "you are awake again" should end the trance,
			// not merely restore awareness of clothing changes. It belongs to wake.
			/\byou are aware (again|to it)\b/,
			/\byou (can|may) notice\b/,
		],
		run: () => {
			setSuppressed("clothing", false);
			setSuppressed("bondage", false);
			setSuppressed("activity", false);
		},
	},
	{
		id: "awareness-block",
		permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
		patterns: [
			/\byou notice nothing\b/,
			/\byou (do not|will not) notice\b/,
			/\byou (cannot|do not) notice (anything|what)\b/,
			/\bnothing (that happens|done) to you (matters|registers)\b/,
			/\byou are (unaware|oblivious)\b/,
		],
		run: () => {
			// Per-category permission check, not the any-of gate above.
			const f = getFeatures();
			if (f.suppressClothing) setSuppressed("clothing", true);
			if (f.suppressBondage) setSuppressed("bondage", true);
			if (f.suppressActivities) setSuppressed("activity", true);
		},
	},
	{
		id: "touch-release",
		release: true,
		permission: "suppressActivities",
		patterns: [
			/\byou (can|may) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\byou feel (my|his|her|their) (touch|touches) again\b/,
			/\byou (can|may) feel (me|it) again\b/,
			/\byou notice (my|his|her|their) (touch|touches) again\b/,
		],
		run: () => setSuppressed("activity", false),
	},
	{
		id: "touch-block",
		permission: "suppressActivities",
		patterns: [
			/\byou (will |)ignore (my|his|her|their) (touch|touches)\b/,
			/\bignore (my|his|her|their) (touch|touches)\b/,
			/\byou (cannot|do not) feel (my|his|her|their) (touch|touches|hands)\b/,
			/\b(my|his|her|their) (touch|touches) (do not|does not) reach you\b/,
			/\byou (cannot|do not) feel (me|my hands)\b/,
		],
		run: () => setSuppressed("activity", true),
		undo: () => setSuppressed("activity", false),
	},
	{
		id: "speech-release",
		release: true,
		permission: "speechRestriction",
		patterns: [
			/\byou (can|may) (speak|talk)\b/,
			/\byou are (free|able|allowed) to (speak|talk)\b/,
			/\byour voice (is back|returns|is yours)\b/,
			/\b(speak|talk) (again|freely)\b/,
			/\byou have your voice back\b/,
		],
		run: () => setSpeechBlocked(false),
	},
	{
		id: "speech-block",
		permission: "speechRestriction",
		patterns: [
			/\byou cannot (\w+ )?(speak|talk)\b/,
			/\byou are (unable|not able) to (speak|talk)\b/,
			/\b(do not|never) (speak|talk)\b/,
			/\byou have (no voice|lost your voice)\b/,
			/\byour voice is gone\b/,
			/\b(stay|remain|be) (silent|quiet)\b/,
			/\bnot a (word|sound)\b/,
			/\byou have forgotten how to (speak|talk)\b/,
			/\byou will (not be able|be unable) to (speak|talk)\b/,
			/\byou will not (speak|talk)\b/,
			/(?<!\bi )(?<!\bwe )\bsilence\b/,
		],
		run: () => setSpeechBlocked(true),
		undo: () => setSpeechBlocked(false),
	},
	{
		id: "stand",
		release: true,
		permission: "postureControl",
		// Bare "stand" and "rise" are matched now that a suggestion also has to name the
		// subject — that gate does most of the false-positive work, so these no longer have
		// to be excluded wholesale. The narrow guards that remain cover what the name gate
		// doesn't: "I can't stand it, Missy" (normalised to "cannot stand") and the
		// hypnotist narrating themselves ("I stand beside you, Missy").
		patterns: [
			/(?<!cannot )(?<!\bi )(?<!\bwe )\bstand\b/,
			/(?<!\bi )(?<!\bwe )\brise\b/,
			/(?<!\bto )(?<!\bi )(?<!\bwe )\bget up\b/,
			/\b(get|rise) to your feet\b/,
			/\bon your feet\b/,
		],
		run: () => setSuggestedPose(null),
	},
	{
		id: "kneel",
		permission: "postureControl",
		// Guarded so the hypnotist narrating their own action ("I kneel beside you") doesn't
		// put the subject on the floor. "I want you to kneel" still lands — the guard is on
		// the pronoun immediately before the verb, not anywhere in the line.
		patterns: [
			/(?<!\bi )(?<!\bwe )\bkneel\b/,
			/\b(get|down|drop) on your knees\b/,
			/\bon your knees\b/,
			/\bdrop to your knees\b/,
		],
		run: () => setSuggestedPose("Kneel"),
		undo: () => setSuggestedPose(null),
	},
];

// --- Entry point ---------------------------------------------------------------------

/** A line the speaker is plainly saying about themselves, not to the subject — "I need to
 * get up early". Cheap guard against ordinary conversation tripping a suggestion; the
 * presence of "you" anywhere is enough to treat the line as addressed outward again. */
function isSelfReferential(text: string): boolean {
	return /^(i|we)\b/.test(text) && !/\byou\b/.test(text);
}

/** Does this line address the subject by name? Required for any suggestion to land, so
 * that ordinary conversation — even conversation that happens to contain a trigger phrase —
 * stays inert unless the hypnotist deliberately names who they're talking to.
 *
 * Pure and name-injected rather than reading Player directly, so it can be tested. */
export function mentionsAnyName(content: string, names: string[]): boolean {
	const text = normalize(content);
	// Normalising the names the same way means punctuation and case can't cause a miss:
	// "Missy," and "MISSY" both reduce to the same thing the text did.
	const cleaned = names.map((n) => normalize(String(n ?? ""))).filter((n) => n.length > 0);
	// No usable name to check against → refuse rather than fall open. A name gate that
	// silently stops gating is worse than one that stops working.
	if (cleaned.length === 0) return false;
	return cleaned.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(text));
}

/** The names the subject answers to. Nickname included because that's what BC shows other
 * players when it's set, so it's what a hypnotist would naturally type. */
export function playerOwnNames(): string[] {
	return [Player?.Name, Player?.Nickname].filter(Boolean) as string[];
}

/** The pure half of this module: text in, suggestion id out. Split from handleSpokenLine
 * so the pattern library can be exercised directly against a phrase list without needing a
 * live session, a chat room, or the BC globals. Deliberately does NOT apply the name gate —
 * /hypno match stays useful for checking a phrasing on its own. */
export function matchSuggestion(content: string): FlavorKey | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	for (const suggestion of SUGGESTIONS) {
		if (suggestion.patterns.some((p) => p.test(text))) return suggestion.id;
	}
	return null;
}

// --- Body-part commands --------------------------------------------------------------
// "You cannot touch your breasts" needs to capture WHICH part, so it can't be a fixed entry
// in SUGGESTIONS. Checked before that table, and deliberately falls through when the
// captured word isn't a known body part — which is what keeps "you cannot touch your
// clothes" reaching the clothing suggestion instead of being swallowed here.

interface BodyPartCommand {
	/** The word as spoken, reused in the flavor text. */
	word: string;
	groups: string[];
	block: boolean;
	/** "yourself" rather than a named part. */
	all: boolean;
}

const PART_BLOCK = [
	/\byou (?:cannot|will not|do not) touch your ([a-z]+)\b/,
	// Future phrasing, the natural way to say it while building a trigger. Without this,
	// "you will not be able to touch your breasts" matched nothing at all and looked like
	// the command had simply been ignored.
	/\byou will (?:not be able|be unable) to touch your ([a-z]+)\b/,
	/\b(?:do not|never) touch your ([a-z]+)\b/,
];
const PART_RELEASE = [
	/\byou (?:can|may) touch your ([a-z]+)\b/,
	/\byour ([a-z]+) (?:are|is) yours again\b/,
];
const SELF_BLOCK = [
	/\byou (?:cannot|will not|do not) touch yourself\b/,
	/\byou will (?:not be able|be unable) to touch yourself\b/,
	/\b(?:do not|never) touch yourself\b/,
];
const SELF_RELEASE = [/\byou (?:can|may) touch yourself\b/];

export function matchBodyPartCommand(content: string): BodyPartCommand | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;

	for (const re of SELF_RELEASE) if (re.test(text)) return { word: "yourself", groups: [], block: false, all: true };
	for (const re of SELF_BLOCK) if (re.test(text)) return { word: "yourself", groups: [], block: true, all: true };

	// Release before block, same reason as the main table: the phrasings overlap.
	for (const [patterns, block] of [
		[PART_RELEASE, false],
		[PART_BLOCK, true],
	] as [RegExp[], boolean][]) {
		for (const re of patterns) {
			const m = re.exec(text);
			const word = m?.[1];
			const groups = word ? BODY_PARTS[word] : undefined;
			// Unknown word (e.g. "clothes") — not a body part, let the main table have it.
			if (groups) return { word, groups, block, all: false };
		}
	}
	return null;
}

/** Human-readable verdict on a phrase for /hypno match — reports the pattern result and
 * the name gate separately, since a phrase can match perfectly and still be ignored. */
export function describeMatch(content: string): string {
	const id = matchSuggestion(content);
	if (!id) return "no match";
	return mentionsAnyName(content, playerOwnNames())
		? `${id} — would fire`
		: `${id} — but your name isn't in the line, so it would be ignored`;
}

// --- Triggers ---------------------------------------------------------------------------
// Recording control phrases, and firing. See triggers.ts for the gates and why they differ
// from everything else.

const TRIGGER_START = [
	/\byour trigger (?:word|phrase) is (.+)$/,
	/\bthe trigger (?:word|phrase) is (.+)$/,
	/\byour (?:new )?trigger is (.+)$/,
	/\bwhen (?:i say|you hear) (.+)$/,
];
const TRIGGER_COMMIT = [/\bremember (?:the |this |that )?trigger\b/, /\bthe trigger is set\b/, /\block (?:it |that )?in\b/];
const TRIGGER_CANCEL = [/\b(?:forget|cancel|never mind|nevermind) (?:the |that |this )?trigger\b/];

/** Strip the subject's own name out of a captured phrase.
 *
 * Needed because the name gate requires the name SOMEWHERE in the line, and the phrase is
 * captured to end-of-line — so "your trigger word is sleepy, Missy" would otherwise store
 * the trigger as "sleepy missy" and never fire when the hypnotist just says "sleepy". */
function cleanPhrase(raw: string): string {
	let phrase = raw.trim();
	for (const name of playerOwnNames()) {
		const n = normalize(String(name));
		if (!n) continue;
		phrase = phrase.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), " ");
	}
	return phrase.replace(/\s+/g, " ").trim();
}

/** Should this line be hidden from the subject entirely?
 *
 * While a trigger is being planted, the hypnotist's setup lines name the phrase and each
 * suggestion in open chat — so a subject reading along learns their own trigger word and
 * exactly what it does, which defeats the point. With the Awareness toggle on, those lines
 * never render: you know something is being given, not what.
 *
 * Only the installer's lines, only during setup, and only what's actually part of it —
 * ordinary conversation in the middle of a session still comes through. */
export function isTriggerSetupLine(sender: number, content: string): boolean {
	if (!getFeatures().suppressTriggerSetup) return false;
	if (!isSessionActiveWith(sender)) return false;
	// Covers the opening line too, which arrives before recording is technically running.
	if (parseTriggerControl(content)) return true;
	if (!isRecording()) return false;
	return !!matchSuggestion(content) || !!matchBodyPartCommand(content);
}

export type TriggerControl = { kind: "start"; phrase: string } | { kind: "commit" } | { kind: "cancel" } | null;

/** The pure half of trigger-control parsing: text in, intent out. Split from the handler
 * so the phrase capture and name-stripping — the fiddly part — can be tested without a
 * live session, exactly like matchSuggestion. */
export function parseTriggerControl(content: string): TriggerControl {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	if (TRIGGER_CANCEL.some((p) => p.test(text))) return { kind: "cancel" };
	if (TRIGGER_COMMIT.some((p) => p.test(text))) return { kind: "commit" };
	for (const pattern of TRIGGER_START) {
		const match = pattern.exec(text);
		if (match) return { kind: "start", phrase: cleanPhrase(match[1]) };
	}
	return null;
}

/** Handle "your trigger word is X" / "remember trigger" / "forget the trigger".
 * Returns true if the line was one of these. */
function handleTriggerControl(sender: number, content: string): boolean {
	const parsed = parseTriggerControl(content);
	if (!parsed) return false;

	// Control phrases only work mid-trance, from our hypnotist, with our name — planting
	// something persistent shouldn't be reachable in ordinary conversation.
	if (!isSessionActiveWith(sender) || !mentionsAnyName(content, playerOwnNames())) return false;

	if (parsed.kind === "cancel") {
		if (isRecording()) {
			cancelRecording();
			ChatRoomSendLocal("Whatever was being set aside comes apart again.");
		}
		return true;
	}
	if (parsed.kind === "commit") {
		if (!isRecording()) return false;
		const message = commitRecording();
		if (message) ChatRoomSendLocal(message);
		return true;
	}
	const character = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === sender);
	ChatRoomSendLocal(beginRecording(sender, character?.Name ?? `#${sender}`, parsed.phrase));
	return true;
}

/** Run a trigger's stored actions. Each one re-checks its own permission NOW, not when the
 * trigger was planted — revoking a permission has to disarm that part of every trigger. */
function fireTrigger(trigger: Trigger): void {
	if (!triggersArmed()) {
		log(`trigger "${trigger.phrase}" matched but triggers aren't armed`);
		return;
	}
	const features = getFeatures();
	let fired = 0;
	for (const id of trigger.actions) {
		// Body-part actions carry their parameter in the id ("touch:breasts"), since the
		// pattern library can't hold a per-part entry for all 26 of them.
		if (id.startsWith("touch:")) {
			if (!features.selfTouchControl) {
				log(`trigger "${trigger.phrase}": ${id} skipped, selfTouchControl not granted`);
				continue;
			}
			const word = id.slice("touch:".length);
			if (word === "all") setAllSelfTouchBlocked(true);
			else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], true);
			else continue;
			ChatRoomSendLocal(word === "all" ? flavor("selftouch-blocked") : bodyPartFlavor(word));
			fired++;
			continue;
		}
		const suggestion = SUGGESTIONS.find((s) => s.id === id);
		if (!suggestion) continue;
		if (!permitted(suggestion, features)) {
			log(`trigger "${trigger.phrase}": ${id} skipped, permission not granted`);
			continue;
		}
		suggestion.run();
		ChatRoomSendLocal(flavor(suggestion.id));
		fired++;
	}
	log(`trigger "${trigger.phrase}" fired ${fired}/${trigger.actions.length} actions`);
	if (fired) scheduleAutoRelease(trigger);
}

// Releasing a trigger by name: "Missy, you are released from frozen".
//
// This exists so that general release wording doesn't have to work outside a trance. A
// trigger fires out of trance, so something must be able to undo it out of trance — but
// making every release phrase work there meant ordinary hypnosis wording kept operating on
// someone who wasn't under. Naming the trigger is narrow, needs knowledge of the phrase
// (which only the hypnotist has), and undoes exactly what that trigger applied.
const TRIGGER_RELEASE = [
	/\byou are released from (.+)$/,
	/\bi release you from (.+)$/,
	/\brelease (?:the )?trigger (.+)$/,
];

/** Reverse everything a trigger applied. Shared by the named release, the timer, and
 * anything else that needs to let go — one path, so they can't drift apart. */
function undoTrigger(trigger: Trigger): void {
	for (const id of trigger.actions) {
		if (id.startsWith("touch:")) {
			const word = id.slice("touch:".length);
			if (word === "all") setAllSelfTouchBlocked(false);
			else if (BODY_PARTS[word]) setBodyPartBlocked(word, BODY_PARTS[word], false);
			continue;
		}
		SUGGESTIONS.find((s) => s.id === id)?.undo?.();
	}
	cancelTimer(timerKey(trigger));
	log(`released trigger "${trigger.phrase}" (${trigger.actions.length} actions undone)`);
}

/** Keyed by installer AND phrase — two people can plant the same word, and one wearing
 * off must not cancel the other's. */
function timerKey(trigger: Trigger): string {
	return `trigger:${trigger.installedBy}:${trigger.phrase}`;
}

/** Let a fired trigger wear off on its own. Re-firing restarts the clock rather than
 * stacking a second timer — scheduleTimer replaces by key. */
function scheduleAutoRelease(trigger: Trigger): void {
	const minutes = getTriggerDuration();
	cancelTimer(timerKey(trigger));
	if (minutes <= 0) return; // 0 means it holds until released deliberately
	scheduleTimer(timerKey(trigger), minutes * 60_000, () => {
		undoTrigger(trigger);
		ChatRoomSendLocal("Whatever was holding you loosens on its own.");
	});
	log(`trigger "${trigger.phrase}" will release itself in ${minutes} min`);
}

/** Undo everything a named trigger applied. Ungated beyond installer-only: undoing can
 * never harm the subject, and the safeword is the only other way out. */
function handleTriggerRelease(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;
	for (const pattern of TRIGGER_RELEASE) {
		const match = pattern.exec(text);
		if (!match) continue;
		const phrase = cleanPhrase(match[1]);
		const trigger = triggersFiredBy(sender, phrase)[0];
		if (!trigger) {
			log(`release asked for "${phrase}" but no trigger of theirs matches`);
			return true;
		}
		undoTrigger(trigger);
		ChatRoomSendLocal("Whatever was holding you lets go.");
		return true;
	}
	return false;
}

/** Returns true if a trigger fired on this line. */
function handleTriggerFiring(sender: number, content: string): boolean {
	const text = normalize(content);
	if (!text) return false;
	const matched = triggersFiredBy(sender, text);
	if (!matched.length) return false;
	// Don't double-fire while the installer already has us under and is speaking
	// suggestions directly — the words would land twice.
	for (const trigger of matched) {
		if (installerHasSession(trigger)) {
			log(`trigger "${trigger.phrase}" suppressed — installer already has a live session`);
			continue;
		}
		fireTrigger(trigger);
	}
	return true;
}

// --- Wake ------------------------------------------------------------------------------
// Checked before everything else. Ending a trance answers to no permission — same
// principle as a remote release always being honored — so it doesn't belong in the
// permission-gated table, and it must not be shadowed by a suggestion that happens to
// share a word with it.

const WAKE_PATTERNS = [
	// Bare "wake" included: DW tried "Missy wake" and nothing happened. Guarded against
	// first-person the same way the other bare imperatives are.
	/(?<!\bi )(?<!\bwe )\bwake\b/,
	/\bwake up\b/,
	/\bwake now\b/,
	/\byou (?:are|will be) (?:wide )?awake\b/,
	/\byou (?:will |)wake (?:up )?(?:now|when|on)\b/,
	/\bawaken\b/,
	/\bcome back to me\b/,
	/\bcome out of (?:it|trance|the trance)\b/,
];

export function isWakeLine(content: string): boolean {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return false;
	return WAKE_PATTERNS.some((p) => p.test(text));
}

/** Returns true if the line was a wake-up keyword and has been dealt with. */
function handleWakeLine(sender: number, content: string): boolean {
	if (!isWakeLine(content)) return false;
	if (!hasLiveSessionWith(sender)) {
		log(`heard a wake keyword from ${sender} but they have no session with you`);
		return true;
	}
	// Named, like every other suggestion — otherwise "wake up" in ordinary room chat would
	// end someone's session from across the room.
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard a wake keyword from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	wakeByHypnotist(sender);
	return true;
}

/** Returns true if the line was a body-part command and has been dealt with. */
function handleBodyPartLine(sender: number, content: string): boolean {
	const cmd = matchBodyPartCommand(content);
	if (!cmd) return false;
	const label = cmd.all ? "self-touch" : `touch:${cmd.word}`;
	if (!isSessionActiveWith(sender)) {
		log(`heard "${label}" from ${sender} but no active session with them — ignoring`);
		return true;
	}
	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard "${label}" from ${sender} but they didn't say your name — ignoring`);
		return true;
	}
	const features = getFeatures();
	if (!features.hypnoEnabled || !features.selfTouchControl) {
		log(`heard "${label}" from ${sender} but selfTouchControl isn't granted`);
		return true;
	}
	// Recordable into a trigger like any other suggestion. These take a different code
	// path because they carry a parameter, and that's exactly why they were silently
	// executing instead of being captured while a trigger was being built.
	const recorded = recordAction(cmd.all ? "touch:all" : `touch:${cmd.word}`);
	if (recorded) {
		ChatRoomSendLocal(recorded);
		return true;
	}
	if (cmd.all) setAllSelfTouchBlocked(cmd.block);
	else setBodyPartBlocked(cmd.word, cmd.groups, cmd.block);
	log(`${cmd.block ? "blocked" : "released"} ${label}`);
	ChatRoomSendLocal(
		cmd.block
			? cmd.all
				? flavor("selftouch-blocked")
				: flavor("selftouch-part-block")
			: flavor("selftouch-part-release"),
	);
	return true;
}

/** Called for every ordinary chat line we receive. Does nothing unless the speaker is the
 * person currently running a session on us. */
export function handleSpokenLine(sender: number, content: string): void {
	// Trigger control first, so "remember trigger" can't be read as anything else.
	if (handleTriggerControl(sender, content)) return;
	// Then release-by-name, before firing — otherwise "you are released from frozen"
	// contains "frozen" and would set the trigger off instead of clearing it.
	if (handleTriggerRelease(sender, content)) return;
	// Then firing — deliberately BEFORE the session gate below, since the whole point of a
	// trigger is that it works outside a trance.
	if (handleTriggerFiring(sender, content)) return;
	if (handleWakeLine(sender, content)) return;
	if (handleBodyPartLine(sender, content)) return;
	// Match BEFORE the session check, so a line that WOULD have done something can say why
	// it didn't. Checking the session first was silent — an unmatched line and a matched
	// line with no session looked identical from the outside, which is exactly the case
	// that needed telling apart.
	const id = matchSuggestion(content);
	if (!id) return;
	const suggestion = SUGGESTIONS.find((s) => s.id === id);
	if (!suggestion) return;

	// EVERY suggestion needs a live trance, releases included. Letting releases through
	// outside one was too broad a fix for a narrow problem: it meant ordinary hypnosis
	// wording kept working on someone who wasn't under. Undoing what a trigger did is
	// handled by its own targeted phrase instead — "you are released from <trigger>".
	if (!isSessionActiveWith(sender)) {
		log(`heard "${id}" from ${sender} but no active session with them — ignoring`);
		return;
	}

	if (!mentionsAnyName(content, playerOwnNames())) {
		log(`heard "${id}" from ${sender} but they didn't say your name — ignoring`);
		return;
	}

	const features = getFeatures();
	// Permission gates restrictions, not releases — a revoked permission should never
	// leave an already-applied effect stuck on.
	if (!suggestion.release && (!features.hypnoEnabled || !permitted(suggestion, features))) {
		log(`heard "${id}" from ${sender} but ${suggestion.permission} isn't granted`);
		return;
	}
	// While recording a trigger, suggestions are stored rather than performed — otherwise
	// building a "you cannot move" trigger freezes the subject mid-setup, and the
	// hypnotist has to undo it before they can carry on.
	const recorded = recordAction(id);
	if (recorded) {
		ChatRoomSendLocal(recorded);
		return;
	}
	log(`matched suggestion "${id}" in: ${content}`);
	suggestion.run();
	ChatRoomSendLocal(flavor(id));
}
