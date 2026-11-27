// The bondage picker (v1.23.0, DW 2026-11-26: "all the bondage and options. Most items have several
// options in them"). The hypnotist's popup lists BC's item slots, their items and their options; the
// line it types goes out, and her ECHS gets the exact item privately (DW chose "sent + a line").
//
// Failure looks like: a non-item group or BC's script item offered; an invisible item offered; the
// options wrong or their records not combined; the line read by some other suggestion; the item sent
// before the line, twice, or for a different line; her side taking more than one item, a non-item, or
// an item it doesn't know; it landing without a session, the permission or the depth; not recordable
// into a trigger; the chosen option not applied on the shadow.
const HYP = 246108;
const grp = (Name, extra = {}) => ({ Name, Description: Name.replace(/^Item/, "") + " slot", Family: "Female3DCG", Category: "Item", ...extra });
const A = (group, name, extra = {}) => ({ Name: name, Description: name.replace(/([a-z])([A-Z])/g, "$1 $2"), Group: grp(group), Visible: true, Extended: true, Effect: [], ...extra });
globalThis.Asset = [
	A("ItemArms", "LeatherArmbinder", { Effect: ["Block"] }), A("ItemArms", "HempRope", { Effect: ["Block", "BlockWardrobe"] }), A("ItemArms", "Ghostly", { Visible: false }),
	A("ItemMouth", "BallGag", { Effect: ["BlockMouth", "GagMedium"] }), A("ItemScript", "Script"),
	{ Name: "TShirt", Description: "T-Shirt", Group: { Name: "Cloth", Family: "Female3DCG", Category: "Appearance" } },
	{ Name: "Emoticon", Group: { Name: "Emoticon", Family: "Female3DCG", Category: "Appearance" }, AllowEffect: [] },
];
globalThis.TypedItemDataLookup = { ItemArmsHempRope: { options: [{ Name: "WristTie", Property: { TypeRecord: { typed: 0 } } }, { Name: "BoxTie", Property: { TypeRecord: { typed: 1 } } }, { Name: "Hogtied", Property: { TypeRecord: { typed: 2 } } }] } };
globalThis.ModularItemDataLookup = {
	ItemArmsLeatherArmbinder: { modules: [
		{ Name: "Strap", Key: "s", Options: [{ Name: "None", Property: { TypeRecord: { s: 0 } } }, { Name: "Harness", Property: { TypeRecord: { s: 1 } } }] },
		{ Name: "Lacing", Key: "l", Options: [{ Name: "Loose", Property: { TypeRecord: { l: 0 } } }, { Name: "Tight", Property: { TypeRecord: { l: 1 } } }] },
		{ Name: "Only", Key: "o", Options: [{ Name: "One" }] },
	] },
};
const emoticon = { Asset: Asset[6], Property: {} };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true,
	Appearance: [{ Asset: Asset[5] }, emoticon], ActivePose: [], PoseMapping: {},
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
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = () => {};
globalThis.CharacterRefresh = () => {};
const shadow = { Name: "", IsPlayer: () => false };
globalThis.CharacterLoadSimple = () => shadow;
globalThis.AssetGet = (_f, g, a) => Asset.find((x) => x.Group.Name === g && x.Name === a) ?? null;
globalThis.ExtendedItemInit = (_C, it) => { it.Property = {}; return true; };
let records = [];
globalThis.ExtendedItemSetOptionByRecord = (_C, it, rec) => { records.push([it.Asset.Name, rec]); if (rec?.typed === 2) it.Property.Effect = ["Prone"]; };
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

const { voice, storage, session, illusion, effects, popupItems: P } = await import("./harness-bundle.mjs");
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- what the picker offers ---
check("slots: item groups only, not the script item", P.pickSlots().map((s) => s.group), ["ItemArms", "ItemMouth"]);
check("  by BC's own names", P.pickSlots()[0].label, "Arms slot");
check("items: A to Z, invisible ones left out", P.pickItems("ItemArms").map((i) => i.label), ["Hemp Rope", "Leather Armbinder"]);
check("  the search narrows it", P.pickItems("ItemArms", "arm").map((i) => i.asset), ["LeatherArmbinder"]);
check("typed options", P.pickChoices("ItemArms", "HempRope").map((c) => [c.label, c.options.map((o) => o.label)]), [["Option", ["Wrist Tie", "Box Tie", "Hogtied"]]]);
check("modular: one choice per part (a one-option part left out)", P.pickChoices("ItemArms", "LeatherArmbinder").map((c) => [c.label, c.options.map((o) => o.label)]), [["Strap", ["None", "Harness"]], ["Lacing", ["Loose", "Tight"]]]);
check("no options", P.pickChoices("ItemMouth", "BallGag"), []);
check("the id: typed", P.pickActionId("ItemArms", "HempRope", { typed: 2 }), "see:bound:ItemArms/HempRope~typed=2");
check("the id: modular parts combined", P.pickActionId("ItemArms", "LeatherArmbinder", { s: 1, l: 1 }), "see:bound:ItemArms/LeatherArmbinder~s=1,l=1");
check("the id: no options", P.pickActionId("ItemMouth", "BallGag", {}), "see:bound:ItemMouth/BallGag");
check("the line", [P.pickLine("Leather Armbinder"), P.pickLine("Ankle Cuffs"), P.pickLine("Ominous Gag")], ["you see a Leather Armbinder on you", "you see Ankle Cuffs on you", "you see an Ominous Gag on you"]);

