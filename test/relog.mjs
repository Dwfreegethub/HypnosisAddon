// A fired trigger must survive a relog — DW's "Trigger Effect Dropout on Relog".
//
// recovery.ts already knew how to put a fired trigger back on its remaining time, and
// test/recovery.mjs proves that from a hand-written saved copy. What nothing proved was that
// the copy ever got WRITTEN. It did not: a trigger normally fires outside a trance, the save
// only ran on session transitions, and the heartbeat that would have caught it is armed by one.
// So the reload found nothing saved, read the trigger's Freeze on the Emoticon item as an
// orphan from a crash, and took it off with "Something was still holding you from before."
//
// This suite runs the whole chain with no hand-written state: plant, wake, fire, reload,
// check. The reload is a SECOND copy of the bundle, imported under a query string so node
// hands back a fresh module graph — every in-memory timer, marker and flag is gone, exactly
// as on a page reload. What carries across is what really does in BC: localStorage, and our
// effects riding the Emoticon item in Player.Appearance, which is server-side.
const HYP = 246108;
const KEY = "HypnosisAddon_Session_1";

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
const store = {};
globalThis.localStorage = {
	getItem(k) { return store[k] ?? null; },
	setItem(k, v) { store[k] = v; },
	removeItem(k) { delete store[k]; },
};
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);

// A controllable clock, and timers held rather than run. Nothing here may leave a real timer
// pending, or node never exits (the same trap test-suite teardown exists for).
let now = Date.parse("2026-09-22T20:00:00Z");
Date.now = () => now;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true, due: now + ms }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = (fn, ms = 0) => { pending.push({ fn, ms, live: true, every: true }); return pending.length; };
globalThis.clearInterval = globalThis.clearTimeout;
/** Run the short one-shot timers (the trigger's paced steps), leaving the release clock alone. */
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const t = pending.find((t) => t.live && !t.every && t.ms < 60_000);
		if (!t) return;
		t.live = false;
		t.fn();
	}
};
/** One tick of every heartbeat currently armed. */
const heartbeat = () => pending.filter((t) => t.live && t.every).forEach((t) => t.fn());
/** A page reload: every timer the old page held dies with it. */
const killPage = () => pending.forEach((t) => (t.live = false));

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const saved = () => (store[KEY] ? JSON.parse(store[KEY]) : null);
const frozen = () => Player.Appearance[0].Property.Effect.includes("Freeze");

// --- page one: plant, wake, fire ------------------------------------------------------------
const one = await import("./harness-bundle.mjs");
for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction", "triggerControl"]) one.storage.setFeature(k, true);
one.storage.setTriggerDuration(10);
one.storage.setTrustValue(HYP, "GameBot", 70);
one.depth.setCurrentDepths(80, 80);
one.triggers.beginRecording(HYP, "GameBot", "sleepy time");
one.triggers.recordAction("movement-block");
one.triggers.commitRecording();
check("the trigger is planted", one.storage.listTriggers().length, 1);
// Woken: no trance from here on, which is how a trigger normally fires.
one.depth.setCurrentDepths(0, 0);

said = [];
one.voice.handleSpokenLine(HYP, "sleepy time");
drainPaced();
const trigger = one.storage.listTriggers()[0];
check("it fires outside a trance", one.voice.isTriggerInEffect(trigger), true);
check("  and freezes her", frozen(), true);
// The heart of the bug. Before the fix this was null: nothing was ever written.
check("the fired trigger is saved for a reconnect", saved()?.triggers?.map((t) => t.key), ["trigger:246108:sleepy time"]);
check("  as durable state, not a trance", saved()?.sessionLive, false);
const until = saved()?.triggers?.[0]?.until;
check("  with its absolute deadline", until, now + 10 * 60_000);
check("  and a heartbeat to keep the copy current", pending.some((t) => t.live && t.every), true);

