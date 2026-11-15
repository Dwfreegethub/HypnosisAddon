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
// Spiral eyes hide her eye shadow while they show (v1.10.1, DW: "clear eye shadow setting for
// spirals and turn it back on when done"): the shadow sits over the eye and muddies the spiral.
// By opacity where BC allows it, so the item never leaves her: R133 CommonDraw reads
// Property.Opacity and clamps it to each LAYER's minimum. v1.10.2: that minimum is not always 0.
// Wings' "Line" layer has MinOpacity 0.8, which R133's own comment says is there to "turn off"
// opacity control for it, so DW saw Wings stay. A shadow like that is taken off instead, with the
// whole item kept in her settings (colour, properties, crafted name and description, difficulty)
// and put back exactly as it was. Both put back only if still as we left them.
const SHADOW_GROUP = "EyeShadow";
const HIDES_SHADOW = "Dizzy";

function eyeItem(group: string): any {
	return typeof InventoryGet === "function" && typeof Player === "object" ? InventoryGet(Player, group) : null;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function colourFor(item: any, hex: string): string[] {
	const layers = Math.max(1, Number(item?.Asset?.ColorableLayerCount) || 1);
	return Array(layers).fill(hex);
}

const clone = <T>(v: T): T => (v == null ? v : JSON.parse(JSON.stringify(v)));

/** Can BC draw every layer of this shadow fully transparent? (R133 CommonDraw clamps the opacity to
 * each layer's MinOpacity.) */
function canFadeOut(item: any): boolean {
	const layers: any[] = Array.isArray(item?.Asset?.Layer) ? item.Asset.Layer : [];
	const assetMin = Number(item?.Asset?.MinOpacity ?? 0) || 0;
	if (!layers.length) return assetMin <= 0;
	return layers.every((l) => (Number(l?.MinOpacity ?? assetMin) || 0) <= 0);
}

/** Put a taken-off shadow back exactly as it was. As BC's own appearance loading does it: the item
 * from its asset, then its saved fields over the top. */
function putBackShadow(was: { name: string; color: unknown; property: unknown; craft: unknown; difficulty: unknown }): boolean {
	if (typeof AssetGet !== "function" || typeof CharacterAppearanceSetItem !== "function") return false;
	const asset = AssetGet(Player.AssetFamily ?? "Female3DCG", SHADOW_GROUP, was.name);
	if (!asset) {
		warn(`trance eyes: could not find the eye shadow "${was.name}" to put back`);
		return false;
	}
	const item = CharacterAppearanceSetItem(Player, SHADOW_GROUP, asset, clone(was.color) as any);
	if (!item) return false;
	if (was.property != null) item.Property = clone(was.property);
	if (was.craft != null) item.Craft = clone(was.craft);
	if (typeof was.difficulty === "number") item.Difficulty = was.difficulty;
	return true;
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
	const shadow = expression === HIDES_SHADOW ? eyeItem(SHADOW_GROUP) : null;
	const fades = shadow ? canFadeOut(shadow) : false;
	if (shadow && fades) saved.shadow = { opacity: shadow.Property?.Opacity ?? null };
	else if (shadow) {
		saved.shadow = {
			removed: {
				name: shadow.Asset?.Name,
				color: clone(shadow.Color ?? null),
				property: clone(shadow.Property ?? null),
				craft: clone(shadow.Craft ?? null),
				difficulty: shadow.Difficulty ?? null,
			},
		};
	}
	// Saved before anything is touched, so a crash part-way still knows what to put back.
	setEyesSaved(saved);
	try {
		if (expression && typeof CharacterSetFacialExpression === "function") CharacterSetFacialExpression(Player, "Eyes", expression);
		if (colour) for (let i = 0; i < EYE_GROUPS.length; i++) if (items[i]) items[i].Color = saved.eyes[EYE_GROUPS[i]]!.setColor;
		if (shadow && fades) {
			if (!shadow.Property) shadow.Property = {};
			shadow.Property.Opacity = 0;
		} else if (shadow && typeof InventoryRemove === "function") {
			InventoryRemove(Player, SHADOW_GROUP, false);
		}
		sync();
	} catch (err) {
		warn("trance eyes: could not change them", err);
	}
	const what = [expression && `${expression} eyes`, colour && `colour ${colour}`, shadow && (fades ? "eye shadow faded out" : "eye shadow taken off")].filter(Boolean).join(", ");
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
		const shadow = saved.shadow ? eyeItem(SHADOW_GROUP) : null;
		const removed = saved.shadow?.removed;
		if (removed) {
			// Only into an empty slot: if she put a shadow on meanwhile, that one is hers.
			if (!shadow && putBackShadow(removed)) changed = true;
		} else if (shadow && shadow.Property?.Opacity === 0) {
			if (saved.shadow!.opacity === null || saved.shadow!.opacity === undefined) delete shadow.Property.Opacity;
			else shadow.Property.Opacity = saved.shadow!.opacity;
			changed = true;
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
