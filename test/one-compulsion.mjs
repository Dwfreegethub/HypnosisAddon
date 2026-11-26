// One compulsion by its number (v1.19.6, DW 2026-11-26): two compulsions on blindfolds both went
// off, and the hypnotist's release and forget lines took every compulsion at once. Now "forget the
// second compulsion" / "you are released from the second compulsion" (or "compulsion 2") act on that
// one, numbered as the hypnotist's lists show them.
//
// Failure looks like: the numbered line read as all of them (or as nothing); the wrong one released
// or forgotten; the numbers in the popup and on her side disagreeing; another hypnotist's compulsion
// counted; or the all-at-once lines no longer working.
const HYP = 246108, OTHER = 777;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: OTHER, Name: "Zed" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [], lastList = null;
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") {
		toHyp.push(m.text);
		if (m.planted) lastList = m.planted;
	}
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
globalThis.ActivitySetArousal = (C, p) => { C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;

const { voice, storage, session, timers, planted, popupTriggers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let clock = Date.now();
Date.now = () => clock;
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl", "speechRestriction"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10);
const say = (line, from = HYP) => { voice.handleSpokenLine(from, line); drainPaced(); };
const plant = (lines, from = HYP) => { session.forceTrance(from, 80, 80); for (const l of lines) say(l, from); say("Missy, remember trigger", from); session.wakeByHypnotist(from); drainPaced(); clock += 60_000; };
const mine = () => storage.listTriggers().filter((t) => t.fireOn && t.installedBy === HYP);
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
const blindfold = (by) => {
	wearing.ItemHead = { Asset: { Name: "LeatherBlindfold", Group: { Name: "ItemHead" } }, Property: {} };
	handler.Callback({ Type: "Action", Content: "ActionUse" }, { MemberNumber: by }, "", { TargetMemberNumber: Player.MemberNumber, GroupName: "ItemHead", Assets: { NextAsset: { Name: "LeatherBlindfold", Group: { Name: "ItemHead" } } } });
	drainPaced();
};

// --- the wording ------------------------------------------------------------------------------------
const p = (t) => voice.parseNumberedCompulsion(t);
check("parse: ordinals and digits", [
	p("Missy, forget the second compulsion"), p("Missy, you are released from the first compulsion"), p("Missy, I release you from your third compulsion"),
	p("Missy, forget compulsion 2"), p("Missy, remove compulsion #12"), p("Missy, you are released from compulsion number 3"), p("Missy, forget the twenty-first compulsion"),
], [
	{ verb: "forget", n: 2 }, { verb: "release", n: 1 }, { verb: "release", n: 3 },
	{ verb: "forget", n: 2 }, { verb: "forget", n: 12 }, { verb: "release", n: 3 }, { verb: "forget", n: 21 },
]);
check("parse: the all-of-them lines are not numbered", [p("Missy, forget your compulsions"), p("Missy, you are released from the compulsion"), p("Missy, forget compulsion 0")], [null, null, null]);
check("removal: numbered, then all", [voice.parseTriggerRemoval("Missy, forget the second compulsion"), voice.parseTriggerRemoval("Missy, forget compulsion 2")?.kind, voice.parseTriggerRemoval("Missy, forget your compulsions")?.kind], [{ kind: "compulsion", n: 2 }, "compulsion", "compulsions"]);
check("the popup's lines read back as their number", popupTriggers.compulsionLines(2).map((l) => p(`Missy, ${l.phrase}`)), [{ verb: "release", n: 2 }, { verb: "forget", n: 2 }]);
check("  and every number up to the list's cap", Array.from({ length: 30 }, (_, i) => p(`Missy, ${popupTriggers.compulsionLines(i + 1)[1].phrase}`)?.n), Array.from({ length: 30 }, (_, i) => i + 1));
check("the popup line is still a release / removal line (never fires a word)", [voice.isTriggerReleaseLine(`Missy, ${popupTriggers.compulsionLines(1)[0].phrase}`), voice.isTriggerRemovalLine(`Missy, ${popupTriggers.compulsionLines(1)[1].phrase}`)], [true, true]);

// --- two on blindfolds ------------------------------------------------------------------------------
plant(["Missy, whenever anyone blindfolds you, you cannot speak"]);
plant(["Missy, whenever anyone blindfolds you, you cannot move"]);
plant(["Missy, whenever anyone gags you, you cannot move"], OTHER); // Zed's: not in GameBot's numbers
check("three planted, two of them GameBot's", [storage.listTriggers().filter((t) => t.fireOn).length, mine().length], [3, 2]);
const [first, second] = mine();
const numbers = planted.compulsionNumbers(planted.plantedEntriesFor(HYP));
check("her numbering matches the list the popup gets", [numbers, voice.compulsionsNumberedFor(HYP).map((t) => t.key)], [[1, 2], [first.key, second.key]]);
check("titles carry the number", planted.plantedEntriesFor(HYP).map((e, i) => planted.plantedTitle(e, numbers[i])), ["Compulsion 1: when anyone blindfolds you", "Compulsion 2: when anyone blindfolds you"]);
blindfold(OTHER);
check("both go off", [voice.isTriggerInEffect(first), voice.isTriggerInEffect(second)], [true, true]);

toHyp = [];
say("Missy, you are released from the second compulsion");
check("release the second: only it lets go", [voice.isTriggerInEffect(first), voice.isTriggerInEffect(second), mine().length], [true, false, 2]);
check("  told which", /Released\. Compulsion 2 \(when anyone blindfolds them\) let go; it is still planted/.test(toHyp.join(" ")), true);
toHyp = [];
say("Missy, you are released from compulsion 2");
check("again: it was not holding", /was not holding them right now/.test(toHyp.join(" ")), true);

toHyp = [];
say("Missy, forget the first compulsion");
check("forget the first: it lets go and is gone, the second stays", [mine().map((t) => t.key), storage.listTriggers().some((t) => t.key === first.key)], [[second.key], false]);
check("  told which, and that the numbers move up", /They forgot compulsion 1 \(when anyone blindfolds them\)\. It will not go off again\. What it was holding lets go\. The ones after it move up a number\./.test(toHyp.join(" ")), true);
check("  and the popup's list comes back renumbered", lastList?.length, 1);
check("Zed's is untouched", storage.listTriggers().filter((t) => t.installedBy === OTHER).length, 1);

toHyp = [];
say("Missy, forget the third compulsion");
check("no such number: says how many", /There is no compulsion 3 of yours in them: you have 1\./.test(toHyp.join(" ")), true);
check("  and forgets nothing", mine().length, 1);
toHyp = [];
say("Missy, forget compulsion 1", OTHER);
check("Zed's own numbering: his first is his gag one", storage.listTriggers().filter((t) => t.installedBy === OTHER).length, 0);
check("  and GameBot's stays", mine().length, 1);

// --- all at once still works --------------------------------------------------------------------------
plant(["Missy, whenever anyone blindfolds you, you cannot speak"]);
say("Missy, forget your compulsions");
check("forget your compulsions: all of them", mine().length, 0);

// --- the popup ---------------------------------------------------------------------------------------
check("all-at-once chips relabelled", popupTriggers.COMPULSION_LINES.map((l) => l.label), ["release all", "forget all"]);

console.log(`one-compulsion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
