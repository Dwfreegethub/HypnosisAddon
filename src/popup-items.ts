// The bondage picker (v1.23.0, DW 2026-11-26: "Now we have to figure out how to build all the bondage
// and options. Most items have several options in them"). Any BC item in any item slot, with its
// options, for a bondage illusion (see.ts) only she sees. DW chose the delivery: the popup types a
// line ("Missy, you see a Leather Armbinder on you") and, when it is sent, her ECHS gets the exact
// item and options privately (a "see-item" hidden message), so it is exact, and works when the two of
// them play BC in different languages.
//
// Read from BC's own tables on the hypnotist's client (live R134): Asset (Group.Category "Item",
// Visible), TypedItemDataLookup[group+asset].options (each option's Property.TypeRecord, e.g.
// { typed: 2 }), ModularItemDataLookup[group+asset].modules (each module's Options, TypeRecord
// { [module.Key]: i }). The record goes in the action id after "~" (see.ts), and her client applies
// it with ExtendedItemSetOptionByRecord on the shadow.

import { seeActionId, type Ghost } from "./see";

/** BC's script item and the hidden ones are not things to see yourself in. */
const SKIP_GROUPS = new Set(["ItemScript", "ItemHidden"]);

export type PickSlot = { group: string; label: string };
export type PickItem = { asset: string; label: string };
/** One choice to make: a typed item's options, or one module of a modular item. */
export type PickChoice = { key: string; label: string; options: { label: string; record: Record<string, number> }[] };

function family(): string {
	return (typeof Player !== "undefined" && Player?.AssetFamily) || "Female3DCG";
}

function assets(): any[] {
	return typeof Asset !== "undefined" && Array.isArray(Asset) ? Asset : [];
}

/** The item slots, in BC's order, by their own names. */
export function pickSlots(): PickSlot[] {
	const seen = new Map<string, PickSlot>();
	for (const a of assets()) {
		const g = a?.Group;
		if (!g || g.Category !== "Item" || g.Family !== family() || SKIP_GROUPS.has(g.Name) || seen.has(g.Name)) continue;
		seen.set(g.Name, { group: g.Name, label: typeof g.Description === "string" && !g.Description.startsWith("MISSING") ? g.Description : g.Name.replace(/^Item/, "") });
	}
	return [...seen.values()];
}

/** The items in a slot, by name, A to Z. `filter` narrows by a word in the name. */
export function pickItems(group: string, filter = ""): PickItem[] {
	const f = filter.trim().toLowerCase();
	return assets()
		.filter((a) => a?.Group?.Name === group && a?.Group?.Family === family() && a.Visible !== false)
		.map((a) => ({ asset: a.Name as string, label: (typeof a.Description === "string" && !a.Description.startsWith("MISSING") ? a.Description : a.Name) as string }))
		.filter((i) => !f || i.label.toLowerCase().includes(f) || i.asset.toLowerCase().includes(f))
		.sort((x, y) => x.label.localeCompare(y.label));
}

const pretty = (name: string) => String(name).replace(/([a-z])([A-Z])/g, "$1 $2");

/** The choices this item has. Empty: it has no options (or ones the picker doesn't offer, such as a
 * vibrator's modes: it is drawn in its first). */
export function pickChoices(group: string, asset: string): PickChoice[] {
	const key = `${group}${asset}`;
	const modular = typeof ModularItemDataLookup !== "undefined" ? ModularItemDataLookup?.[key] : undefined;
	if (modular && Array.isArray(modular.modules)) {
		return modular.modules
			.filter((m: any) => Array.isArray(m?.Options) && m.Options.length > 1)
			.map((m: any) => ({
				key: String(m.Key ?? m.Name),
				label: pretty(m.Name ?? m.Key),
				options: m.Options.map((o: any, i: number) => ({ label: pretty(o.Name ?? `${m.Name} ${i}`), record: o?.Property?.TypeRecord ?? { [m.Key]: i } })),
			}));
	}
	const typed = typeof TypedItemDataLookup !== "undefined" ? TypedItemDataLookup?.[key] : undefined;
	if (typed && Array.isArray(typed.options) && typed.options.length > 1) {
		return [{ key: "typed", label: "Option", options: typed.options.map((o: any, i: number) => ({ label: pretty(o.Name ?? String(i)), record: o?.Property?.TypeRecord ?? { typed: i } })) }];
	}
	return [];
}

/** The action id for what was picked: the item and the chosen option of each choice. */
export function pickActionId(group: string, asset: string, chosen: Record<string, number>, choices = pickChoices(group, asset)): string {
	const record: Record<string, number> = {};
	for (const c of choices) {
		const o = c.options[chosen[c.key] ?? 0];
		if (o) Object.assign(record, o.record);
	}
	const ghost: Ghost = Object.keys(record).length ? { group, asset, record } : { group, asset };
	return seeActionId({ kind: "bind", ghosts: [ghost] });
}

/** The line typed for the room: "you see a Leather Armbinder on you". Read by nothing on her side
 * (the hidden message carries the item); worded so no other suggestion takes it. */
export function pickLine(label: string): string {
	const l = label.trim();
	const article = /s$/i.test(l) ? "" : /^[aeiou]/i.test(l) ? "an " : "a ";
	return `you see ${article}${l} on you`;
}

// --- sending -------------------------------------------------------------------------------------
// The line is typed; the item goes when the hypnotist presses Enter on it. Held here until then.

let pending: { line: string; id: string; to: number; at: number } | null = null;
export const PENDING_MS = 5 * 60_000;

export function setPendingPick(line: string, id: string, to: number, now: number = Date.now()): void {
	pending = { line, id, to, at: now };
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** The chat line being sent: if it is the typed pick, what to send her, once. */
export function takePendingFor(content: unknown, now: number = Date.now()): { id: string; to: number } | null {
	if (!pending || typeof content !== "string") return null;
	if (now - pending.at > PENDING_MS) {
		pending = null;
		return null;
	}
	if (!squash(content).includes(squash(pending.line))) return null;
	const out = { id: pending.id, to: pending.to };
	pending = null;
	return out;
}
