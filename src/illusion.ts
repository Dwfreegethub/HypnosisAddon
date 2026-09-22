import { log } from "./log";

// The clothing illusion: a freeze-frame of how the subject looked when it was applied,
// drawn only on their own screen.
//
// THE RULE THIS IS BUILT AROUND: never touch `Player.Appearance`. That array is what
// `ServerAppearanceBundle` reads for every sync, so a lie written there goes out to the
// whole room — the exact inverse of the feature. The lie lives in a separate, local-only
// character that nothing syncs, and the real Player object is never modified.
//
// How it works, verified against the live client:
//
//   DrawCharacter(C, X, Y, Zoom, ...) in Scripts/Drawing.js is the single funnel every
//   screen uses to draw a body. It renders from `C.Canvas` / `C.CanvasBlink`, offscreen
//   canvases built by CharacterLoadCanvas(C) from `C.Appearance`. So substituting the
//   character passed to it substitutes the pixels, and nothing else.
//
//   In the chat room (ChatRoomCharacterView.js) the body, the status bubble and the
//   name/arousal overlay are three separate calls:
//       DrawCharacter(drawlist[i], ...); DrawStatus(...); ChatRoomCharacterViewDrawOverlay(...)
//   so swapping inside DrawCharacter changes the body and leaves the arousal meter and
//   click targeting reading from the real character. NOT the nametag, it turned out — see
//   the name fields lent to the shadow in installIllusion.

const SHADOW_ID = "HypnosisAddonIllusion";

/** What BC draws the nametag from, lent to the shadow for each draw — see installIllusion. */
const NAME_FIELDS = ["Name", "Nickname", "LabelColor"] as const;

/** Which groups the freeze-frame remembers, versus which stay live.
 *
 * Read off the group's own flags rather than a hand-written list, so new BC content
 * classifies itself. Checked against the live R131 group definitions — the three-way split
 * is exactly what this feature wants:
 *
 *   Clothing: true (32)  Bra, Cloth, ClothLower, ClothOuter, Panties, Shoes, Socks, Suit,
 *                        Corset, Gloves, Hat, Glasses, jewelry, Wings, TailStraps, ...
 *   Category "Item" (28) every ItemXxx restraint group
 *   neither (25)         BodyUpper, BodyLower, Head, Eyes, Eyes2, Eyebrows, Mouth, Blush,
 *                        Fluids, HairFront, HairBack, Nipples, Pussy, Height, Pronouns,
 *                        and Emoticon
 *
 * So the frozen half is "everything worn" and the live half is "the body itself" — which
 * means the subject still sees their own arousal blush, their expression and their pose
 * change while their clothes stay exactly as they were. Emoticon landing in the live half
 * is a happy accident worth keeping: it is the item our injected effects ride on.
 *
 * TWO EXCEPTIONS, below: EyeShadow and Decals carry Clothing:true but are cosmetics, not
 * garments, and belong in the live half with the blush they sit next to. */
const COSMETIC_GROUPS = new Set(["EyeShadow", "Decals"]);

function isWornGroup(group: any): boolean {
	if (!group) return false;
	// Two of BC's 32 Clothing groups are not garments. Checked against the live R131
	// Female3DCG definitions rather than assumed: EyeShadow is makeup and Decals is body
	// decoration, and both carry `Clothing: true` alongside the dresses and shoes.
	//
	// Freezing them contradicts the split this whole file is built on — the live half is
	// meant to be the body itself, so that a subject still sees their own blush, expression
	// and pose change while their clothes stay put. Makeup belongs with the blush. DW found
	// this in play: an illusion applied with no clothing change reported "frozen groups:
	// EyeShadow, Socks, Cloth, ...", and eyeshadow has no business in that list.
	//
	// Everything else BC flags as Clothing genuinely is worn — hats, glasses, jewelry, masks,
	// wings — and those stay frozen, because "you cannot tell what you are wearing" covers a
	// hat. The SlaveParking bot's own NON_CLOTHING_GROUPS reached the same conclusion about
	// these two independently, which is some comfort that it is the line and not a taste.
	if (COSMETIC_GROUPS.has(group.Name)) return false;
	return group.Clothing === true || group.Category === "Item";
}

/** Exposed for the suite: the classification is the whole feature, and it is checked against
 * BC's real group flags rather than against itself. */
export function isWornGroupForTest(group: any): boolean {
	return isWornGroup(group);
}

