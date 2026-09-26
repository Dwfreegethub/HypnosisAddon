// Spoken and mantra triggers, Build 5 of the trigger overhaul (design.md, "Trigger Overhaul";
// shipped inside v0.90.0 at DW's request, 2026-09-25).
//
// A trigger may carry words the subject says aloud: "Missy, you will say 'I obey' three times".
// Needs the Made to Speak permission and its depth, at planting and at firing. Goes out through
// BC's own ChatRoomSendChatMessage, so a gag garbles it and an owner's BlockTalk rule stops it; our
// own trance silence does not. A forced line never fires the subject's own triggers, and no more
// than six go out a minute.
//
// Every block states what failure looks like.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
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
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
// BC's own send, stubbed: records what went out, and can be told to refuse (BlockTalk).
let spoken = [];
let bcRefuses = false;
globalThis.ChatRoomSendChatMessage = (msg) => { if (bcRefuses) return false; spoken.push(msg); return true; };
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};

const { depth, voice, storage, triggers, effects } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- parsing: the words, verbatim ------------------------------------------------------------------
// Failure: words lost, lower-cased, the name or the quotes kept, or the count missed.
const s = (t) => voice.parseSayClause(t);
check("quoted", s(`Missy, you will say "I obey."`), { text: "I obey.", times: 1 });
check("curly quotes", s("Missy, you will say “Yes, Mistress”"), { text: "Yes, Mistress", times: 1 });
check("unquoted, trailing name dropped", s("you will say I am yours, Missy"), { text: "I am yours", times: 1 });
check("you'll repeat, three times", s("Missy, you'll repeat 'good girls obey' three times"), { text: "good girls obey", times: 3 });
check("twice", s("Missy, you will recite: I am empty, twice"), { text: "I am empty", times: 2 });
check("a digit count", s("Missy, you will say 'mm' 4 times"), { text: "mm", times: 4 });
check("capped at five", s("Missy, you will say 'mm' 9 times"), { text: "mm", times: 5 });
check("answer WITH", s("Missy, you will answer with 'yes'"), { text: "yes", times: 1 });
check("colons survive in the words", voice.describeAction(triggers.sayActionId("note: obey", 1)), 'you say "note: obey"');
// Not speech. Failure: silence or conversation recorded as words to say.
for (const line of [
	"Missy, you will say nothing",
	"Missy, you will not say a word",
	"Missy, you will answer my questions",
	"Missy, you cannot speak",
	"Missy, say hello to Rei",
]) check(`not words to say: "${line}"`, s(line), null);
const p = (t) => voice.parseTriggerControl(t);
check("control: a say line", p("Missy, you will say 'I obey' twice"), { kind: "say", text: "I obey", times: 2 });
check("control: on the start line", p("Missy, when you hear ember glow, you will say 'I obey'"),
	{ kind: "start", phrase: "ember glow", say: { text: "I obey", times: 1 } });
check("control: speech-block stays a suggestion, not a say", p("Missy, you will say nothing"), null);

// The stored id round-trips. Failure: text or count lost.
check("id round-trip", triggers.parseSayAction(triggers.sayActionId("I obey: always", 3)), { times: 3, text: "I obey: always" });
check("a malformed id is not a say", triggers.parseSayAction("say:x"), null);

// --- setup -------------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "triggerControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.forgetAllTriggers();
depth.setCurrentDepths(80, 80);
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);
const plantSay = (phrase, text, times = 1) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", phrase);
	const line = triggers.recordAction(triggers.sayActionId(text, times));
	triggers.commitRecording();
	return line;
};
// Each block starts a fresh minute, so the rate cap only bites in the block that tests it.
const realNow = Date.now;
let clockOffset = 0;
Date.now = () => realNow() + clockOffset;
const reset = () => { storage.forgetAllTriggers(); spoken = []; said = []; toHyp = []; clockOffset += 61_000; };

