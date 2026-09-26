// Hearing only one voice, v0.93.0 (DW, 2026-09-26).
//
// Two modes: "you hear only my voice" (everything one person says; a trigger locks it to whoever
// FIRED it) and "you only hear what is said to you" (lines with her name, from anyone). Everyone
// else's chat and in-character whispers are hidden, with an occasional line that other voices are
// there; OOC in (parentheses) always gets through; emotes stay visible; and what she cannot hear
// cannot act on her. Every block states what failure looks like.
const HYP = 246108, REI = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drain = () => {
	for (let g = 0; g < 1000; g++) {
		const i = pending.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pending[i].live = false;
		pending[i].fn();
	}
};

const { voice, storage, session, timers, suppression, effects } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "hearingControl", "movementRestriction", "triggerControl"]) storage.setFeature(k, true);
storage.setTriggerScope("everyone");
storage.setTriggerDuration(0);
// The trance's own Cannot Move default would freeze her on going under, and then no freeze check
// below could tell a command that landed from one that did not.
storage.setFeature("tranceCannotMove", false);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drain(); };
const mode = () => suppression.hearingMode();
const frozen = () => effects.isHeldStill();
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; };

// --- the wordings -----------------------------------------------------------------------------------
// Failure: a wording missed, read as the other mode, or an ordinary line read as either.
for (const [line, id] of [
	["Missy, you hear only my voice", "hear-voice"],
	["Missy, you will only hear me", "hear-voice"],
	["Missy, my voice is the only one you can hear", "hear-voice"],
	["Missy, you will listen only to me", "hear-voice"],
	["Missy, you only hear what is said to you", "hear-name"],
	["Missy, you will only hear what's meant for you", "hear-name"],
	["Missy, you only hear your name", "hear-name"],
	["Missy, you can hear everyone again", "hear-release"],
	["Missy, your hearing comes back", "hear-release"],
	["Missy, when you hear ember glow, kneel", "kneel"], // a kneel, not a hearing command
	["I can only hear the rain", null],
	["Missy, do you hear me?", null],
]) check(`"${line}"`, voice.matchSuggestion(line), id);

// --- "you hear only my voice", in a session ---------------------------------------------------------
reset();
under();
say("Missy, you hear only my voice");
check("hear-voice: locked to the one who said it", mode(), { kind: "voice", member: HYP });
check("  she is told", said.some((s) => /^\[.*voice/.test(s)), true);
// Failure: another person's words act on her. Rei's trigger word, planted to fire for anyone.
// A trigger never fires while its planter has her under, so this runs awake, with the mode set as a
// trigger would leave it (a trigger-held mode outlives the trance; a spoken one ends with it).
suppression.setHearing(null);
say("Missy, your trigger word is quiet bell");
say("Missy, you cannot move");
say("Missy, remember trigger");
session.wakeByHypnotist(HYP);
suppression.setHearing({ kind: "voice", member: HYP });
say("quiet bell", REI);
check("Rei's trigger word: not heard, nothing fires", [frozen(), storage.listTriggers()[0]?.firings], [false, 0]);
say("quiet bell", HYP);
check("the same word from the voice she hears fires it", frozen(), true);
// A command, in a trance, from the session's own hypnotist, while she hears only Rei.
// Failure: it lands although she cannot hear who said it.
effects.removeEffect("Freeze");
under();
suppression.setHearing({ kind: "voice", member: REI });
say("Missy, you cannot move", HYP);
check("locked to Rei: the hypnotist's command does not land", frozen(), false);
suppression.setHearing({ kind: "voice", member: HYP });
say("Missy, you cannot move", HYP);
check("locked to the hypnotist: it does", frozen(), true);

// --- the display: hidden, OOC kept, emotes seen, an occasional line --------------------------------
// Failure: an unheard line shown, the OOC lost, an emote hidden, or the fade line every time.
let fades = 0;
const onHidden = () => fades++;
suppression.resetOthersFade();
const rei = (Type, Content) => { const d = { Type, Content, Sender: REI }; if (!suppression.hearsLine(REI, false)) suppression.markUnheard(d); return d; };
let d = rei("Chat", "hello everyone");
check("Rei's chat: hidden", suppression.hearingFilter(d, "hello everyone", onHidden), true);
check("  with one 'other voices' line", fades, 1);
d = rei("Chat", "how is everyone");
check("the next hidden line: hidden, no second fade line within a minute", [suppression.hearingFilter(d, "how is everyone", onHidden), fades], [true, 1]);
d = rei("Chat", "sure thing (are you ok, Missy?)");
check("OOC in a chat line gets through, alone", suppression.hearingFilter(d, "sure thing (are you ok, Missy?)", onHidden), { msg: "(are you ok, Missy?)" });
d = rei("Whisper", "(brb, dog");
check("OOC in a whisper, unclosed, gets through", suppression.hearingFilter(d, "(brb, dog", onHidden), { msg: "(brb, dog" });
d = rei("Whisper", "psst, come here");
check("an in-character whisper: hidden", suppression.hearingFilter(d, "psst, come here", onHidden), true);
d = rei("Emote", "waves at Missy");
check("an emote: seen", suppression.hearingFilter(d, "waves at Missy", onHidden), false);
const hypLine = { Type: "Chat", Content: "good girl", Sender: HYP };
if (!suppression.hearsLine(HYP, false)) suppression.markUnheard(hypLine);
check("the hypnotist's line: shown", suppression.hearingFilter(hypLine, "good girl", onHidden), false);

// --- "you only hear what is said to you" ---------------------------------------------------------------
reset();
under();
say("Missy, you only hear what is said to you");
check("hear-name: on", mode(), { kind: "name" });
check("  a line with her name is heard, from anyone", suppression.hearsLine(REI, true), true);
check("  a line without it is not, even from the hypnotist", suppression.hearsLine(HYP, false), false);
say("you can hear everyone again", HYP);
check("  a release without her name is not heard", mode(), { kind: "name" });
say("Missy, you can hear everyone again", HYP);
check("  with it, released", mode(), null);

// --- a trigger locks it to whoever FIRED it --------------------------------------------------------------
// Failure: locked to the planter instead, or not locked at all.
reset();
under();
say("Missy, your trigger word is hush now");
say("Missy, you hear only my voice");
say("Missy, remember trigger");
check("recorded, not performed", mode(), null);
session.wakeByHypnotist(HYP);
say("hush now", REI);
check("fired by Rei: she hears only Rei", mode(), { kind: "voice", member: REI });
say("Missy, you cannot move", HYP);
check("  so the hypnotist is not heard", frozen(), false);

// --- endings ------------------------------------------------------------------------------------------------
// Failure: it outlives the safeword, or lands without the permission.
session.safeword();
check("the safeword ends it", mode(), null);
reset();
storage.setFeature("hearingControl", false);
under();
say("Missy, you hear only my voice");
check("permission off: refused", mode(), null);
check("  and the hypnotist told", /Refused/.test(toHyp.join(" ")), true);
storage.setFeature("hearingControl", true);
// Not carried: "that will stay with you" has no voice to keep once the trance ends.
reset();
under();
say("Missy, you hear only my voice");
say("Missy, that will stay with you");
session.wakeByHypnotist(HYP);
check("not carried past the wake", mode(), null);

console.log(`hearing: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
