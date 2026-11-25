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
	/** Other REAL wordings that also work (voice.ts examples, never display merges), one level down
	 * in the list (DW, 2026-11-21). Each is checked against the matchers in test/popup.mjs. */
	alternates: string[];
	/** Over the moment it lands: in a trigger it has no expiry timer (v1.16.11). Shown as such. */
	instant?: boolean;
	/** For a release, the ids it gives back, so it can be listed under them. */
	releaseOf?: string[];
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
const FACE_ID = /^(tongue|mouth|lip|smile|grin|smirk|pout|moan|eyes|blush|face|frown|wince|brows?|drool|tears)\b/;

/** Not in voice.ts's table. Each is checked against the real matcher in test/popup.mjs. */
export const EXTRA_ITEMS: { cat: string; item: SuggestItem }[] = [
	{ cat: "trance", item: { id: "x-deeper", label: "sink deeper", phrase: "sink deeper", release: false, permission: "", alternates: ["deeper and deeper", "drift deeper"] } },
	{ cat: "trance", item: { id: "x-walk", label: "walk with me (stay under, on your feet)", phrase: "walk with me", release: false, permission: "", alternates: [] } },
	{ cat: "trance", item: { id: "x-still", label: "be still (back to the full trance)", phrase: "be still", release: false, permission: "", alternates: [] } },
	{ cat: "trance", item: { id: "x-wake", label: "wake up", phrase: "wake up", release: true, permission: "", alternates: ["you are awake", "come back to me"] } },
	{ cat: "touch", item: { id: "x-touch-block", label: "you cannot touch yourself", phrase: "you cannot touch yourself", release: false, permission: "selfTouchControl", alternates: ["you cannot touch your breasts"] } },
	{ cat: "touch", item: { id: "x-touch-release", label: "you can touch yourself", phrase: "you can touch yourself", release: true, permission: "selfTouchControl", alternates: [], releaseOf: ["x-touch-block"] } },
	{ cat: "touch", item: { id: "x-touch-self", instant: true, label: "touch yourself", phrase: "touch yourself", release: false, permission: "compelActivity", alternates: ["touch your breasts", "pinch your nipples"] } },
	{ cat: "touch", item: { id: "x-sip", instant: true, label: "take a sip (of the drink in their hand)", phrase: "take a sip", release: false, permission: "compelActivity", alternates: ["sip your drink", "drink up"] } },
	{ cat: "touch", item: { id: "x-kiss-me", instant: true, label: "kiss me", phrase: "kiss me", release: false, permission: "compelActivity", alternates: ["pinch my nipples"] } },
	// v1.16.5: BC's own movements and gagged sounds, under Made to Act like the touches.
	{ cat: "body", item: { id: "x-wiggle", instant: true, label: "wiggle your hips", phrase: "wiggle your hips", release: false, permission: "compelActivity", alternates: ["shake your breasts", "sway your hips", "wiggle"] } },
	{ cat: "body", item: { id: "x-nod", instant: true, label: "nod", phrase: "nod", release: false, permission: "compelActivity", alternates: ["nod your head"] } },
	{ cat: "body", item: { id: "x-struggle", instant: true, label: "struggle (while tied)", phrase: "struggle", release: false, permission: "compelActivity", alternates: ["fight your bonds"] } },
	// v1.16.23: the strap-on commands (v1.16.17/18) in the window too (DW: "where are the fuck with dildo options").
	{ cat: "touch", item: { id: "x-fuck-me", instant: true, label: "fuck me (her strap-on, a dildo in hand, or a dildo gag)", phrase: "fuck me", release: false, permission: "compelActivity", alternates: ["fuck me hard", "fuck me with your dildo", "fuck me with your strap-on", "fuck me with your dildo gag", "fuck my ass", "fuck my mouth"] } },
	{ cat: "touch", item: { id: "x-suck-strapon", instant: true, label: "suck my strap-on (the one you wear)", phrase: "suck my strap-on", release: false, permission: "compelActivity", alternates: ["suck my dildo"] } },
	{ cat: "touch", item: { id: "x-hug-me", instant: true, label: "hug me", phrase: "hug me", release: false, permission: "compelActivity", alternates: ["nuzzle me", "kick me", "grab my collar", "cover my mouth", "peck my hand"] } },
	{ cat: "touch", item: { id: "x-cover-mouth", instant: true, label: "cover your mouth", phrase: "cover your mouth", release: false, permission: "compelActivity", alternates: ["grab your collar"] } },
	{ cat: "senses", item: { id: "x-gag-moan", instant: true, label: "moan into your gag (while gagged)", phrase: "moan", release: false, permission: "compelActivity", alternates: ["whimper", "groan", "giggle", "growl", "mumble"] } },
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
			instant: s.instant || undefined,
			permission: s.permission,
			alternates: s.examples.slice(1),
			releaseOf: s.releaseOf,
		});
	}
	for (const x of EXTRA_ITEMS.filter((e) => e.cat !== "trance")) buckets.get(x.cat)!.push(x.item);
	return CATEGORY_TITLES.map(([key, title]) => ({ key, title, items: ordered(key, buckets.get(key)!) })).filter((c) => c.items.length > 0);
}

