// Seeing illusions (v1.21.0, DW 2026-11-26, ideas doc #7): "you see yourself naked", "…without your
// bra", "your wrists are bound in rope", "you see yourself gagged". Only on her own screen; one at a
// time; the bondage one never holds her and the hypnotist is told so (DW).
//
// Failure looks like: a wording not read, or read as the wrong thing; an ordinary line ("you are bound
// to obey", "you see yourself as you are") taken for one; her real Appearance touched; the wrong
// clothes left off or items added; a real item hidden by an imagined one; the release wording not
// ending it; no reminder to the hypnotist; it landing without the permission or the depth; a trigger
// not storing or replaying it; the messages that would contradict it still shown.
const HYP = 246108;
const grp = (Name, extra = {}) => ({ Name, Description: Name, ...extra });
const item = (group, asset, extra = {}) => ({ Asset: { Name: asset, Description: asset, Group: grp(group, extra) } });
const dressed = () => [
	item("BodyUpper", "Female"), item("Cloth", "TShirt", { Clothing: true }), item("ClothLower", "Skirt", { Clothing: true }),
	item("Bra", "Bra1", { Clothing: true }), item("Panties", "Panties1", { Clothing: true }), item("Shoes", "Heels", { Clothing: true }),
	item("Hat", "Cap", { Clothing: true }), item("EyeShadow", "Shadow", { Clothing: true }),
	item("ItemNeck", "Collar", { Category: "Item" }),
];
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true,
	AssetFamily: "Female3DCG", Appearance: dressed(), ActivePose: [], PoseMapping: {},
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
let refreshed = [];
globalThis.CharacterRefresh = (C, push) => { refreshed.push([C, push]); };
const shadow = { Name: "", IsPlayer: () => false };
globalThis.CharacterLoadSimple = () => shadow;
const KNOWN = new Set(["ItemArms/HempRope", "ItemLegs/HempRope", "ItemFeet/HempRope", "ItemArms/MetalCuffs", "ItemFeet/SteelAnkleCuffs", "ItemLegs/LeatherLegCuffs", "ItemMouth/BallGag", "ItemMouth/DuctTape", "ItemHead/LeatherBlindfold", "ItemArms/Chains", "ItemFeet/Chains", "ItemArms/DuctTape", "ItemLegs/DuctTape", "ItemMouth/ClothGag", "ItemTorso/HempRopeHarness"]);
globalThis.AssetGet = (_f, g, a) => (KNOWN.has(`${g}/${a}`) ? { Name: a, Group: grp(g, { Category: "Item" }), Extended: true } : null);
let inits = [];
globalThis.ExtendedItemInit = (C, it, push, refresh) => { inits.push([C, it.Asset.Name, push, refresh]); it.Property = { TypeRecord: { typed: 0 } }; return true; };
let records = [];
globalThis.ExtendedItemSetOptionByRecord = (C, it, rec, o) => { records.push([it.Asset.Name, rec, o]); it.Property.TypeRecord = rec; };
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};
globalThis.InventoryGet = () => null;
globalThis.CurrentTime = Date.now();