// --- the relog, three minutes later ----------------------------------------------------------
killPage();
now += 3 * 60_000;
said = [];
const two = await import("./harness-bundle.mjs?reload=1");
check("a genuinely fresh page (no timers carried over)", two.timers.activeTimerKeys(), []);
// Before the fix this said "orphans cleared" and took the Freeze off.
check("the reload restores rather than clearing orphans", two.recovery.attemptRecovery(), "durable only");
check("  still frozen", frozen(), true);
check("  the trigger is holding her again", two.voice.isTriggerInEffect(two.storage.listTriggers()[0]), true);
check("  serving the REMAINDER, not a fresh ten minutes", two.timers.timerDeadline("trigger:246108:sleepy time"), until);
check("  and she is told something carried over", said.some((m) => /still true/.test(m)), true);
check("  not the orphan line", said.some((m) => /from before\. It has let go/.test(m)), false);
check("the restore re-arms the heartbeat", pending.some((t) => t.live && t.every), true);

// --- a second relog, after it lets go --------------------------------------------------------
// The copy on disk must follow the release, or the next reload puts back something that had
// already let go. Released by name here, the hypnotist's out-of-trance way.
two.voice.handleSpokenLine(HYP, "Missy you are released from sleepy time");
check("released by name", two.voice.isTriggerInEffect(two.storage.listTriggers()[0]), false);
check("  unfrozen", frozen(), false);
check("  and the saved copy no longer holds it", saved()?.triggers ?? [], []);
killPage();
now += 60_000;
const three = await import("./harness-bundle.mjs?reload=2");
check("a reload after the release restores nothing", three.recovery.attemptRecovery(), "nothing to do");
check("  still unfrozen", frozen(), false);

// --- away past the deadline ------------------------------------------------------------------
// The clock kept running while she was gone (the existing design: `until` is wall time). A
// ten-minute trigger does not follow her back from a twenty-minute absence.
three.voice.handleSpokenLine(HYP, "sleepy time");
drainPaced();
check("fired again on page three", frozen(), true);
check("  saved", saved()?.triggers?.length, 1);
killPage();
now += 20 * 60_000;
said = [];
const four = await import("./harness-bundle.mjs?reload=3");
const outcome = four.recovery.attemptRecovery();
check("past its deadline it does not come back", four.voice.isTriggerInEffect(four.storage.listTriggers()[0]), false);
check("  and nothing is left frozen", frozen(), false);
check("  it reports the clock ran out", outcome, "expired");
check("  and tells her so", said.some((m) => /ran its course while you were away/.test(m)), true);
check("  leaving nothing saved", saved(), null);

// --- two triggers, one ran out while away ------------------------------------------------
// The leftover Freeze must come off even when something else DOES come back: the restore puts
// back only what still has time on it, and must not leave the expired one's grip behind.
four.depth.setCurrentDepths(80, 80);
four.triggers.beginRecording(HYP, "GameBot", "hush now");
four.triggers.recordAction("speech-block");
four.triggers.commitRecording();
four.depth.setCurrentDepths(0, 0);
four.voice.handleSpokenLine(HYP, "sleepy time");
drainPaced();
now += 6 * 60_000;
four.voice.handleSpokenLine(HYP, "hush now");
drainPaced();
check("both fired", saved()?.triggers?.length, 2);
killPage();
now += 6 * 60_000; // the first is 12 min old (ran out), the second 6 (4 min left)
const five = await import("./harness-bundle.mjs?reload=4");
check("one of two still has time", five.recovery.attemptRecovery(), "durable only");
const [sleepy, hush] = ["sleepy time", "hush now"].map((p) => five.storage.listTriggers().find((t) => t.phrase === p));
check("  the expired one is not holding", five.voice.isTriggerInEffect(sleepy), false);
check("  and its freeze did not ride along", frozen(), false);
check("  the live one is", five.voice.isTriggerInEffect(hush), true);
check("  and she cannot speak", five.effects.isSpeechBlocked(), true);
check("  the saved copy holds only the live one", saved()?.triggers?.map((t) => t.key), ["trigger:246108:hush now"]);
five.session.safeword();
killPage();

// --- the safeword clears the saved copy too ---------------------------------------------------
now += 60_000;
const six = await import("./harness-bundle.mjs?reload=5");
six.recovery.attemptRecovery();
six.voice.handleSpokenLine(HYP, "sleepy time");
drainPaced();
check("fired on page six", saved()?.triggers?.length, 1);
check("  frozen", frozen(), true);
six.session.safeword();
check("the safeword leaves nothing saved", saved(), null);
check("  and nothing frozen", frozen(), false);

// Every page's timers die here, as a closed tab's would.
killPage();
console.log(`relog: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
