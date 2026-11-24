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
	/** BC activity names that count. Empty = any activity at all. Ignored for an item act. */
	activities: string[];
	/** What follows the verb, as a regex. Default `you(?:r [a-z]+)?` ("kisses you", "pulls your
	 * hair"). Item acts set it to tell "ties your arms" from "ties your legs" (v1.16.15). */
	object?: string;
	/** An ITEM act (v1.16.15, DW): someone puts a restraint on her rather than doing an activity.
	 * BC's item groups that count; empty = any restraint group (an "Item…" group). Clothing is not
	 * an item act. */
	items?: string[];
	/** With `items`: waits for a lock being added to an item, not the item going on. */
	lock?: true;
};

/** The default object after the verb: "you", "your hair". */
export const DEFAULT_ACT_OBJECT = String.raw`you(?:r [a-z]+)?`;

/** What an item event looks like to actMatches: BC's group name with a prefix, so no activity
 * name ever reads as one. Built by the message handler in voice.ts installCompulsions. */
export const itemEvent = (group: string): string => `item:${group}`;
export const lockEvent = (group: string): string => `lock:${group}`;

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
	// Items put on her (v1.16.15, DW 2026-11-23, from a player's suggestion). Seen from BC's own
	// "ActionUse"/"ActionSwap" message naming her as the target (R134 Dialog.js, ChatRoom.js
	// ChatRoomPublishAction), so only items put on through the game's item menu count.
	{ key: "gag", label: "gags you", base: "gag you", verb: String.raw`(?:gags?|puts? a gag (?:on|in))`, object: String.raw`you(?:r mouth)?`, activities: [], items: ["ItemMouth", "ItemMouth2", "ItemMouth3"] },
	{ key: "blindfold", label: "blindfolds you", base: "blindfold you", verb: String.raw`(?:blindfolds?|hoods?|puts? a (?:blindfold|hood) on)`, object: "you", activities: [], items: ["ItemHead"] },
	{ key: "collar", label: "collars you", base: "collar you", verb: String.raw`(?:collars?|puts? a collar on)`, object: "you", activities: [], items: ["ItemNeck"] },
	{ key: "arms", label: "ties your arms", base: "tie your arms", verb: String.raw`(?:ties?|binds?|cuffs?|restrains?)`, object: String.raw`your (?:arms|wrists|hands)(?: together| up)?`, activities: [], items: ["ItemArms", "ItemHands"] },
	{ key: "legs", label: "ties your legs", base: "tie your legs", verb: String.raw`(?:ties?|binds?|cuffs?|restrains?)`, object: String.raw`your (?:legs|ankles|feet|thighs)(?: together)?`, activities: [], items: ["ItemLegs", "ItemFeet", "ItemBoots"] },
	{ key: "bind", label: "ties you up", base: "tie you up", verb: String.raw`(?:ties?|binds?|cuffs?|restrains?|puts? (?:something|anything) on)`, object: String.raw`you(?: up| down)?`, activities: [], items: [] },
	{ key: "lock", label: "locks something on you", base: "lock something on you", verb: String.raw`(?:locks?)`, object: String.raw`(?:(?:something|anything) on you|you(?:r [a-z]+)?(?: up)?)`, activities: [], items: [], lock: true },
	{ key: "any", label: "does anything to you", base: "do anything to you", verb: String.raw`(?:(?:do|does) (?:anything|something)(?: at all)? to|uses? an activity on|plays? with)`, activities: [] },
];

export const COMPULSION_ACT_KEYS: string[] = COMPULSION_ACTS.map((a) => a.key);

export function compulsionAct(key: string | undefined): CompulsionAct | undefined {
	return COMPULSION_ACTS.find((a) => a.key === key);
}

/** Does this event count for this act? `activityName` is a BC activity name, or an item event
 * (`item:ItemMouth`, `lock:ItemArms`) from itemEvent/lockEvent. */
export function actMatches(key: string | undefined, activityName: string): boolean {
	const act = compulsionAct(key);
	if (!act || !activityName) return false;
	const item = /^(item|lock):(.+)$/.exec(activityName);
	if (act.items) {
		if (!item || (item[1] === "lock") !== !!act.lock) return false;
		const group = item[2];
		return act.items.length === 0 ? group.startsWith("Item") : act.items.includes(group);
	}
	if (item) return false;
	return act.activities.length === 0 || act.activities.includes(activityName);
}

/** The list as players read it: "kisses you, touches you, ..." */
export function compulsionActList(): string {
	return COMPULSION_ACTS.map((a) => a.label).join(", ");
}
