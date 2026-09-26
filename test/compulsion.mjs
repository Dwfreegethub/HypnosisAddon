// Delayed compulsions, Build 6 of the trigger overhaul (design.md, "Trigger Overhaul"; shipped
// inside v0.90.0 at DW's request, 2026-09-25).
//
// A trigger with no word, waiting for a condition: a time after the subject wakes, someone coming
// in, or someone speaking. Planted with a start line that names the condition. Post-hypnotic:
// never fires while she is under. One-time unless said otherwise. The safeword discards the
// after-waking ones. The wake clock is a stored time, so it outlives clearAllTimers and reloads.
//
// Every block states what failure looks like.
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

const { depth, voice, storage, triggers, session, timers, menu } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const MIN = 60_000;

// --- parsing -----------------------------------------------------------------------------------
// Failure: a condition missed, the wrong delay or person, or an ordinary line read as one.
const c = (t) => voice.parseCondition(t);
check("wake + delay", c("Missy, five minutes after you wake, you will kneel"), { fireOn: "wake", delayMs: 5 * MIN, rest: "you will kneel" });
check("digits, 'waking'", c("Missy, 3 minutes after waking you will say 'I obey'"), { fireOn: "wake", delayMs: 3 * MIN, rest: "you will say i obey" });
check("the moment you wake", c("Missy, when you wake up, you cannot move"), { fireOn: "wake", delayMs: 0, rest: "you cannot move" });
check("a clause alone", c("Missy, an hour after you wake up"), { fireOn: "wake", delayMs: 60 * MIN, rest: "" });
check("arrival", c("Missy, when Rei comes in, you will kneel"), { fireOn: "arrive", who: "rei", rest: "you will kneel" });
check("arrival, 'I come back', 'then'", c("Missy, when I come back then you will drop into trance"), { fireOn: "arrive", who: "i", rest: "you will drop into trance" });
check("speech", c("Missy, when Rei speaks, you will say 'yes'"), { fireOn: "speak", who: "rei", rest: "you will say yes" });
check("a voice", c("Missy, when you hear Rei's voice, you cannot move"), { fireOn: "speak", who: "rei", rest: "you cannot move" });
for (const line of ["Missy, you cannot move", "Missy, your trigger word is ember glow", "Missy, wake up", "Missy, stay still until Rei arrives"]) {
	check(`not a condition: "${line}"`, c(line), null);
}
check("'when you hear X's voice' is a condition, not a trigger word", voice.parseTriggerControl("Missy, when you hear Rei's voice, you cannot move")?.kind, "condition");

// --- setup ---------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "forcedSpeech"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);
const under = (who = HYP) => session.forceTrance(who, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const compulsions = () => storage.listTriggers().filter((t) => t.fireOn);
const only = () => compulsions()[0];
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; spoken = []; };
/** Plant a compulsion the way a hypnotist would: a condition line, then "remember trigger". */
const plant = (line, extra = []) => {
	under();
	say(line);
	for (const l of extra) say(l);
	say("Missy, remember trigger");
	return only();
};

// --- planting a wake compulsion --------------------------------------------------------------------
// Failure: not stored, stored as a phrase trigger, not one-time, or the hypnotist not told when.
reset();
let t = plant("Missy, five minutes after you wake, you cannot move");
check("stored as a wake compulsion", [t?.fireOn, t?.delayMs, t?.phrase], ["wake", 5 * MIN, ""]);
check("  with the action", t?.actions, ["movement-block"]);
check("  one-time by default", t?.oneShot, true);
check("  with a key of its own", /^wake:246108:\d+$/.test(t?.key ?? ""), true);
check("  the hypnotist told when it fires", /It fires 5 minutes after they wake/.test(lastToHyp()), true);
check("  dormant while she is still under", t?.dueAt, undefined);
check("  not done at planting (recorded, not performed)", voice.isTriggerInEffect(t), false);

// --- arming on wake, firing when due -----------------------------------------------------------------
// Failure: not armed by the wake, fires early, or does not fire when due.
const woke = Date.now();
session.wakeByHypnotist(HYP);
t = only();
check("the wake arms it", typeof t?.dueAt === "number" && t.dueAt >= woke + 5 * MIN - 50 && t.dueAt <= Date.now() + 5 * MIN, true);
check("  the detail says so", /When: 5 minutes after you wake — due in/.test(voice.describeTriggerDetail(1, false).join(" ")), true);
check("not yet at four minutes", voice.checkDueCompulsions(woke + 4 * MIN), 0);
check("fires when due", voice.checkDueCompulsions(woke + 5 * MIN + 1000), 1);
t = only();
check("  and holds her (spent, kept until it lets go)", [voice.isTriggerInEffect(t), t?.spent], [true, true]);
check("  never twice", voice.checkDueCompulsions(woke + 6 * MIN), 0);