// --- What a trigger can hold (v1.16.27) -----------------------------------------------------------
// When the chat box holds the start of a compulsion ("Sena, when anyone kisses you, "), the
// Suggestions tab adds a click to that line instead of replacing it, and greys what a trigger
// cannot hold (DW, 2026-11-24, after the UI lab review). The list is what voice.ts actually refuses
// inside a recording, found by planting every wording in the harness; test/popup-finish.mjs plants
// them all again, so this list and voice.ts cannot drift apart.

/** Changes the trance itself, which a trigger cannot hold (voice.ts: "A trigger cannot hold a
 * deepening"; walk, still and wake are session moves, not actions). */
const TRANCE_MOVES = new Set(["x-deeper", "x-walk", "x-still", "x-wake"]);
/** Aimed at the hypnotist ("kiss me"): voice.ts "a trigger can't aim at a person yet". */
const AIMED_AT_YOU = new Set(["x-kiss-me", "x-fuck-me", "x-suck-strapon", "x-hug-me"]);
/** Single wordings a recording reads differently. "you feel nothing when I touch you" starts a
 * "when I touch you" compulsion of its own; "on your feet" and a bare "moan" are not kept. The
 * other wordings of the same lines work. */
const WORDINGS_NOT_KEPT = new Set(["on your feet", "moan", "you feel nothing when i touch you"]);

/** Why this wording can't be one of a trigger's actions, or null if it can. */
export function notInTrigger(it: SuggestItem, phrase: string = it.phrase): string | null {
	if (TRANCE_MOVES.has(it.id)) return 'A trigger can\'t hold a trance move (deeper, walk, wake). Try "…you will drop into trance" instead.';
	if (AIMED_AT_YOU.has(it.id)) return "A trigger can't aim at a person yet, only at them.";
	if (WORDINGS_NOT_KEPT.has(phrase.toLowerCase())) return "This wording isn't kept in a trigger. Use another wording of it.";
	return null;
}

/** Kneel first in Body & pose: it is the one asked for most. */
const LEADS: Record<string, string[]> = { body: ["kneel"] };

/** Each release goes BELOW what it gives back (DW, 2026-11-21): "can't see, barely see, dim,
 * ↺ see again", never the release first. voice.ts records what each release undoes (releaseOf), so
 * it goes straight after the last of those; one that names none (wake up) goes at the end. */
export function ordered(key: string, items: SuggestItem[]): SuggestItem[] {
	const lead = LEADS[key] ?? [];
	const base = [...items.filter((i) => lead.includes(i.id)), ...items.filter((i) => !lead.includes(i.id))];
	const out = base.filter((i) => !i.release);
	for (const r of base.filter((i) => i.release)) {
		const undoes = new Set(r.releaseOf ?? []);
		let at = -1;
		out.forEach((it, n) => {
			if (undoes.has(it.id)) at = n;
		});
		if (at < 0) {
			out.push(r);
			continue;
		}
		// After any release already placed there, so two releases of one thing keep table order.
		while (at + 1 < out.length && out[at + 1].release) at++;
		out.splice(at + 1, 0, r);
	}
	return out;
}

/** What a click types: the subject's name, then the wording. Their name is what makes it theirs
 * (voice.ts name gate); a whisper would not need it, but the player decides that, not us. */
export function suggestionText(subjectName: string, phrase: string): string {
	return `${subjectName}, ${phrase}`;
}
