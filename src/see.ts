// Seeing illusions (v1.21.0, DW's ideas doc #7, "Lets try Illusions", 2026-11-26): she sees herself
// otherwise than she is, on her own screen only. Two kinds, one at a time (illusion.ts draws them):
//
//   strip  "Missy, you see yourself naked", "…topless", "…without your bra", "…in your underwear".
//          Her own view leaves those clothes off; everyone else sees her dressed.
//   bind   "Missy, you see yourself tied up", "your wrists are bound in rope", "your ankles are
//          cuffed", "you see yourself gagged". Her own view adds rope, cuffs, chains or tape that
//          are not there. DW: "Picture, Hypnotist can add hold and remind the tist that the illusion
//          does not restrict movement": it never holds her; the hypnotist is told so, and how to.
//
// This file is the pure half: the wording, the action id ("see:…") a trigger stores, and the words
// for the lists. Asset names checked in live R134 Female3DCG.js / Female3DCGExtended.js
// (2026-11-26): HempRope (arms WristTie, legs and feet Basic), MetalCuffs (InFront), Chains
// (WristTie), DuctTape (Arms / Legs / Feet / Small / Double), LeatherLegCuffs, SteelAnkleCuffs,
// HempRopeHarness, BallGag, ClothGag, LeatherBlindfold, ClothBlindfold.

export const SEE_PREFIX = "see:";

/** An item she sees. `record` is BC's TypeRecord (the item's options), for items picked with their
 * options; without it the item is drawn in its first option. */
export type Ghost = { group: string; asset: string; record?: Record<string, number> };
export type SeeIllusion = { kind: "strip"; slots: string[] | "all" } | { kind: "bind"; ghosts: Ghost[] };

// --- strip -------------------------------------------------------------------------------------

const TOP = ["ClothOuter", "Cloth", "ClothAccessory", "Suit", "Corset"];
const BOTTOM = ["ClothLower", "SuitLower"];
/** Garment words to undress.ts slots. */
const GARMENTS: [RegExp, string[]][] = [
	[/^(?:underwear|lingerie)$/, ["Bra", "Panties", "Garters"]],
	[/^(?:top|shirt|blouse|dress|clothes on top|sweater|jumper|t-?shirt)$/, ["ClothOuter", "Cloth", "ClothAccessory"]],
	[/^(?:jacket|coat|hoodie)$/, ["ClothOuter"]],
	[/^(?:skirt|pants|trousers|jeans|shorts|bottoms)$/, BOTTOM],
	[/^(?:bra)$/, ["Bra"]],
	[/^(?:panties|knickers|thong)$/, ["Panties"]],
	[/^(?:shoes|heels|boots)$/, ["Shoes"]],
	[/^(?:socks|stockings|tights)$/, ["Socks", "SocksLeft", "SocksRight"]],
	[/^(?:gloves)$/, ["Gloves"]],
	[/^(?:suit|bodysuit|leotard)$/, ["Suit", "SuitLower"]],
	[/^(?:corset)$/, ["Corset"]],
];

function garmentSlots(word: string): string[] | null {
	for (const [re, slots] of GARMENTS) if (re.test(word)) return slots;
	return null;
}

/** "you see yourself …", "you look … to yourself", "your reflection is …". */
const SEE_LEAD = /\byou (?:can |will |now |suddenly )?see yourself (?:as )?(.+)$/;
const LOOK_LEAD = /\byou (?:look|appear) (.+?) to yourself\b/;