// A trance ending clears every timer; the due time is stored, so it survives. Failure: gone.
reset();
plant("Missy, ten minutes after you wake, you cannot move");
session.wakeByHypnotist(HYP);
timers.clearAllTimers();
check("the due time survives clearAllTimers", typeof only()?.dueAt, "number");

// --- the safeword discards them ------------------------------------------------------------------------
// Failure: something she said stop to goes off minutes later.
session.safeword();
check("safeword: an armed wake compulsion is gone", compulsions().length, 0);
plant("Missy, ten minutes after you wake, you cannot move");
session.safeword();
check("safeword: a dormant one too", compulsions().length, 0);

// --- only its installer's trance arms it ----------------------------------------------------------------
// Failure: Vex waking her arms GameBot's compulsion.
reset();
plant("Missy, ten minutes after you wake, you cannot move");
// Replace GameBot's trance with Vex's directly (no wake event in between), then Vex wakes her.
session.forceTrance(OTHER_HYP, 60, 60);
session.wakeByHypnotist(OTHER_HYP);
check("another hypnotist's wake does not arm it", only()?.dueAt, undefined);

// --- never while she is under -------------------------------------------------------------------------
reset();
plant("Missy, when you wake up, you cannot move");
session.wakeByHypnotist(HYP);
under();
check("due, but she is under again: waits", voice.checkDueCompulsions(Date.now() + 1000), 0);
session.wakeByHypnotist(HYP);
check("  and fires once she is awake", voice.checkDueCompulsions(Date.now() + 1000), 1);

// --- every time ---------------------------------------------------------------------------------------
// Failure: an every-time compulsion is used up, or does not re-arm.
reset();
plant("Missy, when you wake up, you cannot move", ["Missy, it works every time"]);
check("every time: not one-shot", only()?.oneShot, undefined);
session.wakeByHypnotist(HYP);
voice.checkDueCompulsions(Date.now() + 1000);
check("  fired, and back to waiting", [voice.isTriggerInEffect(only()), only()?.dueAt], [true, undefined]);
timers.clearAllTimers();
under();
session.wakeByHypnotist(HYP);
check("  re-armed by the next wake", typeof only()?.dueAt, "number");

// --- arrival ----------------------------------------------------------------------------------------
// Failure: the wrong person sets it off, it fires while she is under, or not at all.
reset();
t = plant("Missy, when Rei comes in, you will say 'Hello, Rei.'");
check("arrival: watching Rei, by number", [t?.fireOn, t?.watchName, t?.watchMember], ["arrive", "rei", REI]);
voice.noteArrival(REI);
check("  not while she is under", spoken, []);
session.wakeByHypnotist(HYP);
voice.noteArrival(OTHER_HYP);
check("  not for someone else", spoken, []);
voice.noteArrival(REI);
drainPaced();
check("  Rei comes in: she speaks", spoken, ["Hello, Rei."]);
voice.noteArrival(REI);
drainPaced();
check("  once only", spoken.length, 1);

// Someone not in the room at planting, matched by name when they arrive.
reset();
t = plant("Missy, when Zed comes in, you cannot move");
check("an absent name is kept by name", [t?.watchName, t?.watchMember], ["zed", undefined]);
session.wakeByHypnotist(HYP);
ChatRoomCharacter.push({ MemberNumber: ZED, Name: "Zed" });
voice.noteArrival(ZED);
drainPaced();
check("  Zed arrives: it fires", voice.isTriggerInEffect(only()), true);
ChatRoomCharacter.pop();

// "When I come back": the installer.
reset();
t = plant("Missy, when I come back, you cannot move");
check("'I' is the installer", t?.watchMember, HYP);
session.wakeByHypnotist(HYP);
voice.noteArrival(HYP);
drainPaced();
check("  they come back: it fires", voice.isTriggerInEffect(only()), true);

// A pronoun names nobody. Failure: a compulsion watching "she".
reset();
under();
say("Missy, when she comes in, you cannot move");
check("'she' is not a condition: nothing recording", triggers.isRecording(), false);

// --- speech ------------------------------------------------------------------------------------------
reset();
t = plant("Missy, when Rei speaks, you cannot move");
session.wakeByHypnotist(HYP);
say("hello everyone", REI);
check("Rei speaks: it fires", voice.isTriggerInEffect(only()), true);

