// "When anyone X you" compulsions (v1.16.9; DW 2026-11-22: "can we do 'When anyone X' and make a
// list that X can be"). A compulsion that waits for a BC activity done TO the subject: a kiss, a
// spank, a hug... from anyone, a named person, or the hypnotist.
//
// Failure looks like: a wording on the list that doesn't plant, the wrong activity setting it off,
// someone else's activity (or her own) setting it off, firing while she is under, firing twice from
// one run of clicks, or an old save with a bad act kept.
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

// --- parsing --------------------------------------------------------------------------------------
const c = (t) => voice.parseCondition(t);
check("anyone kisses you", c("Missy, when anyone kisses you, you will kneel"), { fireOn: "act", who: "anyone", act: "kiss", rest: "you will kneel" });
check("a name, a body part", c("Missy, when Rei spanks your butt, you cannot move"), { fireOn: "act", who: "rei", act: "spank", rest: "you cannot move" });
check("'I' (the hypnotist), base verb", c("Missy, when I tickle you, you will say 'hee'"), { fireOn: "act", who: "i", act: "tickle", rest: "you will say hee" });
check("as soon as someone hugs you", c("Missy, as soon as someone hugs you, you will kneel")?.act, "hug");
check("pulls your hair", c("Missy, when anyone pulls your hair, you will kneel")?.act, "pull");
check("does anything to you", c("Missy, when anyone does anything to you, you will kneel")?.act, "any");
check("'you' doing it is no one", c("Missy, when you kiss me, you will kneel"), null);
check("an ordinary command is not one", c("Missy, kiss me"), null);
check("still a condition for the setup parser", voice.parseTriggerControl("Missy, when anyone kisses you, you will kneel")?.kind, "condition");
// Every entry on the list plants, in both forms (the popup's hint and the help promise all of them).
const listWrong = [];
check("the list is not empty", compulsionActs.COMPULSION_ACTS.length > 10, true);
for (const a of compulsionActs.COMPULSION_ACTS) {
	const third = c(`Missy, when anyone ${a.label}, you will kneel`);
	const mine = c(`Missy, when I ${a.base}, you will kneel`);
	if (third?.act !== a.key || mine?.act !== a.key) listWrong.push(`${a.key}: ${JSON.stringify(third)} / ${JSON.stringify(mine)}`);
}
check("every act on the list parses", listWrong, []);

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

// --- anyone kisses you ------------------------------------------------------------------------------
reset();
let t = plant("Missy, when anyone kisses you, you will say 'Mmm.'");
check("stored as an act compulsion", [t?.fireOn, t?.act, t?.watchName, t?.phrase], ["act", "kiss", "*", ""]);
check("  one-time by default", t?.oneShot, true);
check("  the hypnotist told when it fires", /It fires when anyone kisses them\./.test(lastToHyp()), true);
check("  the detail in her words", /When: when anyone kisses you\./.test(voice.describeTriggerDetail(1, false).join(" ")), true);
voice.noteActivity(REI, "Kiss");
drainPaced();
check("  not while she is under", spoken, []);
session.wakeByHypnotist(HYP);
voice.noteActivity(REI, "Spank");
drainPaced();
check("  not for another activity", spoken, []);
voice.noteActivity(Player.MemberNumber, "Kiss");
drainPaced();
check("  not for her own", spoken, []);
voice.noteActivity(REI, "FrenchKiss");
drainPaced();
check("  a French kiss counts as a kiss", spoken, ["Mmm."]);
voice.noteActivity(OTHER_HYP, "Kiss");
drainPaced();
check("  once only", spoken.length, 1);

// --- a named person, every time, with a rest between ---------------------------------------------------------
reset();
t = plant("Missy, when Rei spanks you, you will say 'Ow!'", ["Missy, this trigger works every time"]);
check("watching Rei, every time", [t?.act, t?.watchMember, t?.oneShot === true], ["spank", REI, false]);
check("  the hypnotist's words name Rei", /It fires when Rei spanks them./.test(toHyp.join(" ")), true);
session.wakeByHypnotist(HYP);
voice.noteActivity(OTHER_HYP, "Spank");
drainPaced();
check("  someone else's spank: nothing", spoken, []);
voice.noteActivity(REI, "Spank");
drainPaced();
check("  Rei's: it fires", spoken, ["Ow!"]);
clock += 5_000;
voice.noteActivity(REI, "Spank");
drainPaced();
check("  a second click within the rest: nothing", spoken.length, 1);
clock += 20_000;
voice.noteActivity(REI, "Spank");
drainPaced();
check("  after the rest: again", spoken.length, 2);

// --- "when I ..." and "anything" ---------------------------------------------------------------------
reset();
t = plant("Missy, when I hug you, you cannot move");
check("'I' is the hypnotist", [t?.act, t?.watchMember], ["hug", HYP]);
check("  told to the hypnotist as 'you hug them'", /It fires when you hug them\./.test(lastToHyp()), true);
session.wakeByHypnotist(HYP);
voice.noteActivity(HYP, "Cuddle");
drainPaced();
check("  their hug: it fires", voice.isTriggerInEffect(only()), true);
reset();
t = plant("Missy, when anyone does anything to you, you will say 'Eep.'");
session.wakeByHypnotist(HYP);
voice.noteActivity(REI, "Scratch");
drainPaced();
check("'anything': any activity fires it", spoken, ["Eep."]);