function matchStrip(rest: string): SeeIllusion | null {
	if (/^(?:completely |totally |stark |entirely )?(?:naked|nude|undressed|bare|unclothed)\b/.test(rest)) return { kind: "strip", slots: "all" };
	if (/^(?:with nothing on|wearing nothing|without (?:any |your )?clothes)\b/.test(rest)) return { kind: "strip", slots: "all" };
	if (/^topless\b/.test(rest)) return { kind: "strip", slots: [...TOP, "Bra"] };
	if (/^bottomless\b/.test(rest)) return { kind: "strip", slots: [...BOTTOM, "Panties", "Garters"] };
	if (/^(?:in|wearing) (?:only |just |nothing but )?(?:your )?(?:underwear|lingerie)\b/.test(rest)) return { kind: "strip", slots: [...TOP, ...BOTTOM, "Gloves"] };
	const without = /^without (?:your |a |any )?(.+)$/.exec(rest);
	if (without) {
		const slots: string[] = [];
		for (const raw of without[1].split(/\s*(?:,|\band\b|\bor\b)\s*(?:your |a |any )?/)) {
			const word = raw.trim().replace(/\b(?:on|anymore|any more|now)$/, "").trim();
			if (!word) continue;
			const got = garmentSlots(word);
			if (!got) break; // the rest of the line is something else
			for (const s of got) if (!slots.includes(s)) slots.push(s);
		}
		if (slots.length) return { kind: "strip", slots };
	}
	return null;
}

// --- bind --------------------------------------------------------------------------------------

type Material = "rope" | "cuffs" | "chains" | "tape" | "leather";
type Part = "arms" | "legs" | "feet" | "torso" | "mouth" | "eyes";

const MATERIAL_ASSETS: Record<Material, Partial<Record<Part, Ghost>>> = {
	rope: {
		arms: { group: "ItemArms", asset: "HempRope" },
		legs: { group: "ItemLegs", asset: "HempRope" },
		feet: { group: "ItemFeet", asset: "HempRope" },
		torso: { group: "ItemTorso", asset: "HempRopeHarness" },
		mouth: { group: "ItemMouth", asset: "ClothGag" },
		eyes: { group: "ItemHead", asset: "ClothBlindfold" },
	},
	cuffs: {
		arms: { group: "ItemArms", asset: "MetalCuffs" },
		legs: { group: "ItemLegs", asset: "LeatherLegCuffs" },
		feet: { group: "ItemFeet", asset: "SteelAnkleCuffs" },
	},
	chains: {
		arms: { group: "ItemArms", asset: "Chains" },
		legs: { group: "ItemLegs", asset: "Chains" },
		feet: { group: "ItemFeet", asset: "Chains" },
	},
	tape: {
		arms: { group: "ItemArms", asset: "DuctTape" },
		legs: { group: "ItemLegs", asset: "DuctTape" },
		feet: { group: "ItemFeet", asset: "DuctTape" },
		mouth: { group: "ItemMouth", asset: "DuctTape" },
		eyes: { group: "ItemHead", asset: "DuctTape" },
	},
	leather: {
		mouth: { group: "ItemMouth", asset: "BallGag" },
		eyes: { group: "ItemHead", asset: "LeatherBlindfold" },
	},
};

function materialOf(word: string | undefined): Material | null {
	if (!word) return null;
	if (/^(?:rope|ropes|hemp|cord|cords|rope bindings)$/.test(word)) return "rope";
	if (/^(?:cuffs|handcuffs|shackles|irons|metal cuffs|steel cuffs)$/.test(word)) return "cuffs";
	if (/^(?:chains?|chain)$/.test(word)) return "chains";
	if (/^(?:tape|duct tape|duck tape)$/.test(word)) return "tape";
	if (/^(?:leather|straps|a ball gag|ball gag|a gag|gag|a blindfold|blindfold)$/.test(word)) return "leather";
	if (/^(?:cloth|a cloth|silk|a scarf|scarf)$/.test(word)) return "rope"; // the cloth gag and blindfold
	return null;
}

function partOf(word: string): Part | null {
	if (/^(?:wrists?|arms?|hands?|elbows?)$/.test(word)) return "arms";
	if (/^(?:legs?|knees?|thighs?)$/.test(word)) return "legs";
	if (/^(?:ankles?|feet|foot)$/.test(word)) return "feet";
	if (/^(?:body|chest|torso|breasts)$/.test(word)) return "torso";
	if (/^(?:mouth|lips)$/.test(word)) return "mouth";
	if (/^(?:eyes)$/.test(word)) return "eyes";
	return null;
}

function ghostsFor(material: Material, parts: Part[]): Ghost[] {
	const out: Ghost[] = [];
	for (const p of parts) {
		const g = MATERIAL_ASSETS[material][p] ?? (p === "mouth" || p === "eyes" ? MATERIAL_ASSETS.leather[p] : MATERIAL_ASSETS.rope[p === "torso" ? "torso" : p]);
		if (g && !out.some((o) => o.group === g.group)) out.push(g);
	}
	return out;
}

