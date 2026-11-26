// The ECHS popup's Triggers tab (job4.md stage 5): the wordings a hypnotist uses to plant, shape,
// keep up, release and remove a trigger, and the subject's own commands for theirs.
//
// The wordings are the ones the in-game help teaches (help.ts, "Planting a trigger"), and
// test/popup.mjs runs every one, name in front, through voice.ts's own parsers, so a reworded
// pattern fails the build instead of the player. Lines that need finishing (the trigger word, what a
// compulsion does) end where the player types on; the suite checks them with a sample ending.
//
// Pure: no DOM, no BC globals. popup.ts draws it.

import { compulsionActList, poseActList, COMPULSION_ACTS } from "./compulsion-acts";
import { ORDINALS } from "./planted";

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
	/** A line that opens a list to pick from instead of typing at once (v1.16.9, DW: "can I also get
	 * this list to help build it"). Each choice types its own phrase, to be finished as `finish`. */
	choices?: { label: string; phrase: string }[];
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
			{ id: "every", label: "this trigger works every time", phrase: "this trigger works every time" },
			{ id: "lasts", label: "it lasts 2 hours", phrase: "it lasts 2 hours" },
			{ id: "anyone", label: "anyone can use it", phrase: "anyone can use it" },
			{ id: "only-me", label: "only I can use it", phrase: "only I can use it" },
			{ id: "owner", label: "your owner can use it", phrase: "your owner can use it" },
			{ id: "lovers", label: "your lovers can use it", phrase: "your lovers can use it" },
			{ id: "friends", label: "your friends can use it", phrase: "your friends can use it" },
			{ id: "exact", label: "only when you hear it exactly (whole words)", phrase: "only when you hear it exactly" },
			{ id: "drop", label: "you will drop into trance (needs Drop triggers on)", phrase: "you will drop into trance" },
			{
				id: "react",
				label: "whenever anyone … you, … (a reaction while it holds them)",
				phrase: "whenever anyone gropes you, ",
				finish: "what they will do, on this line. It works only while this trigger holds them",
				sample: "whenever anyone gropes you, you will kneel",
				choices: COMPULSION_ACTS.map((a) => ({ label: a.label, phrase: `whenever anyone ${a.label}, ` })),
			},
			{ id: "say", label: "you will say '…' three times (needs Made to Speak)", phrase: "you will say '", finish: "the words, then ' three times", sample: "you will say 'I obey' three times" },
		],
	},
	{
		key: "compel",
		title: "Compulsions (waiting for something, not a word)",
		hint: `Then the suggestion, then remember trigger. Once, unless you say it works every time (or start with "whenever"). "When anyone …" can be: ${compulsionActList()}. Or a name instead of anyone.`,
		lines: [
			{ id: "after-wake", label: "five minutes after you wake, …", phrase: "five minutes after you wake, ", finish: "what they will do", sample: "five minutes after you wake, you will kneel" },
			{ id: "on-wake", label: "when you open your eyes, …", phrase: "when you open your eyes, ", finish: "what they will do", sample: "when you open your eyes, you will kneel" },
			{ id: "arrive", label: "when … comes in, …", phrase: "when ", finish: "who, then comes in, then what they will do", sample: "when Rei comes in, you will kneel" },
			{ id: "speak", label: "when I speak, …", phrase: "when I speak, ", finish: "what they will do", sample: "when I speak, you will kneel" },
			{
				id: "act",
				label: "when anyone … you, … (pick what they do)",
				phrase: "when anyone kisses you, ",
				finish: "what they will do. Change \"anyone\" to a name or \"I\" if you like",
				sample: "when anyone kisses you, you will kneel",
				choices: COMPULSION_ACTS.filter((a) => !a.items && !a.clothes && !a.pose).map((a) => ({ label: a.label, phrase: `when anyone ${a.label}, ` })),
			},
			// The items on a line of their own (v1.16.22, DW: "I don't see them in the window"; they
			// were at the end of the list above).
			{
				id: "item",
				label: "whenever anyone puts an item on you, … (pick the item: gag, rope, chastity…)",
				phrase: "whenever anyone gags you, ",
				finish: "what they will do. Add \"this trigger holds while you wear it\" to keep it on until the item comes off",
				sample: "whenever anyone gags you, you will kneel",
				choices: COMPULSION_ACTS.filter((a) => a.items).map((a) => ({ label: a.label, phrase: `whenever anyone ${a.label}, ` })),
			},
			// Clothing (v1.18.0, DW): anyone counts, them included, unless a name is said instead.
			{
				id: "clothes",
				label: "whenever anyone undresses you, … (pick the garment, off or on)",
				phrase: "whenever anyone undresses you, ",
				finish: "what they will do. Anyone includes them. Add \"this trigger holds while you are undressed\" to keep it on until the garment goes back on",
				sample: "whenever anyone undresses you, you will kneel",
				// Off before on, and "undresses you" / "dresses you" first in each (the table lists them
				// after the single garments, so those match first).
				choices: COMPULSION_ACTS.filter((a) => a.clothes)
					.sort((x, y) => Number(x.clothes!.dir === "on") - Number(y.clothes!.dir === "on") || Number(x.clothes!.slots.length > 0) - Number(y.clothes!.slots.length > 0))
					.map((a) => ({ label: a.label, phrase: `whenever anyone ${a.label}, ` })),
			},
			// Poses (v1.19.7, DW): whoever moves them, them included; never ECHS.
			{
				id: "pose",
				label: "whenever you kneel, … (pick the pose: kneel, stand, arms…)",
				phrase: "whenever you kneel, ",
				finish: `what they will do. Whoever moves them counts, them included; ECHS's own posing never does. Poses: ${poseActList()}`,
				sample: "whenever you kneel, you will kneel",
				choices: COMPULSION_ACTS.filter((a) => a.pose).map((a) => ({ label: a.pose!.self, phrase: `whenever ${a.pose!.self}, ` })),
			},
			{ id: "every", label: "this trigger works every time", phrase: "this trigger works every time" },
			{ id: "worn", label: "this trigger holds while you wear it (item, or clothing put on)", phrase: "this trigger holds while you wear it" },
			{ id: "noremove", label: "you cannot take it off (item compulsions: they can't remove it while it holds)", phrase: "you cannot take it off" },
			{ id: "bare", label: "this trigger holds while you are undressed (clothing taken off)", phrase: "this trigger holds while you are undressed" },
			{ id: "posehold", label: "this trigger holds while you stay like that (poses: until they move out of it)", phrase: "this trigger holds while you stay like that" },
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
		{ id: "forget", label: "forget", phrase: `forget the trigger ${word}`, release: true },
	];
}

/** For one compulsion you planted, by its number among yours (v1.19.6). */
export function compulsionLines(n: number): TriggerLine[] {
	const which = `the ${ORDINALS[n - 1]} compulsion`;
	return [
		{ id: "release-compulsion", label: "release", phrase: `you are released from ${which}`, release: true },
		{ id: "forget-compulsion", label: "forget", phrase: `forget ${which}`, release: true },
	];
}

/** For the compulsions you planted in them (v1.16.10): no word, so these act on all of yours. */
export const COMPULSION_LINES: TriggerLine[] = [
	{ id: "release-compulsions", label: "release all", phrase: "you are released from the compulsion", release: true },
	{ id: "forget-compulsions", label: "forget all", phrase: "forget your compulsions", release: true },
];

/** Every trigger you planted in them at once, compulsions included. */
export const FORGET_ALL: TriggerLine = { id: "forget-all", label: "forget everything I planted", phrase: "forget every trigger I gave you", release: true };
