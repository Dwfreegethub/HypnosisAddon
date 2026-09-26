// Trigger words shown as "..." on the subject's own screen, v0.89.0 (design.md, "Trigger
// Overhaul", Build 3, decision 6).
//
// Two halves. concealPhrases is pure: raw chat text in, masked text out, and it has to find a
// NORMALISED phrase in RAW text — any case, punctuation between words, BC's arousal stutter, and the
// contractions normalize() folds away. concealHandler is what BC's message chain calls: which
// messages, which phrases (stored, being recorded, and the one a planting line is about to plant),
// and the ungarbled copy BC shows beside a gagged line.
//
// Every block states what failure looks like. Failure is always one of two things: the word shows
// (the feature's whole point, lost), or text that is NOT the word is eaten (someone's chat mangled).
const HYP = 246108, OTHER = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: OTHER, Name: "Rei" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendLocal = () => {};
let registered = [];
globalThis.ChatRoomRegisterMessageHandler = (h) => registered.push(h);

const { conceal, storage, session, triggers, depth } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- concealPhrases: finding a normalised phrase in raw text ------------------------------------
const c = (text, phrase, strict = false) => conceal.concealPhrases(text, [{ phrase, strict }]);
check("plain", c("sleepy time now", "sleepy time"), "... now");
check("any case", c("SLEEPY Time, Missy", "sleepy time"), "..., Missy");
check("punctuation between the words", c("sleepy... time!", "sleepy time"), "...!");
check("every occurrence", c("sleepy time and sleepy time", "sleepy time"), "... and ...");
check("arousal stutter", c("s-sleepy t-time", "sleepy time"), "...");
check("a typed double stutter", c("s-s-sleepy time", "sleepy time"), "...");
check("contraction folded into one word", c("you can't move", "cannot move"), "you ...");
check("  and the spaced form", c("you can not move", "cannot move"), "you ...");
check("contraction folded into a pair", c("don't wake", "do not wake"), "...");
check("  the curly apostrophe", c("don’t wake", "do not wake"), "...");
check("'ur' is 'your'", c("ur sleepy", "your sleepy"), "...");
check("  but not the 'ur' ending 'our'", c("our sleepy", "your sleepy"), "our sleepy");
check("substring trigger: inside a longer word too", c("hey sleepyhead", "sleepy"), "hey ...head");
check("strict: the whole word", c("so sleepy.", "sleepy", true), "so ....");
check("strict: not inside a longer word", c("hey sleepyhead", "sleepy", true), "hey sleepyhead");
// Failure: a near miss is eaten.
check("a different word is left alone", c("sleeping time", "sleepy time"), "sleeping time");
check("words in the wrong order are left alone", c("time sleepy", "sleepy time"), "time sleepy");
check("regex characters in chat are harmless", c("(sleepy) [time]?", "sleepy time"), "(...]?");
check("longest first: a phrase inside another is masked whole",
	conceal.concealPhrases("deep blue sea", [{ phrase: "blue", strict: false }, { phrase: "deep blue sea", strict: false }]), "...");
check("an empty phrase masks nothing", c("anything", ""), "anything");

// --- setup --------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "movementRestriction", "triggerControl"]) storage.setFeature(k, true);
storage.forgetAllTriggers();
const plant = (phrase, extra = {}) =>
	storage.saveTrigger({ phrase, actions: ["movement-block"], installedBy: HYP, installedByName: "GameBot", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0, ...extra });
const msg = (Content, Type = "Chat", Sender = HYP) => ({ data: { Content, Type, Sender }, msg: Content });
const run = ({ data, msg }, metadata = {}) => conceal.concealHandler(data, msg, metadata);

// --- registration ---------------------------------------------------------------------------------
// Failure: not registered, or at a priority that runs after the display (500) or before the emote
// formatting (0) — BC's "post" handlers are Priority >= 0, run in order.
conceal.installConcealment();
check("registers one handler", registered.length, 1);
check("  at 50: after emote formatting (0), before garbling (100)", registered[0]?.Priority, 50);
check("  a post-handler (>= 0)", registered[0]?.Priority >= 0, true);