const MATERIAL_WORDS = String.raw`(?:rope|ropes|hemp|cords?|cuffs|handcuffs|shackles|irons|metal cuffs|steel cuffs|chains?|tape|duct tape|leather|straps|cloth|silk|a scarf|a ball gag|ball gag|a gag|gag|a blindfold|blindfold)`;
const PART_WORDS = String.raw`(?:wrists?|arms?|hands?|elbows?|legs?|knees?|thighs?|ankles?|feet|body|chest|torso|mouth|eyes)`;
const VERB_MATERIAL: Record<string, Material> = { cuffed: "cuffs", shackled: "cuffs", handcuffed: "cuffs", chained: "chains", taped: "tape" };

function partsIn(text: string): Part[] {
	const parts: Part[] = [];
	for (const m of text.matchAll(new RegExp(String.raw`\b${PART_WORDS}\b`, "g"))) {
		const p = partOf(m[0]);
		if (p && !parts.includes(p)) parts.push(p);
	}
	return parts;
}

function matchBind(line: string, rest: string | null): SeeIllusion | null {
	// "you see yourself tied up (in rope)", "…bound", "…cuffed", "…gagged", "…blindfolded".
	if (rest !== null) {
		const m = new RegExp(String.raw`^(?:all )?(tied up|tied|bound|trussed up|cuffed|handcuffed|shackled|chained(?: up)?|taped(?: up)?|gagged|blindfolded)(?: (?:in|with) (${MATERIAL_WORDS}))?(?: and (gagged|blindfolded))?\b`).exec(rest);
		if (m) {
			const verb = m[1].replace(/ up$/, "");
			const mat = materialOf(m[2]) ?? VERB_MATERIAL[verb] ?? (verb === "gagged" || verb === "blindfolded" ? "leather" : "rope");
			let parts: Part[] = verb === "gagged" ? ["mouth"] : verb === "blindfolded" ? ["eyes"] : verb === "cuffed" || verb === "handcuffed" || verb === "shackled" || verb === "chained" ? ["arms", "feet"] : ["arms", "legs", "feet"];
			if (m[3]) parts = [...parts, m[3] === "gagged" ? "mouth" : "eyes"];
			const ghosts = ghostsFor(mat, parts);
			if (m[3] && mat !== "leather" && mat !== "rope" && mat !== "tape") {
				// "cuffed and gagged": a ball gag, not a cuffed mouth.
				const extra = MATERIAL_ASSETS.leather[m[3] === "gagged" ? "mouth" : "eyes"]!;
				if (!ghosts.some((g) => g.group === extra.group)) ghosts.push(extra);
			}
			return ghosts.length ? { kind: "bind", ghosts } : null;
		}
		// "you see yourself with your wrists tied", "…with rope on your ankles".
		const withParts = new RegExp(String.raw`^with ((?:your )?${PART_WORDS}(?:(?:,| and) (?:your )?${PART_WORDS})*) (tied|bound|cuffed|chained|taped)(?: (?:together|up|behind your back))?(?: (?:in|with) (${MATERIAL_WORDS}))?\b`).exec(rest);
		if (withParts) {
			const mat = materialOf(withParts[3]) ?? VERB_MATERIAL[withParts[2]] ?? "rope";
			const ghosts = ghostsFor(mat, partsIn(withParts[1]));
			return ghosts.length ? { kind: "bind", ghosts } : null;
		}
	}
	// "your wrists are bound in rope", "your ankles are cuffed", "your arms and legs are tied".
	const yours = new RegExp(String.raw`\byour (${PART_WORDS}(?:(?:,| and) (?:your )?${PART_WORDS})*) (?:are|is) (?:now |all )?(tied|bound|cuffed|chained|taped)(?: (?:together|up|tight|tightly|behind your back))?(?: (?:in|with) (${MATERIAL_WORDS}))?\b`).exec(line);
	if (yours) {
		const mat = materialOf(yours[3]) ?? VERB_MATERIAL[yours[2]] ?? "rope";
		const ghosts = ghostsFor(mat, partsIn(yours[1]));
		return ghosts.length ? { kind: "bind", ghosts } : null;
	}
	// "you see rope on your wrists", "you see cuffs around your ankles", "you see a gag in your mouth".
	const onYou = new RegExp(String.raw`\byou (?:can |now )?see (?:the |some )?(${MATERIAL_WORDS}) (?:on|around|over|in) (your ${PART_WORDS}(?:(?:,| and) (?:your )?${PART_WORDS})*)\b`).exec(line);
	if (onYou) {
		const mat = materialOf(onYou[1]) ?? "rope";
		const ghosts = ghostsFor(mat, partsIn(onYou[2]));
		return ghosts.length ? { kind: "bind", ghosts } : null;
	}
	// "you are tied up in rope", "you are bound with chains": only with the material, so "you are
	// bound to obey" stays what it was.
	const youAre = new RegExp(String.raw`\byou are (?:now )?(?:tied up|tied|bound|trussed up)(?: tightly| tight)? (?:in|with) (${MATERIAL_WORDS})\b`).exec(line);
	if (youAre) {
		const mat = materialOf(youAre[1]) ?? "rope";
		const ghosts = ghostsFor(mat, ["arms", "legs", "feet"]);
		return ghosts.length ? { kind: "bind", ghosts } : null;
	}
	return null;
}