const { voice, storage, session, illusion, see, suppression } = await import("./harness-bundle.mjs");
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- wording (pure) ---
const id = (line) => { const s = see.matchSeeIllusion(line); return s ? see.seeActionId(s) : null; };
check("naked", ["missy, you see yourself naked", "you see yourself completely nude", "you look naked to yourself", "you see yourself with nothing on"].map(id), ["see:naked", "see:naked", "see:naked", "see:naked"]);
check("topless", id("you see yourself topless"), "see:off:ClothOuter+Cloth+ClothAccessory+Suit+Corset+Bra");
check("without your bra and panties", id("you see yourself without your bra and your panties"), "see:off:Bra+Panties");
check("without your shoes", id("you see yourself without your shoes"), "see:off:Shoes");
check("in your underwear", id("you see yourself in your underwear"), "see:off:ClothOuter+Cloth+ClothAccessory+Suit+Corset+ClothLower+SuitLower+Gloves");
check("tied up", id("you see yourself tied up"), "see:bound:ItemArms/HempRope+ItemLegs/HempRope+ItemFeet/HempRope");
check("wrists bound in rope", id("missy, your wrists are bound in rope"), "see:bound:ItemArms/HempRope");
check("ankles are cuffed", id("your ankles are cuffed"), "see:bound:ItemFeet/SteelAnkleCuffs");
check("arms and legs chained", id("your arms and legs are chained"), "see:bound:ItemArms/Chains+ItemLegs/Chains");
check("rope on your wrists and ankles", id("you see rope on your wrists and ankles"), "see:bound:ItemArms/HempRope+ItemFeet/HempRope");
check("gagged", id("you see yourself gagged"), "see:bound:ItemMouth/BallGag");
check("gagged with tape", id("you see yourself gagged with tape"), "see:bound:ItemMouth/DuctTape");
check("cuffed and gagged", id("you see yourself cuffed and gagged"), "see:bound:ItemArms/MetalCuffs+ItemFeet/SteelAnkleCuffs+ItemMouth/BallGag");
check("you are tied up in rope", id("you are tied up in rope"), "see:bound:ItemArms/HempRope+ItemLegs/HempRope+ItemFeet/HempRope");
check("not illusions", ["you are bound to obey", "you see yourself as you are", "you can see yourself again", "you cannot see yourself naked", "you see yourself dressed", "you are tied to my voice", "whenever anyone ties you up, you moan"].map(id), [null, null, null, null, null, null, null]);
check("id with options round-trips", see.seeActionId(see.parseSeeId("see:bound:ItemArms/HempRope~typed=3,a=1")), "see:bound:ItemArms/HempRope~typed=3,a=1");
check("a bad id is nothing", [see.parseSeeId("see:bound:Cloth/TShirt"), see.parseSeeId("see:off:"), see.parseSeeId("feel:x")], [null, null, null]);
check("described", [see.describeSee(see.parseSeeId("see:naked")), see.describeSee(see.parseSeeId("see:off:Bra+Panties")), see.describeSee(see.parseSeeId("see:bound:ItemArms/HempRope+ItemFeet/HempRope+ItemMouth/BallGag"))],
	["you see yourself naked", "you see yourself without your bra, panties", "you see rope on your arms and ankles, a gag on your mouth"]);

// --- drawing ---
const hooks = {};
illusion.installIllusion({ hookFunction: (name, _p, fn) => { hooks[name] = fn; } });
const drawn = () => { let got = null; hooks.DrawCharacter([Player, 0, 0, 1], (a) => { got = a[0]; }); return got; };
const names = (C) => (C.Appearance ?? []).map((i) => `${i.Asset.Group.Name}/${i.Asset.Name}`);
const realBefore = JSON.stringify(names(Player));
illusion.showSee(see.parseSeeId("see:naked"));
const nakedView = drawn();
check("naked: she is drawn from the shadow", nakedView === shadow, true);
check("  without every garment; body, makeup and restraints stay", names(nakedView), ["BodyUpper/Female", "EyeShadow/Shadow", "ItemNeck/Collar"]);
check("  her real appearance untouched, never pushed", [JSON.stringify(names(Player)), refreshed.every(([, push]) => push === false)], [realBefore, true]);
check("  hides clothing messages, not bondage ones", [illusion.illusionHides("clothing"), illusion.illusionHides("bondage")], [true, false]);
illusion.clearIllusion();
illusion.showSee(see.parseSeeId("see:off:Bra"));
illusion.showSee(see.parseSeeId("see:off:Panties"));
check("without your bra, then panties: both", names(drawn()).filter((n) => /Bra|Panties/.test(n)), []);
check("  top and skirt still there", names(drawn()).includes("Cloth/TShirt") && names(drawn()).includes("ClothLower/Skirt"), true);
check("  a new garment worn meanwhile shows", (Player.Appearance.push(item("Socks", "Socks1", { Clothing: true })), names(drawn()).includes("Socks/Socks1")), true);
Player.Appearance = dressed();
const r = illusion.showSee(see.parseSeeId("see:bound:ItemArms/HempRope~typed=2+ItemNeck/HempRope+ItemFeet/HempRope"));
const bound = names(drawn());
check("bound: replaces the strip illusion", r, "replaced");
check("  rope added on her view, dressed as she is", ["ItemArms/HempRope", "ItemFeet/HempRope", "Cloth/TShirt"].every((n) => bound.includes(n)), true);
check("  an unknown item is skipped, the rest drawn", bound.filter((n) => n.startsWith("ItemNeck")), ["ItemNeck/Collar"]);
Player.Appearance.push(item("ItemFeet", "LeatherAnkleCuffs", { Category: "Item" }));
check("  what she really wears in a group wins over what she imagines there", names(drawn()).filter((n) => n.startsWith("ItemFeet")), ["ItemFeet/LeatherAnkleCuffs"]);
Player.Appearance = dressed();
check("  set up on the shadow, never pushed", inits.every(([C, , push, refresh]) => C === shadow && push === false && refresh === false), true);
check("  the options it was given", records.map(([a, rec, o]) => [a, rec, o.push]), [["HempRope", { typed: 2 }, false]]);
check("  hides bondage messages", [illusion.illusionHides("bondage"), illusion.illusionHides("clothing")], [true, false]);
check("  her real appearance still untouched", names(Player).includes("ItemArms/HempRope"), false);
illusion.clearIllusion();
check("cleared: drawn as herself", drawn() === Player, true);
check("nothing known to draw: refused", illusion.showSee({ kind: "bind", ghosts: [{ group: "ItemArms", asset: "Nope" }] }), false);

