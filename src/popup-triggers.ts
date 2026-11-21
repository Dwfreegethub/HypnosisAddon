// The ECHS popup's Triggers tab (job4.md stage 5): the wordings a hypnotist uses to plant, shape,
// keep up, release and remove a trigger, and the subject's own commands for theirs.
//
// The wordings are the ones the in-game help teaches (help.ts, "Planting a trigger"), and
// test/popup.mjs runs every one, name in front, through voice.ts's own parsers, so a reworded
// pattern fails the build instead of the player. Lines that need finishing (the trigger word, what a
// compulsion does) end where the player types on; the suite checks them with a sample ending.
//
// Pure: no DOM, no BC globals. popup.ts draws it.

export type TriggerLine = {
	id: string;
	label: string;
	/** Typed after "Name, ". */
	phrase: string;
	/** Set when the player has to finish the line; said in the status after the click. */
	finish?: string;
	/** For the suite only: what a finished line looks like. */
	sample?: string;
	/** Undoes or cancels rather than adds. */
	release?: boolean;
};
export type TriggerGroup = { key: string; title: string; hint?: string; lines: TriggerLine[] };

/** For someone under you now: everything about planting. */
export const PLANT_GROUPS: TriggerGroup[] = [
	{
		key: "plant",
		title: "Plant a trigger",
		hint: "1. the word · 2. what it does: anything from Suggestions, each one added · 3. remember trigger",
		lines: [
			{ id: "start", label: "your trigger word is …", phrase: "your trigger word is ", finish: "the word or phrase", sample: "your trigger word is sleepy time" },
			{ id: "commit", label: "remember trigger", phrase: "remember trigger" },
			{ id: "cancel", label: "cancel the trigger (start again)", phrase: "cancel the trigger", release: true },
		],
	},
	{
		key: "shape",
		title: "Shape it (before remember trigger)",
		hint: "Their own settings still cap how long it lasts and who may fire it.",
		lines: [
			{ id: "once", label: "this trigger works only once", phrase: "this trigger works only once" },
			{ id: "lasts", label: "it lasts 2 hours", phrase: "it lasts 2 hours" },
			{ id: "anyone", label: "anyone can use it", phrase: "anyone can use it" },
			{ id: "only-me", label: "only I can use it", phrase: "only I can use it" },
			{ id: "owner", label: "your owner can use it", phrase: "your owner can use it" },
			{ id: "lovers", label: "your lovers can use it", phrase: "your lovers can use it" },
			{ id: "friends", label: "your friends can use it", phrase: "your friends can use it" },
			{ id: "exact", label: "only when you hear it exactly (whole words)", phrase: "only when you hear it exactly" },
			{ id: "drop", label: "you will drop into trance (needs Drop triggers on)", phrase: "you will drop into trance" },
			{ id: "say", label: "you will say '…' three times (needs Made to Speak)", phrase: "you will say '", finish: "the words, then ' three times", sample: "you will say 'I obey' three times" },
		],
	},
	{
		key: "compel",
		title: "Compulsions (waiting for something, not a word)",
		hint: "Then the suggestion, then remember trigger. Once, unless you say it works every time.",
		lines: [
			{ id: "after-wake", label: "five minutes after you wake, …", phrase: "five minutes after you wake, ", finish: "what they will do", sample: "five minutes after you wake, you will kneel" },
			{ id: "on-wake", label: "when you open your eyes, …", phrase: "when you open your eyes, ", finish: "what they will do", sample: "when you open your eyes, you will kneel" },
			{ id: "arrive", label: "when … comes in, …", phrase: "when ", finish: "who, then comes in, then what they will do", sample: "when Rei comes in, you will kneel" },
			{ id: "speak", label: "when I speak, …", phrase: "when I speak, ", finish: "what they will do", sample: "when I speak, you will kneel" },
		],
	},
	{
		key: "keep",
		title: "Keep one strong",
		hint: "While they are under with you, the one who planted it. Resets the fade.",
		lines: [{ id: "holds", label: "that trigger holds", phrase: "that trigger holds" }],
	},
];

/** For one trigger you planted, by its word. No trance needed for any of these. */
export function plantedLines(word: string): TriggerLine[] {
	return [
		{ id: "fire", label: "say it", phrase: word },
		{ id: "release", label: "release", phrase: `you are released from ${word}`, release: true },
		{ id: "forget", label: "remove", phrase: `forget the trigger ${word}`, release: true },
	];
}

/** Every trigger you planted in them at once; also the only way to remove a compulsion. */
export const FORGET_ALL: TriggerLine = { id: "forget-all", label: "remove everything I planted", phrase: "forget every trigger I gave you", release: true };
