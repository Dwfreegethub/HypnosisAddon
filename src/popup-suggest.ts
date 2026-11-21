// The ECHS popup's Suggestions tab (job4.md stage 3): what a hypnotist can SAY to someone under them,
// grouped the way a player thinks of it rather than by permission key.
//
// GENERATED from voice.ts's own table (suggestionHelp), the same list the help screen reads, so the
// popup cannot offer a wording the matcher no longer understands. The few things that are not in that
// table (waking, going deeper, the walking trance, touch) are listed here by hand, and test/popup.mjs
// runs every one of them through the real matchers with a name in front, so a reworded pattern fails
// the build instead of the player.
//
// Pure: no DOM, no BC globals. popup.ts draws it.

import { suggestionHelp } from "./voice";

export type SuggestItem = {
	/** voice.ts id, or an "x-" id for the hand-listed ones. */
	id: string;
	/** What the list shows. */
	label: string;
	/** What gets typed after the name. A real, matching wording, never a display merge like "come/cum". */
	phrase: string;
	/** Gives something back rather than taking it. Never depth-gated (voice.ts). */
	release: boolean;
	/** The permission(s) it needs, as voice.ts names them; "" for always-allowed. For stage 4's greying. */
	permission: string;
	/** Other wordings that also work, for the hover text. */
	more: string[];
};
export type SuggestCategory = { key: string; title: string; items: SuggestItem[] };

/** The order and names of the groups. */
export const CATEGORY_TITLES: [string, string][] = [
	["trance", "Trance"],
	["body", "Body & pose"],
	["face", "Face"],
	["moving", "Moving & following"],
	["senses", "Speech, sight & hearing"],
	["clothes", "Clothes"],
	["awareness", "Awareness"],
	["arousal", "Arousal"],
	["touch", "Touch"],
	["other", "Other"],
];

/** Where each permission goes. postureControl is split into body and face by id below. */
const BY_PERMISSION: Record<string, string> = {
	postureControl: "body",
	movementRestriction: "moving",
	followControl: "moving",
	speechRestriction: "senses",
	hearingControl: "senses",
	sightControl: "senses",
	clothingRestriction: "clothes",
	undressControl: "clothes",
	illusionControl: "clothes",
	suppressClothing: "awareness",
	suppressBondage: "awareness",
	suppressActivities: "awareness",
	arousalControl: "arousal",
};

/** Face expressions share postureControl with the poses; told apart by their ids. */
const FACE_ID = /^(tongue|mouth|lip|smile|grin|smirk|pout|moan|eyes|blush|face)\b/;

/** Not in voice.ts's table. Each is checked against the real matcher in test/popup.mjs. */
export const EXTRA_ITEMS: { cat: string; item: SuggestItem }[] = [
	{ cat: "trance", item: { id: "x-deeper", label: "sink deeper", phrase: "sink deeper", release: false, permission: "", more: ["deeper and deeper", "drift deeper"] } },
	{ cat: "trance", item: { id: "x-walk", label: "walk with me (stay under, on your feet)", phrase: "walk with me", release: false, permission: "", more: [] } },
	{ cat: "trance", item: { id: "x-still", label: "be still (back to the full trance)", phrase: "be still", release: false, permission: "", more: [] } },
	{ cat: "trance", item: { id: "x-wake", label: "wake up", phrase: "wake up", release: true, permission: "", more: ["you are awake", "come back to me"] } },
	{ cat: "touch", item: { id: "x-touch-block", label: "you cannot touch yourself", phrase: "you cannot touch yourself", release: false, permission: "selfTouchControl", more: ["you cannot touch your breasts"] } },
	{ cat: "touch", item: { id: "x-touch-release", label: "you can touch yourself", phrase: "you can touch yourself", release: true, permission: "selfTouchControl", more: [] } },
	{ cat: "touch", item: { id: "x-touch-self", label: "touch yourself", phrase: "touch yourself", release: false, permission: "compelActivity", more: ["touch your breasts", "pinch your nipples"] } },
	{ cat: "touch", item: { id: "x-kiss-me", label: "kiss me", phrase: "kiss me", release: false, permission: "compelActivity", more: ["pinch my nipples"] } },
];

function categoryFor(id: string, permission: string): string {
	const first = permission.split(" / ")[0];
	if (first === "postureControl" && FACE_ID.test(id)) return "face";
	return BY_PERMISSION[first] ?? "other";
}

/** Every suggestion, grouped and in order. Empty groups are left out. */
export function suggestCategories(): SuggestCategory[] {
	const buckets = new Map<string, SuggestItem[]>(CATEGORY_TITLES.map(([k]) => [k, []]));
	for (const x of EXTRA_ITEMS.filter((e) => e.cat === "trance")) buckets.get("trance")!.push(x.item);
	for (const s of suggestionHelp()) {
		buckets.get(categoryFor(s.id, s.permission))!.push({
			id: s.id,
			label: s.display[0] ?? s.examples[0],
			phrase: s.examples[0],
			release: s.release,
			permission: s.permission,
			more: s.display.slice(1),
		});
	}
	for (const x of EXTRA_ITEMS.filter((e) => e.cat !== "trance")) buckets.get(x.cat)!.push(x.item);
	return CATEGORY_TITLES.map(([key, title]) => ({ key, title, items: buckets.get(key)! })).filter((c) => c.items.length > 0);
}

/** What a click types: the subject's name, then the wording. Their name is what makes it theirs
 * (voice.ts name gate); a whisper would not need it, but the player decides that, not us. */
export function suggestionText(subjectName: string, phrase: string): string {
	return `${subjectName}, ${phrase}`;
}
