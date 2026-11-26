// The touch picker (v1.19.2, DW 2026-11-26): "Can the hypnotist pick who from a list? I would like to
// get ALL the touch areas in the list.. Same with Phantom ... Or even just make Phantom a modifier for
// touch". One picker on the popup's Suggestions tab, Touch group: who (themselves, me, anyone else
// here), a switch for real or phantom, the touch, then a click on an area types the line.
//
// The lines it types are the grammars voice.ts and phantom.ts already read: "<verb> your <part>",
// "<verb> my <part>", "<verb> Rei's <part>", and "you feel <touch> your <part>". test/popup-touch.mjs
// runs every combination through those matchers, so the picker can't offer a line nothing reads.
//
// Where BC won't allow a touch (R134 ActivityFemale3DCG: Target for someone else, TargetSelf for
// herself), the area is greyed, not hidden: her client decides (rule 1), and the hint is from BC's
// own table on the hypnotist's client. A phantom touch is imagined, so nothing is greyed for it.
//
// DW's worry, a crowded room: up to PICKER_CHIPS people show as buttons, the rest in a list.
//
// Pure apart from areaAllowed, which reads BC's activity table when it is there.

export type TouchWho = { kind: "self" } | { kind: "me" } | { kind: "other"; name: string };

export type TouchVerb = {
	/** BC's activity, for greying. */
	activity: string;
	/** What the picker shows and types: "kiss". */
	word: string;
	/** The phantom wording before "your <part>", or none when a phantom can't say it. */
	phantom?: string;
	/** Only these areas (Pull: the hair). */
	areas?: string[];
	/** A different BC activity on some areas of someone else: "suck my cock" is SuckPenetrateItem
	 * (v1.16.31). On herself it stays the plain one, which BC doesn't allow there (so it greys). */
	byArea?: Record<string, string>;
};

/** The BC activity this touch is on that area. */
export function verbActivity(verb: TouchVerb, area: string, onSelf: boolean): string {
	return (onSelf ? undefined : verb.byArea?.[area]) ?? verb.activity;
}

export const TOUCH_VERBS: TouchVerb[] = [
	{ activity: "Caress", word: "touch", phantom: "a hand on" },
	{ activity: "Caress", word: "caress", phantom: "fingers caress" },
	{ activity: "Kiss", word: "kiss", phantom: "lips on" },
	{ activity: "Lick", word: "lick", phantom: "a tongue on" },
	{ activity: "Grope", word: "grope", phantom: "a hand squeeze" },
	{ activity: "Pinch", word: "pinch", phantom: "fingers pinch" },
	{ activity: "Spank", word: "spank", phantom: "a hand spank" },
	{ activity: "Slap", word: "slap", phantom: "a hand slap" },
	{ activity: "Tickle", word: "tickle", phantom: "fingers tickle" },
	{ activity: "Bite", word: "bite", phantom: "teeth on" },
	{ activity: "Nibble", word: "nibble", phantom: "teeth nibble" },
	{ activity: "Scratch", word: "scratch", phantom: "nails scratch" },
	{ activity: "MassageHands", word: "massage", phantom: "hands massage" },
	{ activity: "Pet", word: "pet" },
	{ activity: "Pull", word: "pull", phantom: "a hand tug", areas: ["hair"] },
	{ activity: "Suck", word: "suck", byArea: { cock: "SuckPenetrateItem" } },
	{ activity: "MasturbateHand", word: "finger" },
];

/** The areas, head to toe, as body-part words both grammars know (selftouch.ts BODY_PARTS), with the
 * BC zones they mean. */
export const TOUCH_AREAS: { word: string; zones: string[] }[] = [
	{ word: "hair", zones: ["ItemHead"] },
	{ word: "face", zones: ["ItemHead"] },
	{ word: "ears", zones: ["ItemEars"] },
	{ word: "nose", zones: ["ItemNose"] },
	{ word: "lips", zones: ["ItemMouth"] },
	{ word: "neck", zones: ["ItemNeck"] },
	{ word: "shoulders", zones: ["ItemArms"] },
	{ word: "arms", zones: ["ItemArms"] },
	{ word: "hands", zones: ["ItemHands"] },
	{ word: "breasts", zones: ["ItemBreast"] },
	{ word: "nipples", zones: ["ItemNipples"] },
	{ word: "belly", zones: ["ItemPelvis", "ItemTorso"] },
	{ word: "waist", zones: ["ItemTorso"] },
	{ word: "hips", zones: ["ItemPelvis"] },
	{ word: "butt", zones: ["ItemButt"] },
	{ word: "pussy", zones: ["ItemVulva"] },
	{ word: "clit", zones: ["ItemVulvaPiercings"] },
	{ word: "cock", zones: ["ItemVulva"] },
	{ word: "thighs", zones: ["ItemLegs"] },
	{ word: "legs", zones: ["ItemLegs", "ItemFeet"] },
	{ word: "feet", zones: ["ItemBoots"] },
	{ word: "toes", zones: ["ItemBoots"] },
];

/** Past this many other people, the rest go in a list (DW: a crowded room). */
export const PICKER_CHIPS = 5;

/** The line after the subject's name, or null when that combination isn't one (a phantom on someone
 * else, a phantom of a touch it can't say, an area the touch never takes). */
export function touchLine(verb: TouchVerb, who: TouchWho, area: string, phantom: boolean): string | null {
	if (verb.areas && !verb.areas.includes(area)) return null;
	if (phantom) {
		if (!verb.phantom || who.kind === "other") return null;
		// "you feel my lips on your neck": the hypnotist's own, imagined.
		const what = who.kind === "me" ? verb.phantom.replace(/^(?:a|an) /, "my ").replace(/^(lips|fingers|nails|teeth|hands) /, "my $1 ") : verb.phantom;
		return `you feel ${what} your ${area}`;
	}
	if (who.kind === "self") return `${verb.word} your ${area}`;
	if (who.kind === "me") return `${verb.word} my ${area}`;
	return `${verb.word} ${who.name}'s ${area}`;
}

/** Would BC allow this touch on that area? On herself (TargetSelf, which `true` means the same as
 * Target) or on someone else (Target). Unknown when BC's table isn't there: then nothing is greyed. */
export function areaAllowed(activity: string, zones: string[], onSelf: boolean): boolean {
	let def: any = null;
	try {
		def = typeof AssetGetActivity === "function" ? AssetGetActivity(Player?.AssetFamily ?? "Female3DCG", activity) : null;
	} catch {
		def = null;
	}
	if (!def || !Array.isArray(def.Target)) return true;
	const targets: string[] = onSelf ? (def.TargetSelf === true ? def.Target : Array.isArray(def.TargetSelf) ? def.TargetSelf : []) : def.Target;
	return zones.some((z) => targets.includes(z));
}
