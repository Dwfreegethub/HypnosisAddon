// What "when anyone X you, ..." can wait for (v1.16.9; DW 2026-11-22: "can we do 'When anyone X'
// and make a list that X can be"). Each entry is something done TO the subject with one of BC's own
// activities, seen on her client when the activity message names her as the target (rule 1).
//
// The body part is not checked: "when anyone kisses your hand" waits for any kiss. The list is
// the one place the parser (voice.ts), the help screen, the popup and the wiki read from.
//
// Pure: no DOM, no BC globals.

export type CompulsionAct = {
	/** Stored on the trigger (`act`). Never renamed: a saved trigger keeps it. */
	key: string;
	/** How it reads after a name: "Rei kisses you". */
	label: string;
	/** After "you" or "they": "kiss you". */
	base: string;
	/** The verb as a hypnotist says it, any person ("kiss", "kisses"). Matched on lower-case text
	 * with punctuation already spaced out. */
	verb: string;
	/** BC activity names that count. Empty = any activity at all. */
	activities: string[];
};

export const COMPULSION_ACTS: CompulsionAct[] = [
	{ key: "kiss", label: "kisses you", base: "kiss you", verb: String.raw`(?:kiss|kisses|pecks?)`, activities: ["Kiss", "FrenchKiss", "PoliteKiss"] },
	{
		key: "touch",
		label: "touches you",
		base: "touch you",
		verb: String.raw`(?:touch|touches|caress|caresses|strokes?|rubs?|massages?)`,
		activities: ["Caress", "MassageHands", "MassageFeet", "Grope", "Pinch", "Tickle", "Pet", "Scratch", "Pull", "MasturbateHand", "Cuddle"],
	},
	{ key: "hug", label: "hugs you", base: "hug you", verb: String.raw`(?:hugs?|cuddles?|snuggles?|nuzzles?)`, activities: ["Cuddle"] },
	{ key: "pet", label: "pets you", base: "pet you", verb: String.raw`(?:pets?|pats?|headpats?)`, activities: ["Pet"] },
	{ key: "spank", label: "spanks you", base: "spank you", verb: String.raw`(?:spanks?|smacks?)`, activities: ["Spank"] },
	{ key: "slap", label: "slaps you", base: "slap you", verb: String.raw`(?:slaps?)`, activities: ["Slap"] },
	{ key: "tickle", label: "tickles you", base: "tickle you", verb: String.raw`(?:tickles?)`, activities: ["Tickle"] },
	{ key: "pinch", label: "pinches you", base: "pinch you", verb: String.raw`(?:pinch|pinches)`, activities: ["Pinch"] },
	{ key: "grope", label: "gropes you", base: "grope you", verb: String.raw`(?:gropes?|fondles?|squeezes?)`, activities: ["Grope"] },
	{ key: "lick", label: "licks you", base: "lick you", verb: String.raw`(?:licks?)`, activities: ["Lick"] },
	{ key: "bite", label: "bites you", base: "bite you", verb: String.raw`(?:bites?|nibbles?)`, activities: ["Bite", "Nibble"] },
	{ key: "pull", label: "pulls your hair", base: "pull your hair", verb: String.raw`(?:pulls?|tugs?)`, activities: ["Pull"] },
	{ key: "kick", label: "kicks you", base: "kick you", verb: String.raw`(?:kicks?)`, activities: ["Kick"] },
	{ key: "any", label: "does anything to you", base: "do anything to you", verb: String.raw`(?:(?:do|does) (?:anything|something)(?: at all)? to|uses? an activity on|plays? with)`, activities: [] },
];

export const COMPULSION_ACT_KEYS: string[] = COMPULSION_ACTS.map((a) => a.key);

export function compulsionAct(key: string | undefined): CompulsionAct | undefined {
	return COMPULSION_ACTS.find((a) => a.key === key);
}

/** Does a BC activity by this name count for this act? */
export function actMatches(key: string | undefined, activityName: string): boolean {
	const act = compulsionAct(key);
	if (!act || !activityName) return false;
	return act.activities.length === 0 || act.activities.includes(activityName);
}

/** The list as players read it: "kisses you, touches you, ..." */
export function compulsionActList(): string {
	return COMPULSION_ACTS.map((a) => a.label).join(", ");
}
