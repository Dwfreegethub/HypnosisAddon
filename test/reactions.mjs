// Reactions (v1.16.13; DW 2026-11-22, the "sensitive" idea): a condition line said while a WORD
// trigger is being recorded becomes a reaction of that word. "sensitive" + "whenever anyone gropes
// you, come for me": once "sensitive" is said, every grope sets the reaction off, until "sensitive"
// lets go. Stored as a compulsion gated on the word.
//
// Failure looks like: a reaction that works before the word is said or after it is released, the
// word's own planting eating the reaction as a separate compulsion, reactions surviving the word's
// removal or a re-plant, or the planter not told what was kept.
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

const { voice, storage, triggers, session, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}
    want ${JSON.stringify(want)}
    got  ${JSON.stringify(got)}`);
};
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "forcedSpeech"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10);
let clock = Date.now();
Date.now = () => clock;
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const word = () => storage.listTriggers().find((t) => t.phrase === "sensitive");
const reacts = () => storage.listTriggers().filter((t) => t.gate);
const plantSensitive = (lines) => {
	under();
	say("Missy, your trigger word is sensitive");
	for (const l of lines) say(l);
	say("Missy, remember trigger");
	session.wakeByHypnotist(HYP);
};
const grope = (who = REI) => { clock += 20_000; voice.noteActivity(who, "Grope"); drainPaced(); };

// --- planting ---------------------------------------------------------------------------------------
plantSensitive(["Missy, whenever anyone gropes you, you will say 'Oh!'"]);
check("the word is planted", !!word(), true);
check("  with one reaction, not a separate compulsion", reacts().length, 1);
check("  the reaction waits for a grope, gated on the word", [reacts()[0]?.fireOn, reacts()[0]?.act, reacts()[0]?.gate, reacts()[0]?.actions], ["act", "grope", "sensitive", ["say:1:Oh!"]]);
check("  the word carries it", word()?.actions, [`react:${reacts()[0]?.key}`]);
check("  the planter told", /Added a reaction to "sensitive": when anyone gropes them, say:1:Oh!/.test(toHyp.join(" ")), true);
check("  the save names the reaction", /Saved "sensitive"/.test(toHyp.join(" ")), true);
check("  the detail reads it", voice.describeAction(word().actions[0]), 'while it holds you, when anyone gropes you: you say "Oh!"');

// --- off until the word -------------------------------------------------------------------------------
grope();
check("before the word: a grope does nothing", spoken, []);
say("sensitive");
check("the word: it holds her", voice.isTriggerInEffect(word()), true);
grope();
check("  a grope: she reacts", spoken, ["Oh!"]);
grope(OTHER_HYP);
check("  again, from anyone: every time", spoken, ["Oh!", "Oh!"]);
check("  the reaction itself is not used up", reacts().length, 1);

// --- released: off again ------------------------------------------------------------------------------
say("Missy, you are released from sensitive");
check("released: the word lets go", voice.isTriggerInEffect(word()), false);
grope();
check("  a grope does nothing now", spoken.length, 2);

// --- in a trance too -------------------------------------------------------------------------------------
say("sensitive");
under();
check("a trance does not end the word", voice.isTriggerInEffect(word()), true);
grope();
check("under, while the word holds: still reacts", spoken.length, 3);
session.wakeByHypnotist(HYP);

// --- removal and re-planting ------------------------------------------------------------------------------
say("Missy, forget the trigger sensitive");
check("removing the word removes its reactions", [!!word(), reacts().length], [false, 0]);
plantSensitive(["Missy, whenever anyone gropes you, you will say 'Oh!'", "Missy, whenever anyone kisses you, you will say 'Mm.'"]);
check("two reactions on one word", reacts().map((r) => r.act).sort(), ["grope", "kiss"]);
plantSensitive(["Missy, whenever anyone spanks you, you will say 'Ow!'"]);
check("re-planting the word replaces its reactions", reacts().map((r) => r.act), ["spank"]);

// --- a reaction with nothing to do -------------------------------------------------------------------------
under();
say("Missy, your trigger word is tingle");
toHyp = [];
say("Missy, whenever anyone gropes you,");
check("a bare clause: told it needs the action on the line", /needs what they will do on the same line/.test(toHyp.join(" ")), true);
say("Missy, forget the trigger");
session.wakeByHypnotist(HYP);

// --- an ordinary compulsion is unchanged ------------------------------------------------------------------
storage.forgetAllTriggers();
spoken = [];
under();
say("Missy, whenever anyone licks you, you will say 'Hey!'");
say("Missy, remember trigger");
check("outside a word: still a compulsion of its own", [storage.listTriggers().length, storage.listTriggers()[0]?.gate], [1, undefined]);
grope();
voice.noteActivity(REI, "Lick");
drainPaced();
check("  not while she is under", spoken, []);
session.wakeByHypnotist(HYP);
clock += 20_000;
voice.noteActivity(REI, "Lick");
drainPaced();
check("  awake: fires", spoken, ["Hey!"]);

console.log(`reactions: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
