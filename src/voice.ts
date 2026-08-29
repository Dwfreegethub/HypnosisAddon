import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose, setSpeechBlocked } from "./effects";
import { setSuppressed } from "./suppression";
import { getFeatures, FeatureToggles } from "./storage";
import { isSessionActiveWith } from "./session";
import { flavor, FlavorKey } from "./flavor";

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
		],
		run: () => applyEffect("Freeze"),
	},
	{
		id: "clothing-release",
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
		],
		run: () => applyEffect("BlockWardrobe"),
	},
	{
		// The broad one: clothing, bondage and touch together. Each category is still
		// applied only if separately permitted — saying it doesn't override a box the
		// subject left unchecked.
		id: "awareness-release",
		permission: ["suppressClothing", "suppressBondage", "suppressActivities"],
		patterns: [
			/\byou notice (everything|things|them|it) again\b/,
			/\byou (notice|feel) what (happens|is happening|is done) to you\b/,
			/\byou are (aware|awake) (again|to it)\b/,
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
	},
	{
		id: "speech-release",
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
			/(?<!\bi )(?<!\bwe )\bsilence\b/,
		],
		run: () => setSpeechBlocked(true),
	},
	{
		id: "stand",
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
function playerNames(): string[] {
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

/** Human-readable verdict on a phrase for /hypno match — reports the pattern result and
 * the name gate separately, since a phrase can match perfectly and still be ignored. */
export function describeMatch(content: string): string {
	const id = matchSuggestion(content);
	if (!id) return "no match";
	return mentionsAnyName(content, playerNames())
		? `${id} — would fire`
		: `${id} — but your name isn't in the line, so it would be ignored`;
}

/** Called for every ordinary chat line we receive. Does nothing unless the speaker is the
 * person currently running a session on us. */
export function handleSpokenLine(sender: number, content: string): void {
	// Match BEFORE the session check, so a line that WOULD have done something can say why
	// it didn't. Checking the session first was silent — an unmatched line and a matched
	// line with no session looked identical from the outside, which is exactly the case
	// that needed telling apart.
	const id = matchSuggestion(content);
	if (!id) return;
	const suggestion = SUGGESTIONS.find((s) => s.id === id);
	if (!suggestion) return;

	if (!isSessionActiveWith(sender)) {
		log(`heard "${id}" from ${sender} but no active session with them — ignoring`);
		return;
	}

	if (!mentionsAnyName(content, playerNames())) {
		log(`heard "${id}" from ${sender} but they didn't say your name — ignoring`);
		return;
	}

	const features = getFeatures();
	// Re-checked even though the session gate already passed: permission and session are
	// independent, and a spoken suggestion is just another way to reach the same effect a
	// button would have — so it answers to the same permission.
	if (!features.hypnoEnabled || !permitted(suggestion, features)) {
		log(`heard "${id}" from ${sender} but ${suggestion.permission} isn't granted`);
		return;
	}
	log(`matched suggestion "${id}" in: ${content}`);
	suggestion.run();
	ChatRoomSendLocal(flavor(id));
}
