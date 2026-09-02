// What the clothing illusion freezes, and what it leaves alone.
//
// The classification IS the feature: freeze too little and the illusion has holes, freeze too
// much and the subject stops seeing their own body react. illusion.ts states the intended
// split — worn items frozen, the body itself live, so blush and expression and pose still
// move — and BC's own group flags do not quite agree with it.
//
// The list below is the real one, read out of the live R131 Female3DCG definitions: every
// group carrying `Clothing: true`. Kept here in full for the same reason part.mjs keeps the
// arousal-zone list — a classification checked only against itself proves nothing.
const BC_CLOTHING_GROUPS = [
	"AnkletLeft", "AnkletRight", "Bra", "Bracelet", "Cloth", "ClothAccessory", "ClothLower",
	"ClothOuter", "Corset", "Decals", "EyeShadow", "Garters", "Glasses", "Gloves",
	"HairAccessory1", "HairAccessory2", "HairAccessory3", "HandAccessoryLeft",
	"HandAccessoryRight", "Hat", "Jewelry", "Mask", "Necklace", "Panties", "Shoes", "Socks",
	"SocksLeft", "SocksRight", "Suit", "SuitLower", "TailStraps", "Wings",
];
// Body, face and hair: never frozen, so the subject keeps seeing themselves react.
const BC_BODY_GROUPS = [
	"BodyUpper", "BodyLower", "Head", "Eyes", "Eyes2", "Eyebrows", "Mouth", "Blush", "Fluids",
	"HairFront", "HairBack", "Nipples", "Pussy", "Height", "Pronouns", "Emoticon",
];
// The two that carry Clothing:true and are not garments at all.
const COSMETICS = ["EyeShadow", "Decals"];

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { illusion } = await import("./harness-bundle.mjs");
const worn = (name, extra = {}) => illusion.isWornGroupForTest({ Name: name, ...extra });

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- garments freeze -----------------------------------------------------------------
const garments = BC_CLOTHING_GROUPS.filter((g) => !COSMETICS.includes(g));
const notFrozen = garments.filter((g) => !worn(g, { Clothing: true }));
check("every real garment is frozen", notFrozen, []);
// Worn accessories count too: "you cannot tell what you are wearing" covers a hat.
for (const g of ["Hat", "Glasses", "Necklace", "Wings", "Mask"]) {
	check(`  ${g} is something you wear`, worn(g, { Clothing: true }), true);
}

// --- cosmetics do NOT -----------------------------------------------------------------
// DW found this in play: an illusion applied with no clothing change reported "frozen
// groups: EyeShadow, Socks, Cloth, ..." — makeup has no business in that list, and freezing
// it contradicts the split the whole module is built on.
for (const g of COSMETICS) {
	check(`${g} is makeup, not clothing`, worn(g, { Clothing: true }), false);
}

// --- the body stays live ---------------------------------------------------------------
const frozenBody = BC_BODY_GROUPS.filter((g) => worn(g, { Category: "Appearance" }));
check("no body group is ever frozen", frozenBody, []);

// --- restraints freeze, by category rather than by flag ---------------------------------
check("restraint groups freeze", worn("ItemArms", { Category: "Item" }), true);
check("  and are caught by Category, not Clothing", worn("ItemLegs", { Category: "Item", Clothing: false }), true);

// --- nothing to classify --------------------------------------------------------------
check("a missing group is not worn", illusion.isWornGroupForTest(null), false);
check("an unknown group is not worn", worn("SomethingNewInR132", {}), false);

console.log(`illusion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
