// Phantom touch (v1.19.0, DW 2026-11-26): "Missy, you feel a hand on your thigh", "you feel lips on
// your neck", "you feel hands all over you". She feels a touch nobody is giving her.
//
// DW: "I do want the touch to have the same effect as real touch would have and I am the only one
// that sees the touch." So it goes through BC's own ActivityEffect, exactly the call BC's "Arousal
// processing" handler makes for a real touch aimed at her (R134 ChatRoom.js, priority 210): her own
// liking for that activity and that zone, her fetishes, the zone's orgasm setting and the
// activity's expression all apply, as they would. Nothing is sent as an activity: a fake one in the
// room would read as someone really touching her. Her face can change, as with any touch, and the
// room sees a face change because BC syncs it.
//
// The room (DW's choice, "A reaction, no place", with "But room would not see it every time. Just
// some times"): now and then a short reaction that never says where, behind "Others see your
// reactions" (tellRoom). At most one in ROOM_CHANCE, and never two within ROOM_GAP_MS.
//
// Numbness wins: "you feel nothing when I touch you" covers touches she imagines too.
//
// Pure parsing up top (unit-tested); BC calls only in feelPhantom.

import { log } from "./log";
import { BODY_PARTS } from "./selftouch";
import { isNumb } from "./suppression";
import { tellPlayer, tellRoom, fillTokens } from "./notify";

export type PhantomTouch = {
	/** A BC activity name: what it feels like, for her preferences. */
	activity: string;
	/** The body-part word as said ("thighs"), or "all" for all over her, or "" for unnamed. */
	part: string;
};

/** A trigger action: "feel:Caress:thighs", "feel:Kiss:", "feel:Caress:all". */
export const PHANTOM_PREFIX = "feel:";

// What touches her. The noun gives the activity unless a stronger verb on the line says otherwise.
const NOUNS: [RegExp, string][] = [
	[/\b(?:lips|kiss|kisses|mouth)\b/, "Kiss"],
	[/\b(?:tongue|lick|licks)\b/, "Lick"],
	[/\b(?:teeth|bite|bites|nip)\b/, "Bite"],
	[/\b(?:spank|smack|swat)\b/, "Spank"],
	[/\b(?:slap)\b/, "Slap"],
	[/\b(?:pinch)\b/, "Pinch"],
	[/\b(?:nails|scratch)\b/, "Scratch"],
	[/\b(?:hand|hands|palm|palms|finger|fingers|fingertips|touch|touches|caress|caresses|someone|somebody|something)\b/, "Caress"],
];
// A verb that changes what a hand does: "a hand squeezes your breast", "fingers pinch your nipples".
const VERBS: [RegExp, string][] = [
	[/\b(?:grope|gropes|groping|squeeze|squeezes|squeezing|fondle|fondles|fondling|grab|grabs|grabbing|knead|kneads)\b/, "Grope"],
	[/\b(?:pinch|pinches|pinching|twist|twists|tweak|tweaks)\b/, "Pinch"],
	[/\b(?:spank|spanks|spanking|smack|smacks|swat|swats)\b/, "Spank"],
	[/\b(?:slap|slaps|slapping)\b/, "Slap"],
	[/\b(?:tickle|tickles|tickling)\b/, "Tickle"],
	[/\b(?:scratch|scratches|scratching|rake|rakes)\b/, "Scratch"],
	[/\b(?:tug|tugs|tugging|pull|pulls|pulling|yank|yanks)\b(?=.*\bhair\b)/, "Pull"],
	[/\b(?:kiss|kisses|kissing)\b/, "Kiss"],
	[/\b(?:lick|licks|licking)\b/, "Lick"],
	[/\b(?:bite|bites|biting|nibble|nibbles|nibbling)\b/, "Bite"],
];
/** "you feel …", "you suddenly feel …", "you can feel …", "you will feel …". */
const LEAD = /\byou (?:can |will |suddenly |slowly |begin to |start to |now )?feel (.+)$/;
const NEGATED = /\b(?:not|never|nothing|no|nobody|cannot|stop)\b/;
const PLACE = /\b(?:on|against|over|along|across|between|around|up|down|in|inside|at|under|through|behind) (?:you|your)\b/;
const STROKE = /\b(?:strokes?|stroking|brush(?:es)?|slides?|runs?|traces?|rubs?|caress(?:es)?|massages?)\b/;
const ALL_OVER =/\b(?:all over (?:you|your body)|everywhere|all of you)\b/;

