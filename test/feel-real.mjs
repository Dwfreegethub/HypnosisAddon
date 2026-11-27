// "The ropes feel real" (v1.22.0, DW 2026-11-26): a bondage illusion is a picture until the hypnotist
// says it feels real; then the imagined items' own BC restrictions hold her, each kind under her
// permission for it. The reminder after a bondage illusion says how (DW: "make that as the default
// message to remind the hypnotist that the bindings dont work by default").
//
// Failure looks like: no reminder, or one that doesn't say how; a restriction put on without its
// permission; Freeze or BlockWardrobe taken from the items (so letting go would free "you cannot
// move"); the hold staying when the picture goes, after "not real", or after the safeword; something
// added to a real illusion not holding; a trigger not storing or replaying it; leftovers after a
// reload not counted as orphans.
const HYP = 246108;
const grp = (Name, extra = {}) => ({ Name, Description: Name, ...extra });
const item = (group, asset, extra = {}) => ({ Asset: { Name: asset, Description: asset, Group: grp(group, extra) } });
const emoticon = { Asset: { Name: "Emoticon", Group: grp("Emoticon") }, Property: {} };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true,
	AssetFamily: "Female3DCG", Appearance: [item("BodyUpper", "Female"), item("Cloth", "TShirt", { Clothing: true }), emoticon], ActivePose: [], PoseMapping: {},
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
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
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = () => {};
globalThis.CharacterRefresh = () => {};
const shadow = { Name: "", IsPlayer: () => false };
globalThis.CharacterLoadSimple = () => shadow;
// The real items' own effects (live R134 Female3DCG.js), and legs rope's first option adding Slow.
const ASSETS = {
	"ItemArms/HempRope": ["Block", "BlockWardrobe"], "ItemLegs/HempRope": [], "ItemFeet/HempRope": [],
	"ItemMouth/BallGag": ["BlockMouth", "GagMedium"], "ItemHead/LeatherBlindfold": ["BlindNormal", "BlockWardrobe"], "ItemArms/MetalCuffs": ["Lock", "Block", "BlockWardrobe"], "ItemFeet/SteelAnkleCuffs": ["CuffedFeet"],
};
globalThis.AssetGet = (_f, g, a) => (ASSETS[`${g}/${a}`] ? { Name: a, Group: grp(g, { Category: "Item" }), Extended: true, Effect: ASSETS[`${g}/${a}`] } : null);
globalThis.ExtendedItemInit = (_C, it) => { it.Property = it.Asset.Group.Name === "ItemLegs" ? { Effect: ["Slow", "Freeze"] } : {}; return true; };
globalThis.ExtendedItemSetOptionByRecord = () => {};
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
globalThis.InventoryGet = (C, g) => C.Appearance.find((i) => i.Asset.Group.Name === g) ?? null;
globalThis.CurrentTime = Date.now();

const { voice, storage, session, illusion, effects, recovery, feelReal } = await import("./harness-bundle.mjs");
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const REAL = ["Block", "Prone", "Slow", "CuffedArms", "CuffedLegs", "CuffedFeet", "BlockMouth", "GagMedium", "BlindNormal"];
const held = () => REAL.filter((e) => effects.heldByUs(e));
let clock = Date.now();
Date.now = () => clock;
for (const k of ["hypnoEnabled", "illusionControl", "movementRestriction"]) storage.setFeature(k, true);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
session.forceTrance(HYP, 80, 80);

