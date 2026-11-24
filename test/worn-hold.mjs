// Held while worn (v1.16.20, DW 2026-11-23): "Missy, whenever anyone gags you, you are very aroused"
// + "this trigger holds while you wear it". It holds on no timer until the gag comes off, re-applies
// arousal and orgasm every 2 minutes meanwhile, and the release words and safeword still end it.
//
// Failure looks like: the option not parsed or silently kept on a word trigger; a timer releasing it
// while the gag is still on; it never letting go when the gag comes off (or another item replaces
// it); undressing repeated; no repeat; or the watch left running after the safeword.
const HYP = 246108, REI = 999, ZED = 555, OTHER_HYP = 424242;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: OTHER_HYP, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
const lastToHyp = () => toHyp[toHyp.length - 1] ?? "";
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let spoken = [];
globalThis.ChatRoomSendChatMessage = (msg) => { spoken.push(msg); return true; };
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


// What she wears, slot -> { Asset: { Name }, Property }, read by the add-on through BC's InventoryGet.
const wearing = {};
globalThis.InventoryGet = (C, g) => (C === Player ? wearing[g] ?? null : null);
const { voice, storage, session, timers } = await import('./harness-bundle.mjs');

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let arousalSet = [];
globalThis.ActivitySetArousal = (C, p) => { arousalSet.push(p); C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10); // a timer that WOULD release an ordinary hold after 10 minutes
let clock = Date.now();
Date.now = () => clock;
const MIN = 60_000;
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const only = () => storage.listTriggers().find((t) => t.fireOn);
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; arousalSet = []; for (const k of Object.keys(wearing)) delete wearing[k]; clock += MIN; };
const rei = ChatRoomCharacter.find((c) => c.MemberNumber === REI);
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
const putOn = (group, name, by = rei) => {
	wearing[group] = { Asset: { Name: name, Group: { Name: group } }, Property: {} };
	handler.Callback({ Type: "Action", Content: "ActionUse" }, by, "", { TargetMemberNumber: Player.MemberNumber, GroupName: group, Assets: { NextAsset: { Name: name, Group: { Name: group } } } });
	drainPaced();
};
const plant = (lines) => { under(); for (const l of lines) say(l); say("Missy, remember trigger"); session.wakeByHypnotist(HYP); drainPaced(); };

// --- the option -----------------------------------------------------------------------------------
check("parse: holds while you wear it", voice.parseTriggerControl("Missy, this trigger holds while you wear it"), { kind: "option", option: { kind: "whileWorn" } });
check("parse: lasts until it comes off", voice.parseTriggerControl("Missy, it lasts until it comes off")?.option?.kind, "whileWorn");
check("parse: a time is still a lifespan", voice.parseTriggerControl("Missy, it lasts ten minutes")?.option?.kind, "lifespan");

// On a word trigger it means nothing: said, and not kept.
reset();
under();
say("Missy, your trigger word is sleepy");
say("Missy, you are very aroused");
say("Missy, this trigger holds while you wear it");
check("on a word trigger: the hypnotist is told it's ignored", /only works on an item compulsion/.test(toHyp.join(" ")), true);
say("Missy, remember trigger");
check("  and not kept", storage.listTriggers().find((t) => t.phrase === "sleepy")?.whileWorn, undefined);

// --- held while the gag is on ------------------------------------------------------------------------
reset();
plant(["Missy, whenever anyone gags you, you are very aroused and you cannot move", "Missy, this trigger holds while you wear it"]);
check("stored with the option", [only()?.act, only()?.whileWorn], ["gag", true]);
check("  the hypnotist was told", /holds for as long as they wear the item/.test(toHyp.join(" ")), true);
putOn("ItemMouth", "BallGag");
check("gagged: aroused, held, watching the gag", [arousalSet.length, voice.isTriggerInEffect(only()), only()?.wornHold], [1, true, { group: "ItemMouth", asset: "BallGag" }]);
// Failure: the 10-minute trigger duration releases it with the gag still on.
check("no duration timer armed for it", pendingTimers.some((t) => t.live && t.ms >= 10 * MIN), false);
clock += 11 * MIN;
drainPaced();
check("11 minutes on, gag still on: still held", voice.isTriggerInEffect(only()), true);
const before = arousalSet.length;
voice.checkWornHolds(clock);
check("  and the arousal came again", arousalSet.length, before + 1);
voice.checkWornHolds(clock + 1 * MIN);
check("  not again within 2 minutes", arousalSet.length, before + 1);
voice.checkWornHolds(clock + 2 * MIN);
check("  again at 2 minutes", arousalSet.length, before + 2);