// --- planting gates ------------------------------------------------------------------------------------
// Failure: words recorded without the permission or the depth, or the hypnotist not told.
storage.setFeature("forcedSpeech", false);
plantSay("ember glow", "I obey");
check("no permission: nothing saved", find("ember glow"), undefined);
check("  and the hypnotist told which setting", /"Made to Speak"/.test(toHyp.join(" ")), true);
storage.setFeature("forcedSpeech", true);
triggers.beginRecording(HYP, "GameBot", "ember glow"); // planting itself needs Deep
depth.setCurrentDepths(30, 30); // then Yielding; Made to Speak needs Entranced
toHyp = [];
triggers.recordAction(triggers.sayActionId("I obey", 1));
check("too shallow: refused", /making them speak needs Entranced/.test(lastToHyp()), true);
triggers.cancelRecording();
reset();

// --- firing: the words go out through BC ----------------------------------------------------------------
// Failure: not said, said in lower case, or the mantra pasted as one line.
plantSay("ember glow", "Good girls obey.", 3);
check("planted", !!find("ember glow"), true);
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("a mantra is said three times, verbatim", spoken, ["Good girls obey.", "Good girls obey.", "Good girls obey."]);
check("  and it is not 'holding' her", voice.isTriggerInEffect(find("ember glow")), false);
reset();

// --- through our own silence, not through BC's rules ----------------------------------------------------
// Failure (a): our trance silence swallows the line. Failure (b): BC's refusal is overridden or
// passes unremarked.
plantSay("ember glow", "I obey");
effects.setSpeechBlocked(true);
check("the forced-speech flag is off outside a forced line", effects.isForcedSpeech(), false);
let flagDuringSend = null;
globalThis.ChatRoomSendChatMessage = (msg) => { flagDuringSend = effects.isForcedSpeech(); spoken.push(msg); return true; };
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("silenced: the line still goes out", spoken, ["I obey"]);
check("  sent with the bypass flag raised", flagDuringSend, true);
check("  and lowered again after", effects.isForcedSpeech(), false);
effects.setSpeechBlocked(false);
globalThis.ChatRoomSendChatMessage = (msg) => { if (bcRefuses) return false; spoken.push(msg); return true; };
spoken = []; said = [];
bcRefuses = true;
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("BC refuses (owner rule): nothing sent", spoken, []);
check("  and she is told", said.some((x) => /something stronger holds them back/.test(x)), true);
bcRefuses = false;
reset();

// --- revoked after planting ----------------------------------------------------------------------------
// Failure: an untick does not disarm the words.
plantSay("ember glow", "I obey");
storage.setFeature("forcedSpeech", false);
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("permission revoked after planting: nothing said", spoken, []);
storage.setFeature("forcedSpeech", true);
reset();

// --- a forced line never fires our own triggers ---------------------------------------------------------
// Failure: with self-firing on, "say my own trigger word" loops.
storage.setFeature("selfTrigger", true);
plantSay("ember glow", "ember glow", 1);
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("the forced line goes out", spoken, ["ember glow"]);
check("  and its echo is recognised", voice.isForcedEcho(Player.MemberNumber, "ember glow"), true);
check("  once only", voice.isForcedEcho(Player.MemberNumber, "ember glow"), false);
spoken = [];
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
voice.handleSpokenLine(Player.MemberNumber, "ember glow"); // the server's echo of it
drainPaced();
check("the echo does not fire it again", spoken, ["ember glow"]);
voice.handleSpokenLine(Player.MemberNumber, "ember glow"); // her typing it herself
drainPaced();
check("  but her typing it does (self-firing on)", spoken, ["ember glow", "ember glow"]);
storage.setFeature("selfTrigger", false);
reset();

// --- the rate cap -------------------------------------------------------------------------------------
// Failure: more than six lines a minute, or held lines unremarked.
plantSay("ember glow", "again", 5);
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
check("no more than six forced lines in a minute", spoken.length, 6);
check("  and she is told why once", said.filter((x) => /too many in one minute/.test(x)).length, 1);
reset();

console.log(`say: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
