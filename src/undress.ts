import { log, warn } from "./log";
import { hasOwnEffect } from "./effects";

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
 * a second opinion. Widening this later is one array. */
const UNDRESS_ORDER = [
	"Cloth",
	"ClothLower",
	"SuitTop",
	"SuitLower",
	"Bra",
	"Panties",
	"Socks",
	"Shoes",
	"Gloves",
] as const;

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
	if (hasOwnEffect("Freeze")) return "frozen";
	// A locked outfit, an owner rule, or a chastity item. Deliberately NOT triggered by our
	// OWN wardrobe block: if this hypnotist told her she cannot open her wardrobe and then
	// told her to strip, the second instruction is theirs to give and theirs to contradict.
	// Narrating somebody's actual locked outfit as hypnosis would be wrong and confusing —
	// the same distinction the wardrobe-attempt message already draws in v0.34.0.
	if (Player?.CanChangeOwnClothes?.() === false && !hasOwnEffect("BlockWardrobe")) {
		return "locked";
	}
	return null;
}

/** What she is currently wearing, from the outside in. */
export function wornGarments(): string[] {
	return UNDRESS_ORDER.filter((g) => {
		try {
			return !!InventoryGet(Player, g);
		} catch {
			return false;
		}
	});
}

/** A human word for a slot, for the flavor text. BC's own group names are not sayable —
 * "your ClothLower" is nobody's idea of hypnosis. */
const GARMENT_WORDS: Record<string, string> = {
	Cloth: "top",
	ClothLower: "skirt",
	SuitTop: "undershirt",
	SuitLower: "leggings",
	Bra: "bra",
	Panties: "panties",
	Socks: "socks",
	Shoes: "shoes",
	Gloves: "gloves",
};

export function garmentWord(group: string): string {
	return GARMENT_WORDS[group] ?? "clothes";
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