// --- the handler: which messages ----------------------------------------------------------------
plant("sleepy time");
check("chat from anyone is masked", run(msg("sleepy time, Missy", "Chat", OTHER)), { msg: "..., Missy" });
check("whispers are masked", run(msg("sleepy time", "Whisper")), { msg: "..." });
check("emotes are masked (after BC adds the name)", run({ data: { Content: "whispers sleepy time", Type: "Emote", Sender: HYP }, msg: "GameBot whispers sleepy time" }), { msg: "GameBot whispers ..." });
check("a line without the word is left alone", run(msg("hello there")), false);
check("Action messages are not touched", run(msg("sleepy time", "Action")), false);
check("the subject's own lines are not touched", run(msg("sleepy time", "Chat", Player.MemberNumber)), false);
// The floor, and the opt-out. Failure: masking with hypnosis unticked, or for someone who asked
// to see their words.
storage.setFeature("hypnoEnabled", false);
check("hypnosis unticked: nothing masked", run(msg("sleepy time")), false);
storage.setFeature("hypnoEnabled", true);
storage.setFeature("showTriggerWords", true);
check("show trigger words on: nothing masked", run(msg("sleepy time")), false);
storage.setFeature("showTriggerWords", false);

// The ungarbled copy BC shows beside a gagged line. Failure: the word shows in the [brackets].
{
	const metadata = { OriginalMsg: "sleepy time, Missy" };
	run({ data: { Content: "mmph mmph", Type: "Chat", Sender: HYP }, msg: "mmph mmph" }, metadata);
	check("the ungarbled copy is masked too", metadata.OriginalMsg, "..., Missy");
}

// Strictness follows the trigger, and the subject's master toggle.
storage.forgetAllTriggers();
plant("sleepy", { strict: true });
check("strict trigger: 'sleepyhead' is left alone", run(msg("hey sleepyhead")), false);
storage.forgetAllTriggers();
plant("sleepy");
check("substring trigger: 'sleepyhead' is masked", run(msg("hey sleepyhead")), { msg: "hey ...head" });
storage.setFeature("strictTriggerMatch", true);
check("master strict toggle: 'sleepyhead' is left alone", run(msg("hey sleepyhead")), false);
storage.setFeature("strictTriggerMatch", false);
storage.forgetAllTriggers();

// --- the planting line --------------------------------------------------------------------------
// The line is drawn BEFORE the add-on reacts to it (main.ts), so nothing is stored or recording
// yet. Failure: "your trigger word is ..." shows the word.
depth.setCurrentDepths(80, 80);
session.forceTrance(HYP, 80, 80);
check("the planting line is masked, from her hypnotist in trance",
	run(msg("Missy, your trigger word is velvet dark")), { msg: "Missy, your trigger word is ..." });
check("  'when I say' form too", run(msg("Missy, when I say velvet dark")), { msg: "Missy, when I say ..." });
check("  but not from someone else", run(msg("Missy, your trigger word is velvet dark", "Chat", OTHER)), false);
session.safeword();
check("  and not with no trance", run(msg("Missy, your trigger word is velvet dark")), false);
// While recording, the phrase is concealed from everyone's lines. Failure: the hypnotist repeating
// it mid-setup shows it.
session.forceTrance(HYP, 80, 80);
triggers.beginRecording(HYP, "GameBot", "velvet dark");
check("the phrase being recorded is masked", run(msg("velvet dark, remember that", "Chat", OTHER)), { msg: "..., remember that" });
triggers.cancelRecording();
session.safeword();
check("a cancelled recording is no longer masked", run(msg("velvet dark")), false);

// --- the handler never throws into BC's chain -----------------------------------------------------
check("junk data is ignored", registered[0].Callback(null, null, null, null), false);

console.log(`conceal: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