// --- a wake clause with nothing to keep after it (v0.92.4) -------------------------------------------------
// "when you wake up you will feel refreshed" used to WAKE her, since it contains "wake"; so did every
// wording the parser missed ("after you wake up, …"), which is how DW found it. Now she stays under
// and the hypnotist is told. Failure: she wakes, a recording is left open, or nothing is said.
reset();
under();
say("Missy, when you wake up you will feel refreshed");
check("nothing kept: no recording left open", triggers.isRecording(), false);
check("  no compulsion stored", compulsions().length, 0);
check("  the hypnotist told, and told she is still under", /none was set up\. They are still under/.test(toHyp.join(" ")), true);
check("  she is NOT woken by it", session.isHypnotized(), true);
// The same line that ALSO says to wake up is a wake-up. Failure: she stays under.
reset();
under();
say("Missy, when you wake up you will feel refreshed. Wake up now");
check("patter + 'wake up now': wakes her", session.isHypnotized(), false);
check("  and plants nothing", compulsions().length, 0);
reset();
under();
say("Missy, wake up");
check("a plain 'wake up' still wakes her", session.isHypnotized(), false);

// --- the ways of saying "after you wake" (v0.92.4) -------------------------------------------------------
// Each used to fall through to the wake handler and wake her. Failure: not a wake condition, or the
// wrong delay. And the reverse: ordinary wake-ups must not read as conditions.
for (const [line, delay] of [
	["Missy, after you wake up, you cannot move", 0],
	["Missy, after you wake, you will kneel", 0],
	["Missy, right after you wake up, kneel", 0],
	["Missy, when you awaken, you cannot move", 0],
	["Missy, once you are awake again, you cannot move", 0],
	["Missy, upon waking, you cannot move", 0],
	["Missy, after waking you cannot move", 0],
	["Missy, when you come out of the trance, you cannot move", 0],
	["Missy, five minutes after you are awake, you cannot move", 5 * MIN],
]) {
	check(`wording: "${line}"`, [c(line)?.fireOn, c(line)?.delayMs], ["wake", delay]);
}
for (const line of ["Missy, wake up", "Missy, come on, you, wake up", "Missy, you are awake now", "Missy, wake up after I count to three"]) {
	check(`still a wake-up, not a condition: "${line}"`, c(line), null);
}
reset();
t = plant("Missy, after you wake up, you cannot move");
check("'after you wake up' plants, and leaves her under", [t?.fireOn, t?.actions, session.isHypnotized()], ["wake", ["movement-block"], true]);

// --- a clause alone stays open for the lines after it ---------------------------------------------------
reset();
under();
say("Missy, when Rei comes in");
check("a clause alone: recording", triggers.isRecording(), true);
say("Missy, you cannot move");
say("Missy, remember trigger");
check("  and the next line is what it does", only()?.actions, ["movement-block"]);

// --- the list, the detail and Purge ------------------------------------------------------------------------
// Failure: a compulsion shows an empty quoted word, or cannot be purged.
storage.setFeature("showTriggerWords", true);
check("the list shows no empty word", /""/.test(voice.describeTriggerList(false).join(" ")), false);
storage.setFeature("showTriggerWords", false);
check("the detail names the condition", /When: when Rei comes in/i.test(voice.describeTriggerDetail(1, false).join(" ")), true);
session.wakeByHypnotist(HYP);
check("Purge removes a compulsion", menu.purgePlanted(1), "Trigger 1 removed.");
check("  gone", compulsions().length, 0);

// --- normalise ---------------------------------------------------------------------------------------------
// Failure: junk condition fields survive a load.
{
	const lz = (await import("lz-string")).default;
	const blob = { version: "0.90.0", trust: [], experience: 0, triggerScope: "hypnotist", triggerDurationMinutes: 5, decayRate: "never", triggerDecayRate: "never", depthGates: {}, chemicalScope: "arousal", relationshipOverride: {}, features: { hypnoEnabled: true },
		triggers: [{ phrase: "", key: "wake:1:2", actions: ["movement-block"], installedBy: HYP, installedByName: "GameBot", installedAt: 1, plantedDepth: 60, plantedChemical: false, reinforcedAt: 1, firings: 0, fireOn: "sometime", delayMs: -5, dueAt: "later", watchName: 7, watchMember: "rei" }] };
	storage.importSettings(lz.compressToBase64(JSON.stringify(blob)));
	const j = storage.listTriggers()[0];
	check("junk condition fields are dropped", [j?.fireOn, j?.delayMs, j?.dueAt, j?.watchName, j?.watchMember], [undefined, undefined, undefined, undefined, undefined]);
}

console.log(`compulsion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
