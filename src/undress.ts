import { log, warn } from "./log";
import { heldByUs } from "./effects";

// "Take your dress off" — the design doc's Tier 1 *Remove clothes*, which it describes as a
// "triggered compulsion to remove items — gradual, one piece at a time".
//
// THE OPPOSITE OF illusion.ts, and worth stating plainly because the two sit next to each
// other conceptually. The illusion must NEVER touch `Player.Appearance`, because that array
// syncs to the whole room and a lie written there is broadcast. This feature must touch it,
// for exactly the same reason: undressing is a real change everyone is supposed to see.
//
// Verified against the live R131 client:
//   InventoryRemove(C, groupName, refresh)  Scripts/Inventory.js — removes the item in that
//     group and cascades RemoveItemOnRemove, so a dress that owns a sub-item takes it along
//     rather than leaving an orphan behind.
//   InventoryGet(C, groupName)              returns the worn item or null.
//   Player.CanInteract()                    Scripts/Character.js — `!HasEffect("Block")`.
//     This is the hands-are-bound check, which the doc's "physically impossible actions"
//     list asks for: someone in a straitjacket cannot take their own shirt off.

/** The primary clothing slots, outermost first.
 *
 * Deliberately a short curated list rather than everything with `Group.Clothing === true`,
 * which is 32 groups and includes hats, glasses, jewelry and wings. Taken from the
 * SlaveParking bot's `HANDLER_UNDRESS_ORDER`, on DW's pointer — it is the same question
 * answered once already in this workspace, and being consistent with it is worth more than
 * a second opinion. Widening this later is one array.
 *
 * v1.2.1 (DW 2026-11-02, Eri's "strip misses outerwear and the upper suit"): checked against the
 * live R133 Female3DCG.js. "SuitTop" was never a BC group. The slot is "Suit", so undershirts and
 * bodysuits were never removed at all. Added BC's ClothOuter (jackets, hoodies), ClothAccessory,
 * Corset, Garters and the one-sided socks. Shoes now come off before socks. Still not hats,
 * glasses, jewellery, wings and the like. */
const UNDRESS_ORDER = [
	"ClothOuter",
	"Cloth",
	"ClothAccessory",
	"ClothLower",
	"Suit",
	"SuitLower",
	"Corset",
	"Bra",
	"Panties",
	"Garters",
	"Shoes",
	"Socks",
	"SocksLeft",
	"SocksRight",
	"Gloves",
] as const;

/** Echo's clothing add-on (SugarChain-Studio/echo-clothing-ext, src/components/功能调整/复制身体区域.js)
 * adds copies of BC's slots so two tops or two skirts can be worn at once: "Cloth_笨笨蛋Luzi"
 * ("Cloth 2"), "Cloth_笨笨笨蛋Luzi2" ("Cloth 3"), "Bra_笨笨蛋Luzi" and so on. A copy is always
 * named `<BC group>_<suffix>`, so any worn group whose prefix is a slot above counts as that slot
 * and comes off right after it. Copies of slots we leave alone (Necklace_, Hat_, Mask_...) are
 * still left alone. Its one new clothing slot that is not a copy, long sleeves, goes with the top. */
const ECHO_EXTRA_SLOTS: Record<string, string> = { 长袖子_Luzi: "Cloth" };

/** Which slot in UNDRESS_ORDER a worn group belongs to, or null if strip leaves it alone. */
function slotOf(group: string): string | null {
	if ((UNDRESS_ORDER as readonly string[]).includes(group)) return group;
	if (ECHO_EXTRA_SLOTS[group]) return ECHO_EXTRA_SLOTS[group];
	const cut = group.indexOf("_");
	if (cut > 0) {
		const base = group.slice(0, cut);
		if ((UNDRESS_ORDER as readonly string[]).includes(base)) return base;
	}
	return null;
}

/** Why undressing cannot happen, or null if it can. A reason string rather than a boolean so
 * the caller can say WHICH obstacle stopped it — the same rule the rest of the codebase
 * follows about silent rejections being bugs in their own right. */