// --- spoken ---
let clock = Date.now();
Date.now = () => clock;
for (const k of ["hypnoEnabled", "illusionControl"]) storage.setFeature(k, true);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
session.forceTrance(HYP, 80, 80);
toHyp = []; said = [];
say("Missy, you see yourself naked");
check("spoken: naked lands, she is told", [illusion.currentSee()?.kind, said.some((l) => /nothing on you at all/.test(l))], ["strip", true]);
check("  no bondage reminder for this one", toHyp.some((t) => /doesn't hold them/.test(t)), false);
toHyp = [];
say("Missy, your wrists are bound in rope");
check("spoken: rope lands", illusion.currentSee()?.kind, "bind");
check("  the hypnotist is reminded it doesn't hold her, and how to", toHyp.some((t) => /Only they see it, and it doesn.t hold them/.test(t) && /the ropes feel real/.test(t)), true);
check("  and that it replaced the other", toHyp.some((t) => /replaces the illusion they had/.test(t)), true);
say("Missy, the ropes are gone");
check("release wording ends it", illusion.isIllusionActive(), false);
say("Missy, you see yourself gagged");
say("Missy, you can see yourself again");
check("\"you can see yourself again\" ends it", illusion.isIllusionActive(), false);
// permission and depth
storage.setFeature("illusionControl", false);
toHyp = [];
say("Missy, you see yourself naked");
check("without Illusions: refused, said so", [illusion.isIllusionActive(), toHyp.some((t) => /not enabled "Illusions"/.test(t))], [false, true]);
storage.setFeature("illusionControl", true);
session.wakeByHypnotist(HYP);
drainPaced();
session.forceTrance(HYP, 30, 30);
toHyp = [];
say("Missy, you see yourself naked");
check("too shallow: refused with the depth", [illusion.isIllusionActive(), toHyp.some((t) => /Refused — an illusion/.test(t))], [false, true]);
session.wakeByHypnotist(HYP);
drainPaced();
// a trigger
clock += 60_000;
session.forceTrance(HYP, 80, 80);
storage.setFeature("triggerControl", true);
storage.setTriggerScope("hypnotist");
say("Missy, your trigger word is ribbon");
say("Missy, you see yourself tied up");
say("Missy, remember trigger");
check("recorded, not done, while planting", illusion.isIllusionActive(), false);
session.wakeByHypnotist(HYP);
drainPaced();
check("woke: nothing left over", illusion.isIllusionActive(), false);
const t = storage.listTriggers().find((x) => x.phrase === "ribbon");
check("the trigger holds the illusion", t?.actions, ["see:bound:ItemArms/HempRope+ItemLegs/HempRope+ItemFeet/HempRope"]);
check("  listed in words", voice.triggerRow(t, false).includes("you see rope on your arms and legs and ankles"), true);
clock += 60_000;
voice.handleSpokenLine(HYP, "ribbon");
drainPaced();
check("the word: she sees the rope", illusion.currentSee()?.kind, "bind");



session.hardFloorStop();
check("the safeword ends it", illusion.isIllusionActive(), false);

console.log(`see-illusion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
