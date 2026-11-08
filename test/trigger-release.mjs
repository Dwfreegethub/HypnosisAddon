// "You are released from <trigger>" (v1.2.2, DW 2026-11-02: "it is not stopping triggers always").
// Each block reproduces one way the release used to fail, and says what failure looks like.
//
//   1. A compulsion (no phrase) was released in place of the trigger actually named.
//   2. Overlapping phrases: "released from sleepy time" released "sleep" instead.
//   3. A release in the first seconds left the trigger's remaining paced steps queued, so they
//      landed after "lets go", and a mantra kept being said.
//   4. A release line no name claimed fell through to firing and set the trigger off again.
//   5. Every outcome is told to the hypnotist; the subject hears "lets go" only if something did.
const HYP = 246108, ELLA = 777;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: ELLA, Name: "Ella" }];
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
globalThis.ChatRoomCharacterUpdate = () => {};
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
/** Run the paced trigger steps still queued, as the seconds after a firing would. */
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

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "forcedSpeech", "selfTouchControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);
const plant = (phrase, ...actions) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", phrase);
	for (const a of actions) triggers.recordAction(a);
	triggers.commitRecording();
};
const plantArrival = (...actions) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", "", () => false, { fireOn: "arrive", watchName: "*" });
	for (const a of actions) triggers.recordAction(a);
	triggers.commitRecording();
};
const holding = (phrase) => !!find(phrase) && voice.isTriggerInEffect(find(phrase));
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; spoken = []; };

// --- 1. a compulsion does not stand in for the trigger named ------------------------------------
reset();
plantArrival("movement-block");
toHyp = [];
plant("frozen", "movement-block");
// Failure (found writing this suite): the compulsion's "" overlapped every word, so with one
// compulsion planted no new trigger word could be planted at all.
check("a word can still be planted beside a compulsion", [storage.listTriggers().length, !!find("frozen")], [2, true]);
check("  with no 'overlaps' refusal", toHyp.some((t) => /overlaps/.test(t)), false);
reset();
depth.setCurrentDepths(80, 80);
triggers.beginRecording(ELLA, "Ella", "", () => false, { fireOn: "arrive", watchName: "*" });
triggers.recordAction("movement-block");
triggers.commitRecording();
toHyp = [];
plant("frozen", "movement-block");
check("  nor beside someone else's compulsion", !!find("frozen"), true);
storage.forgetTrigger(storage.listTriggers().find((t) => t.fireOn).key);
plantArrival("movement-block");
voice.handleSpokenLine(HYP, "frozen");
drainPaced();
check("setup: frozen holds her", holding("frozen"), true);
voice.handleSpokenLine(HYP, "Missy, you are released from frozen");
// Failure: the compulsion (phrase "") matched first and was "released"; frozen still holds.
check("the release lets go of frozen, not the compulsion", holding("frozen"), false);
check("a compulsion is never releasable by a word", triggers.triggersReleasableBy(HYP, "anything at all").length, 0);

// --- 2. the longest phrase named wins --------------------------------------------------------------
// Planting refuses an overlapping word now, so this is a pair saved before that rule: build it.
reset();
// "sleep" saved first, so it is the one a first-match would pick.
plant("sleep", "touch:breasts");
storage.saveTrigger({ ...find("sleep"), phrase: "sleepy time", key: "sleepy time", actions: ["movement-block"] });
check("setup: both saved", [!!find("sleep"), !!find("sleepy time")], [true, true]);
voice.handleSpokenLine(HYP, "sleepy time");
drainPaced();
check("setup: sleepy time holds her", holding("sleepy time"), true);
voice.handleSpokenLine(HYP, "Missy, you are released from sleepy time");
// Failure: "sleep" is a substring and was picked, so sleepy time kept holding.
check("'released from sleepy time' releases sleepy time", holding("sleepy time"), false);

// --- 3. a quick release cancels the steps still landing -----------------------------------------
reset();
plant("lockdown", "movement-block", "touch:breasts", "touch:all");
voice.handleSpokenLine(HYP, "lockdown");
// Only the first paced step has run. Release now, then let the seconds pass.
voice.handleSpokenLine(HYP, "Missy, you are released from lockdown");
said = [];
drainPaced();
// Failure: the queued touch blocks landed after the release, holding her with nothing to undo them.
check("nothing lands after the release", holding("lockdown"), false);
check("  and she is not told anything new settles", said.length, 0);
check("  no trigger timer left running", timers.activeTimerKeys().length, 0);

reset();
plant("chant", triggers.sayActionId("Good girls obey.", 5));
voice.handleSpokenLine(HYP, "chant");
check("setup: the mantra starts", spoken.length, 1);
voice.handleSpokenLine(HYP, "Missy, you are released from chant");
drainPaced();
// Failure: she said it all five times anyway.
check("a released mantra stops", spoken.length, 1);
check("  and the hypnotist hears it was released", /Released/.test(lastToHyp()), true);

// --- 4. a release line never fires the trigger -----------------------------------------------------
reset();
plant("frozen", "movement-block");
toHyp = [];
voice.handleSpokenLine(HYP, "you are released from frozen. Ella, kneel");
drainPaced();
// Failure: the ambiguous line fell through to firing and set frozen off.
check("an ambiguous release line does not fire it", holding("frozen"), false);
voice.handleSpokenLine(HYP, "frozen");
drainPaced();
check("setup: frozen holds her", holding("frozen"), true);
voice.handleSpokenLine(HYP, "you are released from frozen. Ella, kneel");
check("  and it still releases her", holding("frozen"), false);
voice.handleSpokenLine(HYP, "Ella, you are released from frozen");
drainPaced();
// Failure: a release meant for Ella fired Missy's frozen.
check("a release for someone else does not fire hers", holding("frozen"), false);

// --- 5. every outcome is said ---------------------------------------------------------------------
reset();
plant("frozen", "movement-block");
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, you are released from frozne");
// Failure: silence, so a typo looked exactly like a release that worked.
check("a wrong name is told to the hypnotist", /Nothing called "frozne"/.test(lastToHyp()), true);
check("  the subject is told nothing", said.length, 0);
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, you are released from frozen");
check("not holding: the hypnotist is told so", /not holding them/.test(lastToHyp()), true);
check("  and she is not told something let go", said.length, 0);
voice.handleSpokenLine(HYP, "frozen");
drainPaced();
toHyp = []; said = [];
voice.handleSpokenLine(HYP, "Missy, you are released from frozen");
check("holding: she feels it let go", said.some((l) => /lets go/.test(l)), true);
check("  and the hypnotist is told", /Released\. What it was holding lets go/.test(lastToHyp()), true);
toHyp = [];
voice.handleSpokenLine(ELLA, "Missy, you are released from homework");
check("a bystander with nothing planted is not messaged", toHyp.length, 0);

reset();
console.log(`trigger-release: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