/** The local-only character the lie is drawn from. */
let shadow: any = null;
/** The remembered worn items, or null when no illusion is running. */
let frozen: any[] | null = null;
/** Change-detector for the LIVE half — see rebuildIfStale. */
let lastSignature = "";

export function isIllusionActive(): boolean {
	return frozen !== null;
}

/** Copy an item deeply enough that later changes to the real one cannot reach through.
 * Property and Color are the two that actually get mutated in place by BC (expressions,
 * locks, colour edits), so those need their own copies; Asset is a shared definition and
 * is deliberately shared. */
function cloneItem(item: any): any {
	return {
		...item,
		Property: item?.Property ? { ...item.Property } : item?.Property,
		Color: Array.isArray(item?.Color) ? [...item.Color] : item?.Color,
	};
}

function ensureShadow(): any {
	if (shadow) return shadow;
	try {
		// CharacterType.SIMPLE is documented in Character.js as "generally used internally
		// and not to represent an actual in-game character" — exactly this. It lands in the
		// global Character array like an NPC; the arousal loops in Timer.js skip it because
		// its ArousalSettings has no Active, and nothing else iterates the array.
		shadow = CharacterLoadSimple(SHADOW_ID);
	} catch (err) {
		log("could not create the illusion character:", err);
		return null;
	}
	return shadow;
}

/** What the shadow's live half depends on. Rebuilding is expensive — CharacterLoadCanvas
 * redraws the entire body — so it happens only when this string changes, not per frame. */
function liveSignature(): string {
	const parts: string[] = [String(Player?.ActivePose ?? "")];
	for (const item of Player?.Appearance ?? []) {
		if (isWornGroup(item?.Asset?.Group)) continue;
		parts.push(
			`${item?.Asset?.Group?.Name}:${item?.Asset?.Name}:${item?.Property?.Expression ?? ""}:${String(item?.Color ?? "")}`,
		);
	}
	return parts.join("|");
}

function rebuild(): void {
	const target = ensureShadow();
	if (!target || !frozen) return;
	target.AssetFamily = Player?.AssetFamily ?? "Female3DCG";
	target.ActivePose = Player?.ActivePose ?? [];
	// Live body + remembered clothes. Anything worn since the freeze simply isn't here, and
	// anything removed since is still here — which is the whole illusion, in one line.
	target.Appearance = [
		...(Player?.Appearance ?? []).filter((i: any) => !isWornGroup(i?.Asset?.Group)),
		...frozen,
	];
	// Push = false: never write this to the server. RefreshDialog = false: it isn't a
	// character anyone has a dialog open on.
	CharacterRefresh(target, false, false);
	lastSignature = liveSignature();
}

function rebuildIfStale(): void {
	if (liveSignature() !== lastSignature) rebuild();
}

/** Take the snapshot and start lying. Returns false if there is nothing to draw from. */
export function freezeAppearance(): boolean {
	if (!Array.isArray(Player?.Appearance)) {
		log("cannot freeze appearance — no player appearance yet");
		return false;
	}
	// Idempotent on purpose. The illusion is "how you looked when it took hold", so saying
	// it a second time must not re-snapshot — and more importantly, a CARRIED illusion is
	// re-applied by carry.ts after waking, which would otherwise snapshot the truth at that
	// moment and leave the subject looking at a lie about nothing.
	if (frozen) {
		log("clothing illusion already running — keeping the original snapshot");
		return true;
	}
	frozen = Player.Appearance.filter((i: any) => isWornGroup(i?.Asset?.Group)).map(cloneItem);
	rebuild();
	log(`clothing illusion applied — ${frozen.length} worn item(s) frozen`);
	return true;
}

/** Stop lying. The snapshot is dropped rather than kept, so a later freeze always takes a
 * fresh one — a stale snapshot re-applied hours later would be a different feature. */
export function clearIllusion(): void {
	if (!frozen) return;
	frozen = null;
	lastSignature = "";
	// Force the player's own canvas to rebuild. In theory unnecessary — while the illusion
	// was running it was the shadow being passed to DrawCharacter, so Player's MustDraw flag
	// went untouched and is still set from whatever changed underneath — but "in theory the
	// screen updates" is a bad place to leave the moment a subject is supposed to find out
	// they are naked. Push=false, so nothing goes to the server.
	try {
		if (typeof CharacterRefresh === "function") CharacterRefresh(Player, false, false);
	} catch (err) {
		log("could not refresh after releasing the illusion:", err);
	}
	log("clothing illusion released");
}