// --- the reminder ---
toHyp = [];
say("Missy, you see yourself tied up");
check("after a bondage illusion: the reminder says it doesn't hold, and how to make it", toHyp.some((t) => /doesn't hold them/.test(t) && /"Missy, the ropes feel real"/.test(t)), true);
check("  nothing holds her yet", held(), []);

// --- feel real, with only Movement Restriction ---
say("Missy, you see yourself gagged");
toHyp = []; said = [];
say("Missy, the ropes feel real");
check("the ropes feel real: her body is held (Block, Slow), not gagged without Speech Restriction", held(), ["Block", "Slow"]);
check("  the hypnotist told what took and what didn't", toHyp.some((t) => /holds their body/.test(t) && /Speech Restriction: not enabled/.test(t)), true);
check("  she is told", said.some((l) => /They hold you/.test(l)), true);
check("  never Freeze or BlockWardrobe from the items (ECHS holds those for other things)", [feelReal.REAL_EFFECT_NAMES.includes("Freeze"), feelReal.REAL_EFFECT_NAMES.includes("BlockWardrobe"), effects.heldByUs("BlockWardrobe")], [false, false, false]);
check("  on the Emoticon carrier, allowed", [emoticon.Property.Effect?.includes("Block"), Asset[0].AllowEffect.includes("Block")], [true, true]);
// not real again
say("Missy, the ropes are not real");
check("\"not real\": the hold goes, the picture stays", [held(), illusion.currentSee()?.kind], [[], "bind"]);
// with speech too
storage.setFeature("speechRestriction", true);
say("Missy, they feel real");
check("\"they feel real\" while she sees them, speech allowed: gagged too", held(), ["Block", "Slow", "BlockMouth", "GagMedium"]);
// adding to a real illusion
storage.setFeature("sightControl", true);
toHyp = [];
say("Missy, you see yourself blindfolded");
check("added while real: the blindfold holds too, no 'doesn't hold' reminder", [effects.heldByUs("BlindNormal"), toHyp.some((t) => /doesn't hold them/.test(t))], [true, false]);
// "you cannot move" is not ECHS's to lose
say("Missy, you cannot move");
check("a real \"you cannot move\" freeze", effects.heldByUs("Freeze"), true);
say("Missy, the ropes are gone");
check("\"the ropes are gone\": picture and hold go", [illusion.isIllusionActive(), held()], [false, []]);
check("  the freeze from \"you cannot move\" stays", effects.heldByUs("Freeze"), true);
say("Missy, you can move");

// --- nothing to make real ---
toHyp = [];
say("Missy, the ropes feel real");
check("no bindings shown: told so", toHyp.some((t) => /Nothing to make real/.test(t)), true);
toHyp = [];
say("Missy, it feels real");
check("  a bare \"it feels real\" with nothing shown is left alone", toHyp.some((t) => /Nothing to make real/.test(t)), false);

// --- the safeword ---
say("Missy, you see yourself tied up");
say("Missy, the ropes feel real");
check("real again", held().length > 0, true);
session.hardFloorStop();
check("the safeword takes the hold off", [held(), illusion.isIllusionActive()], [[], false]);

// --- leftovers after a reload are orphans ---
effects.applyEffect("GagMedium");
check("a gag left on the carrier with nothing behind it counts as an orphan", recovery.hasOrphanedEffects(), true);
effects.removeEffect("GagMedium");

// --- in a trigger ---
for (const k of ["hypnoEnabled", "illusionControl", "movementRestriction", "speechRestriction", "triggerControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
clock += 60_000;
session.forceTrance(HYP, 80, 80);
say("Missy, your trigger word is ribbon");
say("Missy, you see yourself tied up");
say("Missy, the ropes feel real");
say("Missy, remember trigger");
check("planted, nothing applied", [held(), illusion.isIllusionActive()], [[], false]);
session.wakeByHypnotist(HYP);
drainPaced();
const t = storage.listTriggers().find((x) => x.phrase === "ribbon");
check("the trigger holds both", t?.actions, ["see:bound:ItemArms/HempRope+ItemLegs/HempRope+ItemFeet/HempRope", "see:real"]);
check("  listed in words", voice.triggerRow(t, false).includes("the bindings feel real"), true);
clock += 60_000;
voice.handleSpokenLine(HYP, "ribbon");
drainPaced();
check("the word: rope she sees, and it holds", [illusion.currentSee()?.kind, held()], ["bind", ["Block", "Slow"]]);
session.hardFloorStop();
check("safeword after the trigger: free", held(), []);

console.log(`feel-real: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