// --- sending: once, for that line, after it ---
let clock = Date.now();
Date.now = () => clock;
P.setPendingPick("Missy, you see a Leather Armbinder on you", "see:bound:ItemArms/LeatherArmbinder~s=1", 1, clock);
check("another line: nothing sent", P.takePendingFor("Missy, kneel", clock), null);
check("that line: the item, for her", P.takePendingFor("Missy, you see a Leather Armbinder on you.", clock), { id: "see:bound:ItemArms/LeatherArmbinder~s=1", to: 1 });
check("  only once", P.takePendingFor("Missy, you see a Leather Armbinder on you", clock), null);
P.setPendingPick("Missy, you see a Leather Armbinder on you", "x", 1, clock);
check("  not after 5 minutes", P.takePendingFor("Missy, you see a Leather Armbinder on you", clock + 6 * 60_000), null);

// --- her side ---
for (const k of ["hypnoEnabled", "illusionControl", "movementRestriction"]) storage.setFeature(k, true);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
session.forceTrance(HYP, 80, 80);
say("Missy, you see a Leather Armbinder on you");
check("the spoken line alone does nothing", illusion.isIllusionActive(), false);
toHyp = []; said = [];
voice.handlePickedItem(HYP, { type: "see-item", id: "see:bound:ItemArms/HempRope~typed=2" });
check("the item: she sees it, in the chosen option", [illusion.currentSee("bind")?.ghosts, records.at(-1)], [[{ group: "ItemArms", asset: "HempRope", record: { typed: 2 } }], ["HempRope", { typed: 2 }]]);
check("  the hypnotist gets the reminder", toHyp.some((t) => /the ropes feel real/.test(t)), true);
say("Missy, the ropes feel real");
check("feels real: the option's own effect too (Prone), not BlockWardrobe", ["Block", "Prone", "BlockWardrobe"].map((e) => effects.heldByUs(e)), [true, true, false]);
say("Missy, the ropes are gone");
check("the ropes are gone: off", [illusion.isIllusionActive(), effects.heldByUs("Block")], [false, false]);
toHyp = [];
voice.handlePickedItem(HYP, { type: "see-item", id: "see:bound:ItemArms/Nope" });
check("an item her client doesn't know: told, nothing shown", [illusion.isIllusionActive(), toHyp.some((t) => /doesn't know that item/.test(t))], [false, true]);
voice.handlePickedItem(HYP, { type: "see-item", id: "see:bound:ItemArms/HempRope+ItemMouth/BallGag" });
check("two items in one message: refused", illusion.isIllusionActive(), false);
voice.handlePickedItem(HYP, { type: "see-item", id: "see:naked" });
check("not an item: refused", illusion.isIllusionActive(), false);
voice.handlePickedItem(777, { type: "see-item", id: "see:bound:ItemMouth/BallGag" });
check("from someone with no session on her: nothing", illusion.isIllusionActive(), false);
storage.setFeature("illusionControl", false);
toHyp = [];
voice.handlePickedItem(HYP, { type: "see-item", id: "see:bound:ItemMouth/BallGag" });
check("without Illusions: refused, said so", [illusion.isIllusionActive(), toHyp.some((t) => /not enabled "Illusions"/.test(t))], [false, true]);
storage.setFeature("illusionControl", true);
// into a trigger
storage.setFeature("triggerControl", true);
storage.setTriggerScope("hypnotist");
say("Missy, your trigger word is ribbon");
voice.handlePickedItem(HYP, { type: "see-item", id: "see:bound:ItemArms/LeatherArmbinder~s=1,l=1" });
say("Missy, remember trigger");
check("recorded into a trigger, not shown", [illusion.isIllusionActive(), storage.listTriggers().find((t) => t.phrase === "ribbon")?.actions], [false, ["see:bound:ItemArms/LeatherArmbinder~s=1,l=1"]]);
check("  listed by BC's own name", voice.triggerRow(storage.listTriggers().find((t) => t.phrase === "ribbon"), false).includes("Leather Armbinder"), true);

console.log(`item-picker: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
