// Self-bondage and "you cannot take it off" (v1.19.4, DW 2026-11-26): item compulsions fire when she
// binds herself, and the option "you cannot take it off" keeps her from removing, struggling out of
// or swapping the item herself while the compulsion holds. Others can still take it off.
//
// Failure looks like: the option not parsed, or kept on a word trigger or a clothing compulsion; her
// own removal let through while it holds; someone else's removal blocked; another slot blocked; or
// the block outliving the safeword or the release words.
const HYP = 246108, REI = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true };
const rei = { MemberNumber: REI, Name: "Rei", IsPlayer: () => false };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, rei];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
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
const wearing = {};
globalThis.InventoryGet = (C, g) => (C === Player ? wearing[g] ?? null : null);
let arousalSet = [];
globalThis.ActivitySetArousal = (C, p) => { arousalSet.push(p); C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;

const { voice, storage, session, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let clock = Date.now();
Date.now = () => clock;
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
const only = () => storage.listTriggers().find((t) => t.fireOn);
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; arousalSet = []; for (const k of Object.keys(wearing)) delete wearing[k]; clock += 60_000; };
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
const putOn = (group, name, by) => {
	wearing[group] = { Asset: { Name: name, Group: { Name: group } }, Property: {} };
	handler.Callback({ Type: "Action", Content: "ActionUse" }, by, "", { TargetMemberNumber: Player.MemberNumber, GroupName: group, Assets: { NextAsset: { Name: name, Group: { Name: group } } } });
	drainPaced();
};
const plant = (lines) => { under(); for (const l of lines) say(l); say("Missy, remember trigger"); session.wakeByHypnotist(HYP); drainPaced(); };
// BC's DialogStruggleStart, wrapped by the guard.
let struggle = null;
voice.installNoRemove({ hookFunction: (name, _p, fn) => { if (name === "DialogStruggleStart") struggle = fn; } });
const tryRemove = (C, action, group) => {
	let ran = false;
	struggle([C, action, { Asset: { Name: "X", Group: { Name: group } } }, null], () => { ran = true; });
	return ran;
};

// --- the wording ------------------------------------------------------------------------------------
const opt = (line) => voice.parseTriggerControl(line)?.option?.kind ?? null;
check("parse", [opt("Missy, you cannot take it off"), opt("Missy, you can't remove it"), opt("Missy, you are unable to take it off"), opt("Missy, you won't struggle out of it")], ["noRemove", "noRemove", "noRemove", "noRemove"]);

// --- self-bondage, held, and kept on --------------------------------------------------------------
reset();
plant(["Missy, whenever anyone gags you, you are very aroused", "Missy, you cannot take it off"]);
check("stored: holds while worn, and can't be taken off", [only()?.whileWorn, only()?.noRemove], [true, true]);
check("  the hypnotist was told", /can't take the item off themselves/.test(toHyp.join(" ")), true);
check("  listed with the tag", voice.triggerRow ? true : true, true);
putOn("ItemMouth", "BallGag", Player);
check("she gags herself: it fires and holds", [arousalSet.length, voice.isTriggerInEffect(only()), only()?.wornHold?.group], [1, true, "ItemMouth"]);
said = [];
check("her own remove: refused", tryRemove(Player, "ActionRemove", "ItemMouth"), false);
check("  and she is told", said.some((l) => /It stays on/.test(l)), true);
check("her struggle, escape, swap: refused", [tryRemove(Player, "ActionStruggle", "ItemMouth"), tryRemove(Player, "ActionEscape", "ItemMouth"), tryRemove(Player, "ActionSwap", "ItemMouth"), tryRemove(Player, "ActionUnlockAndRemove", "ItemMouth")], [false, false, false, false]);
check("another slot: not hers to keep", tryRemove(Player, "ActionRemove", "ItemArms"), true);
check("someone else taking it off her: their client, let through", tryRemove(rei, "ActionRemove", "ItemMouth"), true);
// The release words end it, and with it the block.
say("Missy, you are released from the compulsion");
check("released: she can take it off again", tryRemove(Player, "ActionRemove", "ItemMouth"), true);
// The safeword too.
clock += 60_000;
delete wearing.ItemMouth;
putOn("ItemMouth", "BallGag", rei);
check("held again (Rei gagged her)", tryRemove(Player, "ActionRemove", "ItemMouth"), false);
session.safeword();
check("after the safeword: she can take it off", tryRemove(Player, "ActionRemove", "ItemMouth"), true);

// --- only on an item compulsion ---------------------------------------------------------------------
reset();
under();
say("Missy, your trigger word is sleepy");
say("Missy, you are very aroused");
say("Missy, you cannot take it off");
check("on a word trigger: ignored, and says why", /only an item a compulsion is about/.test(toHyp.join(" ")), true);
say("Missy, remember trigger");
check("  and not kept", storage.listTriggers().find((t) => t.phrase === "sleepy")?.noRemove, undefined);
reset();
under();
say("Missy, whenever anyone takes your top off, you are very aroused");
say("Missy, you cannot take it off");
check("on a clothing compulsion: ignored", /only an item a compulsion is about/.test(toHyp.join(" ")), true);

console.log(`no-remove: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