// Swapped for another gag: follows it, doesn't fire on top of itself.
clock += 3 * MIN;
const n = arousalSet.length;
putOn("ItemMouth", "ClothGag");
check("swapped gag: watched, not fired again", [only()?.wornHold?.asset, arousalSet.length], ["ClothGag", n]);

// Off: lets go, and says so. Failure: still held, or no word.
delete wearing.ItemMouth;
said = [];
check("gag off: one lets go", voice.checkWornHolds(clock), 1);
check("  released, watch gone, she is told", [voice.isTriggerInEffect(only()), only()?.wornHold, said.some((l) => /As it comes off/.test(l))], [false, undefined, true]);
check("  every-time: still planted for next time", !!only(), true);

// --- another item in the slot counts as the gag coming off ---------------------------------------------
clock += MIN;
putOn("ItemMouth", "BallGag");
wearing.ItemMouth = { Asset: { Name: "Muzzle" }, Property: {} }; // replaced without a message we read
check("a different item now: lets go", voice.checkWornHolds(clock), 1);

// --- the release words and the safeword still end it -----------------------------------------------------
clock += MIN;
putOn("ItemMouth", "BallGag");
check("held again", voice.isTriggerInEffect(only()), true);
say("Missy, you are released from the compulsion");
check("released by the words, gag still on", voice.isTriggerInEffect(only()), false);
const m2 = arousalSet.length;
voice.checkWornHolds(clock + 5 * MIN);
check("  the watch is dropped, nothing repeats", [only()?.wornHold, arousalSet.length], [undefined, m2]);
clock += MIN;
putOn("ItemMouth", "BallGag");
session.safeword();
voice.checkWornHolds(clock);
check("safeword: not held, watch dropped", [only() ? voice.isTriggerInEffect(only()) : false, only()?.wornHold], [false, undefined]);

// --- only arousal and orgasm repeat (DW) -------------------------------------------------------------------
check("repeats: arousal and orgasm, not undressing", [voice.repeatsWhileWorn("arousal-high"), voice.repeatsWhileWorn("orgasm-force"), voice.repeatsWhileWorn("undress-all"), voice.repeatsWhileWorn("freeze")], [true, true, false, false]);

// --- a one-time one: used up when it lets go ---------------------------------------------------------------
reset();
plant(["Missy, when anyone gags you, you are very aroused", "Missy, this trigger holds while you wear it"]);
putOn("ItemMouth", "BallGag");
check("one-time, arousal only: still held while worn", voice.isTriggerInEffect(only()), true);
delete wearing.ItemMouth;
voice.checkWornHolds(clock);
check("  gone once the gag is off", only(), undefined);

// --- a lock: held while the lock stays on -----------------------------------------------------------------
reset();
plant(["Missy, whenever anyone locks something on you, you cannot move", "Missy, this trigger holds while you wear it"]);
wearing.ItemArms = { Asset: { Name: "HempRope" }, Property: { LockedBy: "MetalPadlock" } };
handler.Callback({ Type: "Action", Content: "ActionAddLock" }, rei, "", { TargetMemberNumber: Player.MemberNumber, GroupName: "ItemArms", Assets: { NextAsset: { Name: "MetalPadlock", Group: { Name: "ItemMisc" } } } });
drainPaced();
check("locked: held, watching the lock", only()?.wornHold, { group: "ItemArms", asset: "HempRope", lock: true });
delete wearing.ItemArms.Property.LockedBy;
check("unlocked, rope still on: lets go", voice.checkWornHolds(clock), 1);

console.log(`worn-hold: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