// --- the game's activity message ----------------------------------------------------------------------
// Failure: an activity aimed at someone else sets hers off.
let handler = null;
globalThis.ChatRoomRegisterMessageHandler = (h) => { if (h.Description.includes("activity compulsions")) handler = h; };
voice.installCompulsions();
check("a message handler is registered", typeof handler?.Callback, "function");
reset();
plant("Missy, when anyone licks you, you will say 'Hey!'");
session.wakeByHypnotist(HYP);
const rei = ChatRoomCharacter.find((x) => x.MemberNumber === REI);
check("  never stops the message", handler.Callback({}, rei, "", { ActivityName: "Lick", TargetMemberNumber: OTHER_HYP }), false);
drainPaced();
check("  aimed at someone else: nothing", spoken, []);
handler.Callback({}, rei, "", { ActivityName: "Lick", TargetMemberNumber: Player.MemberNumber });
drainPaced();
check("  aimed at her: it fires", spoken, ["Hey!"]);

// --- releasing and removing compulsions (v1.16.10) --------------------------------------------------
// Failure: no way to let go of one holding her without deleting everything; someone else's words
// doing it; "forget your compulsions" taking the word triggers too; or the words read as a trigger
// word called "the compulsion".
check("parse: release", [voice.isCompulsionReleaseLine("Missy, you are released from the compulsion"), voice.isCompulsionReleaseLine("Missy, I release you from all your compulsions"), voice.isCompulsionReleaseLine("Missy, you are released from sleepy time")], [true, true, false]);
check("parse: remove", [voice.parseTriggerRemoval("Missy, forget your compulsions")?.kind, voice.parseTriggerRemoval("Missy, remove the compulsion")?.kind, voice.parseTriggerRemoval("Missy, forget every trigger I gave you")?.kind, voice.parseTriggerRemoval("Missy, forget the trigger sleepy time")?.kind], ["compulsions", "compulsions", "all", "one"]);
// A one-time one is used up when it lets go, as a word trigger is, and the planter is told so.
reset();
plant("Missy, when anyone licks you, you cannot move");
session.wakeByHypnotist(HYP);
clock += 60_000;
voice.noteActivity(REI, "Lick");
drainPaced();
toHyp = [];
say("Missy, you are released from the compulsion");
check("one-time: lets go, used up, and says so", [compulsions().length, /it was one-time, so it is used up/.test(toHyp.join(" "))], [0, true]);
// An every-time one stays planted.
reset();
plant("Missy, when anyone kisses you, you cannot move", ["Missy, this trigger works every time"]);
under();
say("Missy, your trigger word is ember glow");
say("Missy, you cannot move");
say("Missy, remember trigger");
session.wakeByHypnotist(HYP);
const comp = () => compulsions()[0];
const word = () => storage.listTriggers().find((t) => !t.fireOn);
check("set up: a compulsion and a word", [compulsions().length, word()?.phrase], [1, "ember glow"]);
voice.noteActivity(REI, "Kiss");
drainPaced();
check("  the kiss: it holds her", voice.isTriggerInEffect(comp()), true);
toHyp = [];
say("Missy, you are released from the compulsion", OTHER_HYP);
check("someone else's release: still holding", voice.isTriggerInEffect(comp()), true);
say("Missy, you are released from the compulsion");
check("the planter's release: lets go", voice.isTriggerInEffect(comp()), false);
check("  still planted", compulsions().length, 1);
check("  the planter told", /Released\. The compulsion holding them let go; still planted\./.test(toHyp.join(" ")), true);
check("  not read as a word called 'the compulsion'", toHyp.some((m) => m.includes('Nothing called')), false);
// The one who SET IT OFF may release it too, while it holds (DW: "when someone gropes you... then
// who can free you of it"). Failure: Rei can't, Rei can once it has let go, or Rei can remove it.
clock += 20_000;
voice.noteActivity(REI, "Kiss");
drainPaced();
check("Rei kisses her again: held", voice.isTriggerInEffect(comp()), true);
say("Missy, you are released from the compulsion", OTHER_HYP);
check("  a bystander's release: still held", voice.isTriggerInEffect(comp()), true);
say("Missy, you are released from the compulsion", REI);
check("  Rei, who set it off, releases it", voice.isTriggerInEffect(comp()), false);
check("  still planted", compulsions().length, 1);
said = [];
toHyp = [];
say("Missy, you are released from the compulsion", REI);
check("  once it has let go, Rei's words do nothing", [said.some((m) => m.includes("lets go")), toHyp.length], [false, 0]);
say("Missy, forget your compulsions", REI);
check("  Rei can't remove it", compulsions().length, 1);
clock += 20_000;
voice.noteActivity(OTHER_HYP, "Kiss");
drainPaced();
say("Missy, you are released from the compulsion", REI);
check("  set off by someone else now: Rei can't", voice.isTriggerInEffect(comp()), true);
say("Missy, you are released from the compulsion", OTHER_HYP);
check("  but the one who did can", voice.isTriggerInEffect(comp()), false);
toHyp = [];
say("Missy, you are released from the compulsion");
check("nothing holding: says so", /no compulsion of yours was holding them/.test(toHyp.join(" ")), true);
toHyp = [];
say("Missy, forget your compulsions", OTHER_HYP);
check("someone else's removal: nothing goes", compulsions().length, 1);
say("Missy, forget your compulsions");
check("removal: the compulsion goes", compulsions().length, 0);
check("  the word trigger stays", word()?.phrase, "ember glow");
check("  the planter told", /Removed the 1 compulsion you planted in them\. Your trigger word stays\./.test(toHyp.join(" ")), true);
toHyp = [];
say("Missy, forget your compulsions");
check("none left: says so", /No compulsion of yours is planted in them/.test(toHyp.join(" ")), true);

console.log(`act-compulsion: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