/** The illusion this line asks for, or null. `content` is the lowercased line (her name may be in it). */
export function matchSeeIllusion(content: string): SeeIllusion | null {
	const line = content.toLowerCase().replace(/[.!?]+$/, "").trim();
	// Not the releases: "you see yourself as you are", "…dressed", "…untied".
	if (/\byou (?:can |will |now )?see yourself (?:again|as you (?:really |actually )?are|properly|clearly|dressed|untied|free|unbound)\b/.test(line)) return null;
	if (/\b(?:not|never|don't|do not|cannot|can't|won't)\b[^,]*\bsee\b/.test(line)) return null;
	const lead = SEE_LEAD.exec(line);
	const rest = lead ? lead[1].trim() : null;
	if (rest !== null) {
		const s = matchStrip(rest);
		if (s) return s;
	}
	const look = LOOK_LEAD.exec(line);
	if (look) {
		const s = matchStrip(look[1].trim());
		if (s) return s;
	}
	return matchBind(line, rest);
}

/** Ending one kind only (v1.22.1): "the ropes are gone" (bind), "you see yourself dressed" (strip).
 * The words that end both ("you can see yourself again", "look at yourself") are the table's. */
export function matchSeeRelease(content: string): "strip" | "bind" | null {
	const line = content.toLowerCase();
	if (/\bthe (?:ropes?|cuffs|chains|tape|gag|blindfold|bonds|bindings|restraints) (?:is|are) gone\b/.test(line)) return "bind";
	if (/\byou (?:can |now )?see yourself (?:untied|unbound|free|ungagged)\b/.test(line)) return "bind";
	if (/\byou (?:see|notice|realise|realize) (?:that )?you are (?:not tied|untied|not bound|unbound|free)\b/.test(line)) return "bind";
	if (/\byou (?:can |now )?see yourself (?:dressed|clothed)(?: again)?\b/.test(line)) return "strip";
	if (/\byou (?:see|notice|realise|realize) (?:that )?you are (?:not naked|dressed|clothed)\b/.test(line)) return "strip";
	if (/\byour clothes are back\b/.test(line)) return "strip";
	return null;
}

/** A trigger action: "see:naked", "see:off:Bra+Panties", "see:bound:ItemArms/HempRope+ItemFeet/HempRope". */
export function seeActionId(s: SeeIllusion): string {
	if (s.kind === "strip") return s.slots === "all" ? `${SEE_PREFIX}naked` : `${SEE_PREFIX}off:${s.slots.join("+")}`;
	const rec = (g: Ghost) => (g.record && Object.keys(g.record).length ? `~${Object.entries(g.record).map(([k, v]) => `${k}=${v}`).join(",")}` : "");
	return `${SEE_PREFIX}bound:${s.ghosts.map((g) => `${g.group}/${g.asset}${rec(g)}`).join("+")}`;
}

export function parseSeeId(id: string): SeeIllusion | null {
	if (!id.startsWith(SEE_PREFIX)) return null;
	const body = id.slice(SEE_PREFIX.length);
	if (body === "naked") return { kind: "strip", slots: "all" };
	if (body.startsWith("off:")) {
		const slots = body.slice(4).split("+").filter((s) => /^\w+$/.test(s));
		return slots.length ? { kind: "strip", slots } : null;
	}
	if (body.startsWith("bound:")) {
		const ghosts = body
			.slice(6)
			.split("+")
			.map((p): Ghost | null => {
				const [main, rec] = p.split("~");
				const [group, asset] = main.split("/");
				if (!group || !asset || !/^Item\w+$/.test(group) || !/^\w+$/.test(asset)) return null;
				const record: Record<string, number> = {};
				for (const kv of (rec ?? "").split(",")) {
					const m = /^(\w+)=(\d{1,3})$/.exec(kv);
					if (m) record[m[1]] = Number(m[2]);
				}
				return Object.keys(record).length ? { group, asset, record } : { group, asset };
			})
			.filter((g): g is Ghost => !!g);
		return ghosts.length ? { kind: "bind", ghosts } : null;
	}
	return null;
}

const SLOT_WORDS: Record<string, string> = {
	ClothOuter: "jacket", Cloth: "top", ClothAccessory: "top", Suit: "bodysuit", Corset: "corset", ClothLower: "skirt", SuitLower: "bodysuit",
	Bra: "bra", Panties: "panties", Garters: "garters", Shoes: "shoes", Socks: "socks", SocksLeft: "socks", SocksRight: "socks", Gloves: "gloves",
};
const GROUP_WORDS: Record<string, string> = { ItemArms: "arms", ItemLegs: "legs", ItemFeet: "ankles", ItemTorso: "body", ItemMouth: "mouth", ItemHead: "eyes", ItemHands: "hands" };
const ASSET_WORDS: Record<string, string> = {
	HempRope: "rope", HempRopeHarness: "rope", MetalCuffs: "cuffs", LeatherLegCuffs: "cuffs", SteelAnkleCuffs: "cuffs", Chains: "chains", DuctTape: "tape",
	BallGag: "a gag", ClothGag: "a cloth gag", LeatherBlindfold: "a blindfold", ClothBlindfold: "a cloth blindfold",
};

/** For the lists: "you see yourself naked", "you see yourself without your bra", "you see rope on your arms and ankles". */
export function describeSee(s: SeeIllusion): string {
	if (s.kind === "strip") {
		if (s.slots === "all") return "you see yourself naked";
		const words = [...new Set(s.slots.map((x) => SLOT_WORDS[x] ?? x))];
		return `you see yourself without your ${words.join(", ")}`;
	}
	const byAsset = new Map<string, string[]>();
	for (const g of s.ghosts) {
		// A picked item (v1.23.0) by BC's own name for it; the spoken ones by their plain word.
		let w = ASSET_WORDS[g.asset];
		if (!w || g.record) {
			let desc = "";
			try {
				const a = typeof AssetGet === "function" ? AssetGet((typeof Player !== "undefined" && Player?.AssetFamily) || "Female3DCG", g.group, g.asset) : null;
				if (typeof a?.Description === "string" && !a.Description.startsWith("MISSING")) desc = a.Description;
			} catch {
				// no BC here (the suites' pure checks)
			}
			w = desc || w || g.asset.replace(/([a-z])([A-Z])/g, "$1 $2");
		}
		byAsset.set(w, [...(byAsset.get(w) ?? []), GROUP_WORDS[g.group] ?? g.group.replace(/^Item/, "").toLowerCase()]);
	}
	return `you see ${[...byAsset].map(([w, parts]) => `${w} on your ${parts.join(" and ")}`).join(", ")}`;
}

/** What she reads as it takes hold. */
export function seeLine(s: SeeIllusion): string {
	if (s.kind === "strip") return s.slots === "all" ? "You glance down at yourself, and there is nothing on you at all." : `You glance down: ${describeSee(s).replace(/^you see yourself /, "you're ")}.`;
	return `You look down and ${describeSee(s).replace(/^you see /, "see ")}, holding you.`;
}
