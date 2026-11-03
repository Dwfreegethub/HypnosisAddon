// The hypnotist removing a trigger they planted (v1.3.0, DW 2026-11-02: "only the person that
// planted it"). Each check says what failure looks like.
//
//   1. "forget the trigger <word>" deletes it: it never fires again. No trance needed.
//   2. Only the one who planted it. Anyone else, even one her scope lets fire it, removes nothing,
//      is told nothing that confirms the word, and the word does not fire.
//   3. One holding her lets go first, so nothing is stranded.
//   4. "forget every trigger I gave you" takes all of theirs, compulsions included, and only theirs.
//   5. Ordinary lines and setting-up are left alone: "forget the trigger" still cancels a recording,
//      "I take back what I said" is conversation.
const HYP = 246108, VEX = 424242, ELLA = 777;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: VEX, Name: "Vex" }, { MemberNumber: ELLA, Name: "Ella" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push({ to: data.Target, text: m.text });
};
const hypHeard = (who = HYP) => toHyp.filter((m) => m.to === who).map((m) => m.text).join(" | ");
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
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

const { depth, voice, storage, triggers, session, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "selfTouchControl"]) storage.setFeature(k, true);
// Anyone may fire them: so a non-installer COULD set the word off, and removal must still refuse.
storage.setTriggerScope("anyone");
storage.setTriggerDuration(0);
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);
const plant = (phrase, who = HYP, ...actions) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(who, who === HYP ? "GameBot" : "Vex", phrase);
	for (const a of actions.length ? actions : ["movement-block"]) triggers.recordAction(a);
	triggers.commitRecording();
};
const plantArrival = (who = HYP) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(who, "GameBot", "", () => false, { fireOn: "arrive", watchName: "*" });
	triggers.recordAction("movement-block");
	triggers.commitRecording();
};
const holding = (phrase) => !!find(phrase) && voice.isTriggerInEffect(find(phrase));
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; };
const fireAndCheck = (phrase) => { voice.handleSpokenLine(HYP, phrase); drainPaced(); return holding(phrase); };

// --- parsing -------------------------------------------------------------------------------------
// Failure: a removal missed, or the name kept in the phrase.
const p = (t) => voice.parseTriggerRemoval(t);
check("forget the trigger X", p("Missy, forget the trigger sleepy time"), { kind: "one", phrase: "sleepy time" });
check("remove trigger word X, name after", p("remove trigger word sleepy time, Missy"), { kind: "one", phrase: "sleepy time" });
check("the trigger X is gone", p("Missy, the trigger sleepy time is gone"), { kind: "one", phrase: "sleepy time" });
check("I take back X (soft)", p("Missy, I take back sleepy time"), { kind: "one", phrase: "sleepy time", soft: true });
check("forget every trigger I gave you", p("Missy, forget every trigger I gave you"), { kind: "all" });
check("forget all your triggers", p("Missy, forget all your triggers"), { kind: "all" });
check("bare 'forget the trigger' is not a removal (it cancels)", p("Missy, forget the trigger"), null);
check("ordinary talk is not a removal", p("Missy, that was a fun scene"), null);

// --- 1. removing one, out of trance ---------------------------------------------------------------
reset();
plant("frozen");
check("setup: planted", !!find("frozen"), true);
session.safeword(); // not under: removal needs no trance
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, forget the trigger frozen");
// Failure: still planted, so it fires again next time.
check("removed", find("frozen"), undefined);
check("  the hypnotist is told", /Removed "frozen"\. It will not fire again\./.test(hypHeard()), true);
check("  she is told something is gone, not the word", said.some((l) => /is gone/.test(l) && !/frozen/.test(l)), true);
check("  saying the word does nothing now", fireAndCheck("frozen"), false);

