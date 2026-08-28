import { log } from "./log";
import { applyEffect, removeEffect, setSuggestedPose } from "./effects";
import { getFeatures, FeatureToggles } from "./storage";
import { isSessionActiveWith } from "./session";

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
	id: string;
	/** Which permission toggle the subject must have granted. */
	permission: keyof FeatureToggles;
	patterns: RegExp[];
	/** What the subject sees when it lands. */
	feedback: string;
	run: () => void;
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
		feedback: "Your body feels like your own again.",
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
		feedback: "You find you cannot move.",
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
		feedback: "You could change your clothes now, if you wanted.",
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
		feedback: "The thought of changing your clothes slips away.",
		run: () => applyEffect("BlockWardrobe"),
	},
	{
		id: "stand",
		permission: "postureControl",
		// "get up" is guarded against the infinitive/first-person forms that show up in
		// ordinary conversation ("I need to get up early") — see isSelfReferential too.
		patterns: [
			/\bstand up\b/,
			/\byou (can|may) stand\b/,
			/(?<!\bto )(?<!\bi )(?<!\bwe )\bget up\b/,
			/\b(get|rise) to your feet\b/,
			/\bon your feet\b/,
		],
		feedback: "You rise to your feet.",
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
		feedback: "Your knees fold under you.",
		run: () => setSuggestedPose("Kneel"),
	},
];

// --- Entry point ---------------------------------------------------------------------

/** The pure half of this module: text in, suggestion id out. Split from handleSpokenLine
 * so the pattern library can be exercised directly against a phrase list without needing a
 * live session, a chat room, or the BC globals. */
/** A line the speaker is plainly saying about themselves, not to the subject — "I need to
 * get up early". Cheap guard against ordinary conversation tripping a suggestion; the
 * presence of "you" anywhere is enough to treat the line as addressed outward again. */
function isSelfReferential(text: string): boolean {
	return /^(i|we)\b/.test(text) && !/\byou\b/.test(text);
}

export function matchSuggestion(content: string): string | null {
	const text = normalize(content);
	if (!text || isSelfReferential(text)) return null;
	for (const suggestion of SUGGESTIONS) {
		if (suggestion.patterns.some((p) => p.test(text))) return suggestion.id;
	}
	return null;
}

/** Called for every ordinary chat line we receive. Does nothing unless the speaker is the
 * person currently running a session on us. */
export function handleSpokenLine(sender: number, content: string): void {
	if (!isSessionActiveWith(sender)) return;
	const id = matchSuggestion(content);
	if (!id) return;
	const suggestion = SUGGESTIONS.find((s) => s.id === id);
	if (!suggestion) return;

	const features = getFeatures();
	// Re-checked even though the session gate already passed: permission and session are
	// independent, and a spoken suggestion is just another way to reach the same effect a
	// button would have — so it answers to the same permission.
	if (!features.hypnoEnabled || !features[suggestion.permission]) {
		log(`heard "${id}" from ${sender} but ${suggestion.permission} isn't granted`);
		return;
	}
	log(`matched suggestion "${id}" in: ${content}`);
	suggestion.run();
	ChatRoomSendLocal(suggestion.feedback);
}
