// Taking clothes off — the design doc's Tier 1 "remove clothes", one garment at a time.
//
// The inverse of illusion.ts, and the reason this suite watches the sync: the illusion must
// never touch Player.Appearance because that array reaches the whole room, and this feature
// must, for exactly the same reason. Undressing that only the subject can see would BE the
// illusion, under the wrong permission and a lower trust bar.
const HYP = 246108;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [],
	CanInteract: () => true,
	CanChangeOwnClothes: () => true,
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.CharacterRefresh = () => {};
let synced = 0;
globalThis.ChatRoomCharacterUpdate = () => { synced += 1; };
globalThis.InventoryGet = (C, g) => C.Appearance.find((a) => a.Asset.Group.Name === g) ?? null;
globalThis.InventoryRemove = (C, g) => {
	const i = C.Appearance.findIndex((a) => a.Asset.Group.Name === g);
	if (i >= 0) C.Appearance.splice(i, 1);
};

const dress = (...groups) => {
	Player.Appearance = groups.map((g) => ({ Asset: { Name: g, Group: { Name: g, Clothing: true } } }));
};
const wearing = () => Player.Appearance.map((a) => a.Asset.Group.Name);

const { undress, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- outermost first, one at a time ---------------------------------------------------
// The doc's wording is "gradual, one piece at a time", which is also the better mechanic:
// the hypnotist says it again for the next piece, so undressing is paced by the scene.
dress("Cloth", "ClothLower", "Bra", "Panties", "Shoes");
check("sees what is worn, outermost first", undress.wornGarments(), ["Cloth", "ClothLower", "Bra", "Panties", "Shoes"]);
check("takes the outermost", undress.undress(1).removed, ["Cloth"]);
check("  and only that", wearing(), ["ClothLower", "Bra", "Panties", "Shoes"]);
check("again takes the next", undress.undress(1).removed, ["ClothLower"]);
check("  leaving the rest", wearing(), ["Bra", "Panties", "Shoes"]);

// --- and everything, when that is what was said ---------------------------------------
check("all of it goes", undress.undress(Infinity).removed, ["Bra", "Panties", "Shoes"]);
check("  nothing left", wearing(), []);
check("asked again, says so rather than going quiet", undress.undress(1).refusal, "already bare");

// --- ONLY the primary slots ------------------------------------------------------------
// Deliberately not every group with Clothing === true, which is 32 of them and includes
// hats, glasses and jewellery. Someone told to undress should not lose their earrings.
dress("Cloth", "Hat", "Glasses", "Necklace", "Panties");
check("ignores accessories", undress.wornGarments(), ["Cloth", "Panties"]);
undress.undress(Infinity);
check("  and leaves them on", wearing().sort(), ["Glasses", "Hat", "Necklace"]);

// --- what stops it ----------------------------------------------------------------------
// Both of these are the doc's "physically impossible actions" rule: check feasibility
// first, and say which obstacle it was rather than failing silently.
dress("Cloth", "Panties");
Player.CanInteract = () => false;
check("bound hands stop it", undress.undress(1).refusal, "bound");
check("  and nothing came off", wearing(), ["Cloth", "Panties"]);
Player.CanInteract = () => true;

Player.CanChangeOwnClothes = () => false;
check("a lock that is not ours stops it", undress.undress(1).refusal, "locked");
check("  still dressed", wearing(), ["Cloth", "Panties"]);
Player.CanChangeOwnClothes = () => true;
check("and once free it works again", undress.undress(1).removed, ["Cloth"]);

// --- the room has to see it -------------------------------------------------------------
// The assertion that keeps this from quietly becoming the clothing illusion.
dress("Cloth");
synced = 0;
undress.undress(1);
check("undressing syncs to the room", synced, 1);
synced = 0;
undress.undress(1);
check("  but a no-op does not", synced, 0);

console.log(`undress: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