/** Where an unnamed touch lands, by activity: BC zone and the word she is told. */
const DEFAULT_PART: Record<string, string> = {
	Caress: "thighs", Kiss: "neck", Lick: "neck", Bite: "neck", Spank: "butt", Slap: "butt",
	Pinch: "butt", Scratch: "back", Tickle: "ribs", Grope: "breasts", Pull: "hair",
};
/** "back" isn't a BODY_PARTS word (nothing blocks touching it); BC's nearest zone. */
const EXTRA_ZONES: Record<string, string> = { back: "ItemTorso", thigh: "ItemLegs", hand: "ItemHands", arm: "ItemArms", foot: "ItemBoots", hip: "ItemPelvis", shoulder: "ItemArms", cheek: "ItemHead", cheeks: "ItemHead", skin: "ItemTorso", body: "ItemTorso" };
/** Where "all over you" lands, one after another. */
const ALL_ZONES = ["ItemNeck", "ItemArms", "ItemTorso", "ItemLegs", "ItemBreast", "ItemButt"];

/** The zone a part word means, or null. */
export function phantomZone(word: string): string | null {
	return BODY_PARTS[word]?.[0] ?? EXTRA_ZONES[word] ?? null;
}

/** Read a phantom touch from a line, or null. Normalised text: lower case, punctuation spaced. */
export function matchPhantomTouch(content: string): PhantomTouch | null {
	const text = content
		.toLowerCase()
		.replace(/[‘’ʼ']/g, "")
		.replace(/[^a-z0-9\s]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	const m = LEAD.exec(text);
	if (!m) return null;
	const rest = m[1];
	if (NEGATED.test(rest)) return null;
	// "you feel your hands go heavy" is about her own body; "you feel warm" names nothing touching.
	if (/^your\b/.test(rest)) return null;
	// What touches her is read without the part: "a hand on your lips" is a hand, not a kiss.
	const toucher = rest.replace(/\byour [a-z]+\b/g, " ");
	const noun = NOUNS.find(([re]) => re.test(toucher));
	if (!noun) return null;
	const verb = VERBS.find(([re]) => re.test(rest));
	// It has to reach her: a place ("on your thigh", "all over you") or something done to her ("a
	// hand squeezes …", "fingers stroke …"). So "you can feel my hands" stays the numbness release,
	// and "you feel someone watching you" is nothing.
	if (!PLACE.test(rest) && !ALL_OVER.test(rest) && !verb && !STROKE.test(rest)) return null;
	const activity = verb && (noun[1] === "Caress" || verb[1] === "Pull") ? verb[1] : noun[1];
	if (ALL_OVER.test(rest)) return { activity, part: "all" };
	const words = /\byour ([a-z]+)\b/g;
	let w: RegExpExecArray | null;
	while ((w = words.exec(rest))) {
		const word = w[1];
		if (phantomZone(word)) return { activity, part: word };
		if (phantomZone(`${word}s`)) return { activity, part: `${word}s` };
	}
	return { activity, part: "" };
}

export function phantomActionId(t: PhantomTouch): string {
	return `${PHANTOM_PREFIX}${t.activity}:${t.part}`;
}

export function parsePhantomId(id: string): PhantomTouch | null {
	if (!id.startsWith(PHANTOM_PREFIX)) return null;
	const [activity, part = ""] = id.slice(PHANTOM_PREFIX.length).split(":");
	return activity ? { activity, part } : null;
}

const VERB_WORDS: Record<string, string> = {
	Caress: "a hand on", Kiss: "lips on", Lick: "a tongue on", Bite: "teeth on", Spank: "a spank on", Slap: "a slap on",
	Pinch: "a pinch on", Scratch: "nails on", Tickle: "fingers tickling", Grope: "a hand squeezing", Pull: "a tug on",
};

/** How a trigger's list reads it: "you feel a hand on your thighs". */
export function describePhantom(t: PhantomTouch): string {
	if (t.part === "all") return t.activity === "Caress" ? "you feel hands all over you" : `you feel ${VERB_WORDS[t.activity] ?? "a touch on"} you, all over`;
	return `you feel ${VERB_WORDS[t.activity] ?? "a touch on"} your ${t.part || DEFAULT_PART[t.activity] || "skin"}`;
}

const pick = <T>(list: T[], rnd: () => number): T => list[Math.floor(rnd() * list.length) % list.length];

/** Her private line. Never says who: nobody is there. */
export function phantomLine(t: PhantomTouch, rnd: () => number = Math.random): string {
	if (t.part === "all") {
		return pick(
			[
				"Hands are everywhere at once: your neck, your waist, your thighs, and nobody is there.",
				"Unseen hands roam all over you, slow and sure, as if they own you.",
				"You are touched all over, everywhere at once, by no one at all.",
			],
			rnd,
		);
	}
	const p = t.part || DEFAULT_PART[t.activity] || "skin";
	const lines: Record<string, string[]> = {
		Caress: [`A warm hand slides slowly along your ${p}.`, `Fingertips trace your ${p}, light as breath, and nobody is there.`, `Someone's palm rests on your ${p}, warm and certain.`],
		Kiss: [`Soft lips press to your ${p}.`, `A slow kiss lands on your ${p}, from nowhere.`],
		Lick: [`A warm tongue drags slowly across your ${p}.`],
		Bite: [`Teeth graze your ${p}, just hard enough.`],
		Spank: [`A sharp smack lands on your ${p}, and the sting blooms.`],
		Slap: [`A slap stings your ${p}.`],
		Pinch: [`Fingers pinch your ${p}, sharp and sudden.`],
		Scratch: [`Nails drag slowly down your ${p}.`],
		Tickle: [`Fingers dance over your ${p}, tickling, and you can't squirm away from no one.`],
		Grope: [`A hand squeezes your ${p}, greedy and sure.`],
		Pull: [`A hand closes in your hair and tugs.`],
	};
	return pick(lines[t.activity] ?? lines.Caress, rnd);
}

const ROOM_LINES = [
	"{name} shivers, though nobody is touching {them}.",
	"{name} squirms and bites {their} lip.",
	"{name} gasps softly at nothing.",
	"{name} shifts, as if someone had brushed against {them}.",
];
export const ROOM_CHANCE = 3;
export const ROOM_GAP_MS = 3 * 60_000;
let lastRoomAt = -Infinity;

/** For the tests. */
export function resetPhantomRoom(): void {
	lastRoomAt = -Infinity;
}

export type PhantomResult = "felt" | "numb" | "no-arousal";

/** She feels it. "numb": numbness took it; "no-arousal": felt, but her BC arousal is off. */
export function feelPhantom(t: PhantomTouch, rnd: () => number = Math.random, now: number = Date.now()): PhantomResult {
	if (isNumb()) {
		tellPlayer("Something reaches for you and lands on nothing at all.");
		log(`phantom ${t.activity}:${t.part}: numb`);
		return "numb";
	}
	tellPlayer(phantomLine(t, rnd));
	const zones = t.part === "all" ? ALL_ZONES : [phantomZone(t.part || DEFAULT_PART[t.activity] || "") ?? "ItemTorso"];
	const active = Player?.ArousalSettings?.Active;
	const arousal = (active === "Hybrid" || active === "Automatic") && typeof ActivityEffect === "function";
	if (arousal) {
		// The call BC makes for a real touch on her, with her as the source: no one else is there.
		for (const zone of t.part === "all" ? [pick(zones, rnd), pick(zones, rnd), pick(zones, rnd)] : zones) {
			try {
				ActivityEffect(Player, Player, t.activity, zone, 1);
			} catch (err) {
				log(`phantom ActivityEffect failed on ${zone}:`, err);
			}
		}
	}
	if (now - lastRoomAt >= ROOM_GAP_MS && Math.floor(rnd() * ROOM_CHANCE) === 0) {
		lastRoomAt = now;
		tellRoom(fillTokens(pick(ROOM_LINES, rnd)));
	}
	log(`phantom ${t.activity}:${t.part}${arousal ? "" : " (no arousal)"}`);
	return arousal ? "felt" : "no-arousal";
}
