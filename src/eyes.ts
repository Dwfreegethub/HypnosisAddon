import { log, warn } from "./log";
import { getTranceEyes, getTranceEyeColor, getEyesSaved, setEyesSaved, EyesSaved } from "./storage";

// Her eyes while she is under (v1.10.0, DW 2026-11-08: "see how LSCG changes the eyes when you are
// hypnotized and see if we can do similar"). Her choice, off by default, and the whole room sees it.
//
// Technique reference only (rule 7): LSCG's hypnotized face. It swaps the eye items' asset for
// another eye type, recolours them grey, sets the Dazed expression, and keeps her old eyes in its
// settings to put back. Nothing of its code. Here: BC's own eye EXPRESSIONS (R133 Female3DCG Eyes
// AllowExpression: Dazed, Dizzy, Daydream, Heart, HeartPink), set through BC's own
// CharacterSetFacialExpression, which covers both eyes and keeps BC's expression queue straight;
// and, if she picks one, a COLOUR. No asset swap.
//
// The colour is the part that lasts: it is written to her real eye items, which BC saves with her
// character. DW chose it knowing that (2026-11-08). So what was there before is saved in her
// settings FIRST, put back on every way out of a trance, and put back on the next load if the game
// went down mid-trance (recovery.ts). Put back only where it is still what we set: if she, or
// another add-on, changed her eyes during the trance, that change is hers and is left alone.

const EYE_GROUPS = ["Eyes", "Eyes2"] as const;

function eyeItem(group: string): any {
	return typeof InventoryGet === "function" && typeof Player === "object" ? InventoryGet(Player, group) : null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function colourFor(item: any, hex: string): string[] {
	const layers = Math.max(1, Number(item?.Asset?.ColorableLayerCount) || 1);
	return Array(layers).fill(hex);
}

function sync(): void {
	if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false, false);
	if (typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom() && typeof ChatRoomCharacterUpdate === "function") {
		ChatRoomCharacterUpdate(Player);
	}
}

/** Going under: her chosen eyes, if she chose any. Saved first. Returns what was changed. */
export function applyTranceEyes(): string {
	const expression = getTranceEyes();
	const colour = getTranceEyeColor();
	if (!expression && !colour) return "";
	if (getEyesSaved()) return ""; // already applied, this trance or one that never got undone
	const items = EYE_GROUPS.map(eyeItem);
	if (!items[0]) {
		warn("trance eyes: no eyes found on her character, so nothing was changed");
		return "";
	}
	const saved: EyesSaved = { at: Date.now(), eyes: {} };
	for (let i = 0; i < EYE_GROUPS.length; i++) {
		const item = items[i];
		if (!item) continue;
		saved.eyes[EYE_GROUPS[i]] = {
			color: item.Color ?? null,
			expression: item.Property?.Expression ?? null,
			setColor: colour ? colourFor(item, colour) : undefined,
			setExpression: expression || undefined,
		};
	}
	// Saved before anything is touched, so a crash part-way still knows what to put back.
	setEyesSaved(saved);
	try {
		if (expression && typeof CharacterSetFacialExpression === "function") CharacterSetFacialExpression(Player, "Eyes", expression);
		if (colour) for (let i = 0; i < EYE_GROUPS.length; i++) if (items[i]) items[i].Color = saved.eyes[EYE_GROUPS[i]]!.setColor;
		sync();
	} catch (err) {
		warn("trance eyes: could not change them", err);
	}
	const what = [expression && `${expression} eyes`, colour && `colour ${colour}`].filter(Boolean).join(", ");
	log(`trance eyes: ${what}`);
	return what;
}

/** Coming out, by any way, or found stranded at load: put back what is still ours to put back. */
export function restoreTranceEyes(): boolean {
	const saved = getEyesSaved();
	if (!saved) return false;
	let changed = false;
	try {
		for (const group of EYE_GROUPS) {
			const was = saved.eyes[group];
			const item = eyeItem(group);
			if (!was || !item) continue;
			if (was.setColor && same(item.Color, was.setColor)) {
				item.Color = was.color ?? "Default";
				changed = true;
			}
			if (was.setExpression && (item.Property?.Expression ?? null) === was.setExpression) {
				if (!item.Property) item.Property = {};
				item.Property.Expression = was.expression ?? null;
				changed = true;
			}
		}
		if (changed) sync();
	} catch (err) {
		warn("trance eyes: could not put them back", err);
	}
	// Cleared either way: anything not put back was changed by her or another add-on meanwhile.
	setEyesSaved(undefined);
	log(`trance eyes: ${changed ? "put back as they were" : "left as they are now (changed during the trance)"}`);
	return changed;
}