// --- 2. only the one who planted it ------------------------------------------------------------------
reset();
plant("frozen");
toHyp = [];
voice.handleSpokenLine(VEX, "Missy, forget the trigger frozen");
drainPaced();
// Failure: someone else deleted GameBot's work.
check("someone else cannot remove it", !!find("frozen"), true);
// Failure: the removal line fell through and fired frozen (Vex is allowed to fire it).
check("  and their removal line does not fire it", holding("frozen"), false);
check("  Vex is told nothing of theirs is called that", /Nothing of yours called "frozen"/.test(hypHeard(VEX)), true);
plant("glowing", VEX);
toHyp = [];
voice.handleSpokenLine(VEX, "Missy, forget the trigger frozen");
// Failure: the reply confirms another hypnotist's word exists.
check("  once Vex has one of their own, the reply is the same (no word confirmed)", /Nothing of yours called "frozen"/.test(hypHeard(VEX)), true);
check("  still planted", !!find("frozen"), true);
voice.handleSpokenLine(HYP, "Missy, forget the trigger glowing");
check("GameBot cannot remove Vex's either", !!find("glowing"), true);
voice.handleSpokenLine(1, "Missy, forget the trigger frozen");
check("nor can she by saying it (hers is /echs forgettrigger)", !!find("frozen"), true);
toHyp = [];
voice.handleSpokenLine(HYP, "Missy, forget the trigger frozne");
check("a typo is told to the planter", /Nothing of yours called "frozne"/.test(hypHeard()), true);
voice.handleSpokenLine(HYP, "Ella, forget the trigger frozen");
drainPaced();
check("a removal said to someone else removes nothing of hers", !!find("frozen"), true);
check("  and does not fire it", holding("frozen"), false);
voice.handleSpokenLine(HYP, "forget the trigger frozen");
check("her name is needed", !!find("frozen"), true);

// --- 3. one holding her lets go first ------------------------------------------------------------------
reset();
plant("frozen");
check("setup: frozen holds her", fireAndCheck("frozen"), true);
const key = find("frozen").key;
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, the trigger frozen is gone");
check("removed while holding", find("frozen"), undefined);
// Failure: deleted with its effects still on and nothing left to release them.
check("  nothing of it is still active", timers.activeTimerKeys().includes(`trigger:${HYP}:${key}`), false);
check("  she feels it let go", said.some((l) => /lets go/.test(l)), true);
check("  the hypnotist is told it let go", /What it was holding lets go/.test(hypHeard()), true);

// --- 4. every trigger they planted, and only theirs ------------------------------------------------------
reset();
plant("frozen");
plant("hushed", HYP, "touch:breasts");
plantArrival(HYP);
plant("glowing", VEX);
check("setup: four planted", storage.listTriggers().length, 4);
fireAndCheck("frozen");
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, forget every trigger I gave you");
// Failure: one of GameBot's left (the arrival one has no word to name), or Vex's taken too.
check("all of GameBot's go, compulsion included; Vex's stays", storage.listTriggers().map((t) => t.phrase), ["glowing"]);
check("  the hypnotist is told how many", /Removed all 3 triggers you planted/.test(hypHeard()), true);
check("  and that what held her let go", /lets go/.test(hypHeard()), true);
check("  nothing of theirs still active", timers.activeTimerKeys().length, 0);
toHyp = [];
voice.handleSpokenLine(HYP, "Missy, forget every trigger I gave you");
check("again: told there is nothing", /Nothing you planted is in them/.test(hypHeard()), true);

// --- 5. setting up and conversation are left alone -----------------------------------------------------
reset();
session.forceTrance(HYP, 80, 80);
triggers.beginRecording(HYP, "GameBot", "ember glow");
check("setup: recording", triggers.isRecording(), true);
voice.handleSpokenLine(HYP, "Missy, forget the trigger");
// Failure: the bare cancel was taken as a removal and the recording stayed open.
check("bare 'forget the trigger' still cancels the one being set up", triggers.isRecording(), false);
triggers.beginRecording(HYP, "GameBot", "ember glow");
voice.handleSpokenLine(HYP, "Missy, forget the trigger ember glow");
check("naming the one being set up cancels it too", triggers.isRecording(), false);
session.safeword();
plant("frozen");
toHyp = [];
voice.handleSpokenLine(HYP, "Missy, I take back what I said");
check("'I take back what I said' removes nothing and says nothing", [!!find("frozen"), hypHeard()], [true, ""]);
voice.handleSpokenLine(HYP, "Missy, I take back frozen");
check("'I take back frozen' removes it", find("frozen"), undefined);

reset();
console.log(`trigger-remove: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