export function undressBlockedReason(): string | null {
	if (typeof InventoryRemove !== "function" || !Array.isArray(Player?.Appearance)) {
		return "unavailable";
	}
	// Hands bound. BC's own effect, not ours — a real straitjacket, and nothing we did.
	if (Player?.CanInteract?.() === false) return "bound";
	// OUR OWN FREEZE, reported as itself rather than as somebody else's lock.
	//
	// Verified in the live client — Character.js:
	//     IsRestrained: () => HasEffect("Freeze") || HasEffect("Block") || HasEffect("BlockWardrobe")
	//     CanChangeClothesOn: (C) => !C.IsRestrained() && !ManagementIsClubSlave() && ...
	// so our Freeze makes CanChangeOwnClothes() false, and the check below then blamed a
	// locked outfit that does not exist. In play that reads as the add-on breaking: a subject
	// with "Cannot Move During Trance" ticked is frozen the moment she goes under, so every
	// undress command for the whole session answered "something else has that decision" —
	// naming an obstacle nobody could find.
	//
	// Refused either way; being frozen really should stop you undressing. What changes is that
	// it says so. Same answer selftouch-frozen already gives for the same situation.
	if (heldByUs("Freeze")) return "frozen";
	// A locked outfit, an owner rule, or a chastity item. Deliberately NOT triggered by our
	// OWN wardrobe block: if this hypnotist told her she cannot open her wardrobe and then
	// told her to strip, the second instruction is theirs to give and theirs to contradict.
	// Narrating somebody's actual locked outfit as hypnosis would be wrong and confusing —
	// the same distinction the wardrobe-attempt message already draws in v0.34.0.
	if (Player?.CanChangeOwnClothes?.() === false && !heldByUs("BlockWardrobe")) {
		return "locked";
	}
	return null;
}

/** What she is currently wearing, from the outside in. */
export function wornGarments(): string[] {
	// Read off what is actually worn rather than asking InventoryGet slot by slot: Echo's copied
	// slots are not in any list we could keep, and the worn items are the one place they all show.
	const order = UNDRESS_ORDER as readonly string[];
	const seen = new Set<string>();
	const worn: { group: string; rank: number; copy: boolean }[] = [];
	for (const item of Array.isArray(Player?.Appearance) ? Player.Appearance : []) {
		const group: unknown = item?.Asset?.Group?.Name;
		if (typeof group !== "string" || seen.has(group)) continue;
		const slot = slotOf(group);
		if (!slot) continue;
		seen.add(group);
		worn.push({ group, rank: order.indexOf(slot), copy: slot !== group });
	}
	// BC's own slot before Echo's copies of it; copies in the order they are worn.
	return worn.sort((a, b) => a.rank - b.rank || Number(a.copy) - Number(b.copy)).map((w) => w.group);
}

/** A human word for a slot, for the flavor text. BC's own group names are not sayable —
 * "your ClothLower" is nobody's idea of hypnosis. */
const GARMENT_WORDS: Record<string, string> = {
	ClothOuter: "jacket",
	Cloth: "top",
	ClothAccessory: "accessories",
	ClothLower: "skirt",
	Suit: "undershirt",
	SuitLower: "leggings",
	Corset: "corset",
	Bra: "bra",
	Panties: "panties",
	Garters: "garters",
	Socks: "socks",
	SocksLeft: "sock",
	SocksRight: "sock",
	Shoes: "shoes",
	Gloves: "gloves",
	长袖子_Luzi: "sleeves",
};

export function garmentWord(group: string): string {
	return GARMENT_WORDS[group] ?? GARMENT_WORDS[slotOf(group) ?? ""] ?? "clothes";
}

export interface UndressResult {
	/** Groups actually removed, outermost first. */
	removed: string[];
	/** Set when nothing was removed and there is a reason worth reporting. */
	refusal?: "bound" | "locked" | "frozen" | "unavailable" | "already bare";
}

/** Take off `count` garments, outermost first. `count` of Infinity strips the lot.
 *
 * One at a time is the doc's wording and the better mechanic: the hypnotist says it again to
 * take the next piece, so undressing is paced by the scene rather than resolved in one line. */
export function undress(count: number): UndressResult {
	const blocked = undressBlockedReason();
	if (blocked) return { removed: [], refusal: blocked as UndressResult["refusal"] };

	const worn = wornGarments();
	if (!worn.length) return { removed: [], refusal: "already bare" };

	const removed: string[] = [];
	for (const group of worn.slice(0, count)) {
		try {
			// refresh=false while looping; one refresh at the end is enough and avoids
			// rebuilding the canvas once per garment.
			InventoryRemove(Player, group, false);
			removed.push(group);
		} catch (err) {
			warn(`could not remove ${group}:`, err);
		}
	}
	if (!removed.length) return { removed: [], refusal: "unavailable" };

	// Push to the server. Unlike every other effect in this add-on, this one is MEANT to be
	// seen by the room — undressing that only you can see is the clothing illusion, which is
	// a different feature with its own permission and a much higher trust bar.
	try {
		CharacterRefresh(Player, true, false);
		if (ServerPlayerIsInChatRoom()) ChatRoomCharacterUpdate(Player);
	} catch (err) {
		warn("could not sync appearance after undressing:", err);
	}
	log(`undressed: ${removed.join(", ")}`);
	return { removed };
}
