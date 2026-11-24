// "When anyone gags you" (v1.16.15, DW 2026-11-23, from a player's suggestion): compulsions that wait
// for an item put on her through BC's item menu, or a lock added, instead of an activity.
//
// Failure looks like: a wording that plants the wrong act; the wrong slot setting it off; an item
// put on someone else, a used-not-worn item, or a removal setting it off; activities and items
// mixing ("does anything to you" firing on a gag, a gag firing a kiss compulsion); or her own items.
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

const { voice, storage, triggers, session, timers, compulsionActs } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const MIN = 60_000;
// --- setup -----------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "forcedSpeech"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);
const under = (who = HYP) => session.forceTrance(who, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const compulsions = () => storage.listTriggers().filter((t) => t.fireOn);
const only = () => compulsions()[0];
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; spoken = []; clock += 60_000; };
let clock = Date.now();
Date.now = () => clock;
const plant = (line, extra = []) => {
	under();
	say(line);
	for (const l of extra) say(l);
	say("Missy, remember trigger");
	return only();
};

// BC R134's message as the metadata extractor hands it over (ChatRoom.js ChatRoomPublishAction).
const asset = (Group, Name, Wear = true) => ({ Name, Group: { Name: Group }, Wear });
const msg = (Content, target, next, group = next?.Group?.Name) => [
	{ Type: "Action", Content },
	{ TargetMemberNumber: target, GroupName: group, Assets: next ? { NextAsset: next } : undefined },
];
const ev = (Content, next, target = Player.MemberNumber, group) => voice.itemEventOf(...msg(Content, target, next, group));

// --- reading BC's message ------------------------------------------------------------------------
check("a gag put on her", ev("ActionUse", asset("ItemMouth", "BallGag")), "item:ItemMouth");
check("a gag swapped for another", ev("ActionSwap", asset("ItemMouth2", "ClothGag")), "item:ItemMouth2");
check("a lock added: the slot it locks", ev("ActionAddLock", asset("ItemMisc", "MetalPadlock"), Player.MemberNumber, "ItemArms"), "lock:ItemArms");
check("on someone else: nothing", ev("ActionUse", asset("ItemMouth", "BallGag"), REI), null);
check("an item only used (a feather): nothing", ev("ActionUse", asset("ItemHands", "Feather", false)), null);
check("a removal: nothing", ev("ActionRemove", null, Player.MemberNumber, "ItemMouth"), null);
check("a chat line: nothing", voice.itemEventOf({ Type: "Chat", Content: "ActionUse" }, { TargetMemberNumber: Player.MemberNumber }), null);

// --- which slot counts for which act ---------------------------------------------------------------
const m = compulsionActs.actMatches;
check("gag: any of the three mouth slots", ["ItemMouth", "ItemMouth2", "ItemMouth3"].map((g) => m("gag", `item:${g}`)), [true, true, true]);
check("gag: not the arms", m("gag", "item:ItemArms"), false);
check("arms vs legs", [m("arms", "item:ItemHands"), m("arms", "item:ItemFeet"), m("legs", "item:ItemFeet"), m("legs", "item:ItemArms")], [true, false, true, false]);
check("ties you up: any restraint slot, not clothing", [m("bind", "item:ItemDevices"), m("bind", "item:Cloth")], [true, false]);
check("a lock is not an item going on, and back", [m("lock", "lock:ItemArms"), m("lock", "item:ItemArms"), m("bind", "lock:ItemArms")], [true, false, false]);
check("activities and items never mix", [m("any", "item:ItemMouth"), m("kiss", "item:ItemMouth"), m("gag", "Kiss")], [false, false, false]);

// Penetration (v1.16.16): activities, not items. Failure: "fucks you" taking the wrong activity or
// waiting for an item.
check("fucks you: slow and fast, not reverse", [m("fuck", "PenetrateSlow"), m("fuck", "PenetrateFast"), m("fuck", "ReversePenetratePussy"), m("fuck", "item:ItemVulva")], [true, true, false, false]);
// "rides you" was taken back out in v1.16.17: R134 has no ReversePenetrate activity to wait for.
check("no rides you (nothing in BC could set it off)", compulsionActs.compulsionAct("ride"), undefined);
check("sucks your strap-on: SuckPenetrateItem only", [m("suck", "SuckPenetrateItem"), m("suck", "PenetrateSlow"), m("fuck", "SuckPenetrateItem")], [true, false, false]);
check("does anything to you still includes them", m("any", "PenetrateFast"), true);

// --- wordings ----------------------------------------------------------------------------------------
const c = (line) => voice.parseCondition(line)?.act;
check("gag wordings", [c("Missy, when anyone gags you, moan"), c("Missy, whenever anyone puts a gag in your mouth, moan"), c("Missy, when Rei puts a gag on you, moan")], ["gag", "gag", "gag"]);
check("arms / legs / up", [c("Missy, when anyone cuffs your wrists, kneel"), c("Missy, when anyone ties your ankles together, kneel"), c("Missy, when anyone ties you up, kneel")], ["arms", "legs", "bind"]);
check("blindfold, hood, collar, lock", [c("Missy, when anyone blindfolds you, kneel"), c("Missy, when anyone hoods you, kneel"), c("Missy, when I collar you, kneel"), c("Missy, when anyone locks your gag, kneel")], ["blindfold", "blindfold", "collar", "lock"]);
check("fuck wordings", [c("Missy, whenever anyone fucks you, moan"), c("Missy, when Rei penetrates you, moan"), c("Missy, when I fuck your mouth, moan"), c("Missy, when anyone rides you, moan")], ["fuck", "fuck", "fuck", undefined]);
check("suck wordings", [c("Missy, whenever anyone sucks your strap-on, moan"), c("Missy, when Rei sucks on your strap on, moan"), c("Missy, when I suck your dildo, moan"), c("Missy, when anyone sucks your nipples, moan")], ["suck", "suck", "suck", undefined]);
check("the old ones are unchanged", [c("Missy, when anyone pulls your hair, kneel"), c("Missy, when anyone kisses you, kneel")], ["pull", "kiss"]);

// --- end to end through the message handler --------------------------------------------------------
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
const rei = ChatRoomCharacter.find((x) => x.MemberNumber === REI);
reset();
const t = plant("Missy, whenever anyone gags you, you will say 'Mmmph!'");
check("stored as an item compulsion", [t?.fireOn, t?.act, t?.watchName], ["act", "gag", "*"]);
check("  the hypnotist told when it fires", /It fires when anyone gags them\./.test(lastToHyp()), true);
session.wakeByHypnotist(HYP);
const fire = (target, next, by = rei) => { const [d, meta] = msg("ActionUse", target, next); const r = handler.Callback(d, by, "", meta); drainPaced(); return r; };
fire(Player.MemberNumber, asset("ItemArms", "HempRope"));
check("  rope on her arms: nothing", spoken, []);
fire(REI, asset("ItemMouth", "BallGag"));
check("  a gag on someone else: nothing", spoken, []);
fire(Player.MemberNumber, asset("ItemMouth", "BallGag"), Player);
check("  her own gag on herself: nothing", spoken, []);
check("  never stops the message", fire(Player.MemberNumber, asset("ItemMouth", "BallGag")), false);
check("  Rei gags her: it fires", spoken, ["Mmmph!"]);

console.log(`item-compulsion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