/** One frozen garment, reduced to what it takes to rebuild it.
 *
 * Item objects hold a live `Asset` reference into BC's shared asset array, which cannot be
 * written to storage. Group and name can, and AssetGet() turns them back into the real
 * thing — verified in Asset.js, where it is a lookup in AssetMap keyed `Group/Name`. */
export interface FrozenItem {
	group: string;
	name: string;
	color?: any;
	property?: any;
}

/** The snapshot, in a form that survives a reload. Null when no illusion is running. */
export function illusionSnapshot(): FrozenItem[] | null {
	if (!frozen) return null;
	return frozen.map((i: any) => ({
		group: i?.Asset?.Group?.Name,
		name: i?.Asset?.Name,
		color: i?.Color,
		property: i?.Property,
	}));
}

/** Put back the EXACT clothes that were frozen, rather than re-freezing.
 *
 * The difference matters and is the whole reason this exists: freezeAppearance() would
 * snapshot whatever is being worn at the moment it is called, which after a reconnect is
 * the truth — the same trap carry.ts documents for waking. Rebuilding from the saved
 * identities restores the original lie instead.
 *
 * Returns false if the assets cannot be resolved, so the caller can say so rather than
 * silently leaving the subject seeing something other than they were. */
export function restoreIllusion(items: FrozenItem[] | null): boolean {
	if (!items?.length) return false;
	if (typeof AssetGet !== "function") return false;
	const family = Player?.AssetFamily ?? "Female3DCG";
	const rebuilt: any[] = [];
	for (const item of items) {
		const asset = AssetGet(family, item.group, item.name);
		if (!asset) {
			log(`cannot restore illusion — asset ${item.group}/${item.name} not found`);
			return false;
		}
		rebuilt.push({ Asset: asset, Color: item.color, Property: item.property });
	}
	frozen = rebuilt;
	lastSignature = "";
	rebuild();
	log(`clothing illusion restored — ${rebuilt.length} remembered item(s)`);
	return true;
}

export function describeIllusion(): string {
	if (!frozen) return "clothing illusion: off";
	const names = frozen.map((i: any) => i?.Asset?.Group?.Name).filter(Boolean);
	return `clothing illusion: ON, frozen groups: ${names.join(", ") || "(nothing worn)"}`;
}

export function installIllusion(modApi: any): void {
	modApi.hookFunction(
		"DrawCharacter",
		10,
		((args: any[], next: (args: any[]) => any) => {
			try {
				if (!frozen || args[0] !== Player) return next(args);
				const target = ensureShadow();
				if (!target) return next(args);
				rebuildIfStale();
				// DrawCharacter branches on C.IsPlayer() twice — once to draw at all when the
				// viewer is blind, and once to decide whether to apply the viewer's own tints
				// and darkness. The shadow is not the player, so without this the subject's own
				// body would start being tinted and dimmed like everyone else's. Overridden for
				// the duration of this one call only: a shadow that claimed to be the player
				// everywhere would be read as the player by Timer.js and the activity code too.
				//
				// THE NAME TOO. The overlay comment at the top of this file has the body, the
				// status bubble and the name as three separate calls, but the nametag vanished
				// in play while the illusion ran (DW's 2026-09-22 list) — so DrawCharacter is
				// drawing the name from the character it was handed, and a SIMPLE character is
				// created with no name. Lent for this one call, like IsPlayer, rather than set
				// on the shadow for good: a second character in the global Character array
				// carrying the player's name is something other code could find by name.
				// Inferred from the symptom, not from BC's source, which is not reachable here.
				const realIsPlayer = target.IsPlayer;
				const lent = NAME_FIELDS.map((k) => target[k]);
				target.IsPlayer = () => true;
				for (const k of NAME_FIELDS) target[k] = Player?.[k];
				try {
					return next([target, ...args.slice(1)]);
				} finally {
					target.IsPlayer = realIsPlayer;
					NAME_FIELDS.forEach((k, i) => (target[k] = lent[i]));
				}
			} catch (err) {
				// A bug here must never make the player invisible to themselves.
				log("illusion draw failed:", err);
				return next(args);
			}
		}) as any,
	);
	log("clothing illusion hook installed on DrawCharacter");
}
