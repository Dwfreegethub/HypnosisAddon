// Clothing compulsions (v1.18.0, DW 2026-11-26): "whenever anyone undresses you", "whenever you take
// your top off", "whenever anyone puts a bra on you". This hears her clothes changing and hands each
// garment that came off or went on to voice.ts noteActivity as a clothing event (compulsion-acts.ts
// clothEvent), the way the item handler hands over a gag.
//
// Checked against the live R134 client (2026-11-26):
//   - Nobody can take one garment off someone else through the item menu: Dialog.js only focuses
//     "Item" groups. Other people change her clothes in the wardrobe (ChatRoom.js
//     ChatRoomAppearanceLoadCharacter), which sends her whole appearance (ChatRoomCharacterUpdate)
//     and then one "ChangeClothes" line that says nothing about what changed.
//   - That appearance reaches her as ChatRoomSyncSingle (or ChatRoomSyncCharacter), carrying
//     SourceMemberNumber: who did it. So the outfit is read just before and just after BC applies it,
//     and compared. Another add-on's single-item change arrives as ChatRoomSyncItem with `Source`.
//   - Her own changes go out through ChatRoomCharacterUpdate(Player) (the wardrobe, ECHS's own
//     strip, other add-ons), compared against what was last seen. Those count as hers: DW, "It would
//     not matter who took the clothing on or off me. Unless the hypnotist says something specific".
//     ECHS's commanded strip goes out the same way, but only happens while she is under, when
//     compulsions don't fire; a wake compulsion that strips her ("when you open your eyes, take
//     your top off") does count, as her taking it off.
//   - Room joins and anything outside a room are taken as they are, never as a change.
//
// Read only: never changes what she wears (rule 3 is the illusion's; this never touches Appearance).

import { log, warn } from "./log";
import { slotOf } from "./undress";
import { clothEvent } from "./compulsion-acts";
import { noteActivity } from "./voice";

/** Worn garment groups and the asset in each: only the slots strip and the clothing acts know. */
export type Outfit = Record<string, string>;

export function outfitOf(appearance: unknown): Outfit {
	const out: Outfit = {};
	if (!Array.isArray(appearance)) return out;
	for (const item of appearance) {
		const group: unknown = item?.Asset?.Group?.Name;
		if (typeof group !== "string" || !slotOf(group)) continue;
		out[group] = String(item?.Asset?.Name ?? "");
	}
	return out;
}

/** What changed, as clothing events: everything that came off, then everything that went on. A
 * garment swapped for another in the same slot went on (a new top), and did not come off. Pure;
 * exported for the tests. */
export function outfitChanges(before: Outfit, after: Outfit): string[] {
	const off: string[] = [];
	const on: string[] = [];
	for (const group of Object.keys(before)) if (!(group in after)) off.push(clothEvent("off", slotOf(group) ?? group, group));
	for (const group of Object.keys(after)) if (before[group] !== after[group]) on.push(clothEvent("on", slotOf(group) ?? group, group));
	return [...off, ...on];
}

let seen: Outfit | null = null;

function inRoom(): boolean {
	return typeof ServerPlayerIsInChatRoom === "function" && !!ServerPlayerIsInChatRoom();
}

/** Compare her outfit now with what was last seen and pass on the changes as done by `by`; null
 * takes it as it is. Exported for the tests. */
export function settleOutfit(by: number | null): string[] {
	const now = outfitOf(Player?.Appearance);
	const before = seen;
	seen = now;
	if (before == null || by == null || !inRoom()) return [];
	const events = outfitChanges(before, now);
	if (!events.length) return [];
	log(`outfit: ${events.join(", ")} by ${by}`);
	for (const e of events) noteActivity(by, e);
	return events;
}

/** For the tests: forget what was seen. */
export function resetOutfitWatch(): void {
	seen = null;
}

const isMe = (n: unknown) => typeof n === "number" && n === Player?.MemberNumber;

/** Around BC applying someone's change to her: anything of hers not yet seen first, then theirs. */
function around(source: unknown, apply: () => any): any {
	try {
		settleOutfit(Player?.MemberNumber ?? null);
	} catch (err) {
		warn("outfit watch failed:", err);
	}
	const result = apply();
	try {
		settleOutfit(typeof source === "number" && !isMe(source) ? source : null);
	} catch (err) {
		warn("outfit watch failed:", err);
	}
	return result;
}

export function installOutfitWatch(modApi: any): void {
	// Before login there is no outfit yet: the first look then takes it as it is.
	seen = Array.isArray(Player?.Appearance) && Player.Appearance.length ? outfitOf(Player.Appearance) : null;
	const onSync = (args: any[], next: (a: any[]) => any) => {
		const data = args[0];
		if (!isMe(data?.Character?.MemberNumber)) return next(args);
		return around(data?.SourceMemberNumber, () => next(args));
	};
	modApi.hookFunction("ChatRoomSyncSingle", 0, onSync);
	modApi.hookFunction("ChatRoomSyncCharacter", 0, onSync);
	modApi.hookFunction("ChatRoomSyncItem", 0, (args: any[], next: (a: any[]) => any) => {
		const data = args[0];
		if (!isMe(data?.Item?.Target)) return next(args);
		return around(data?.Source, () => next(args));
	});
	// Her own changes, on their way out.
	const own = (args: any[], next: (a: any[]) => any) => {
		const C = args[0];
		if (C === Player || C?.IsPlayer?.()) {
			try {
				settleOutfit(Player?.MemberNumber ?? null);
			} catch (err) {
				warn("outfit watch failed:", err);
			}
		}
		return next(args);
	};
	modApi.hookFunction("ChatRoomCharacterUpdate", 0, own);
	modApi.hookFunction("ChatRoomCharacterItemUpdate", 0, own);
	// A room (re)joined: her appearance comes back from the server as it is.
	modApi.hookFunction("ChatRoomSync", 0, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		Promise.resolve(result)
			.then(() => settleOutfit(null))
			.catch(() => {});
		return result;
	});
}
