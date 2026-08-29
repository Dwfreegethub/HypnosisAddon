// Triggers: phrase parsing, recording, gates, and firing.
const HYP = 246108, OTHER = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);

const { voice, storage, triggers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- parsing (pure) ---
const p = (t) => voice.parseTriggerControl(t);
check("start, name after phrase", p("Missy, your trigger word is sleepy time"), { kind: "start", phrase: "sleepy time" });
check("name stripped from tail", p("your trigger word is sleepy Missy"), { kind: "start", phrase: "sleepy" });
check("phrase variant", p("Missy, the trigger phrase is deep blue"), { kind: "start", phrase: "deep blue" });
check("when-i-say form", p("Missy, when i say butterfly"), { kind: "start", phrase: "butterfly" });
check("commit", p("Missy, remember trigger"), { kind: "commit" });
check("cancel", p("Missy, forget the trigger"), { kind: "cancel" });
check("ordinary line", p("Missy, you cannot move"), null);
check("self-referential ignored", p("i will set a trigger"), null);

// --- gates ---
for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction", "postureControl"]) storage.setFeature(k, true);
storage.setFeature("triggerControl", false);
storage.setTrustValue(HYP, "GameBot", 70);
// Refusals must name the actual problem — atmospheric text here left DW guessing why a
// trigger wouldn't plant, so the assertions check for the specific cause.
check("refused without permission", /not enabled "Triggers"/.test(triggers.beginRecording(HYP, "GameBot", "sleepy")), true);
check("  nothing recorded", triggers.isRecording(), false);

storage.setFeature("triggerControl", true);
storage.setTrustValue(HYP, "GameBot", 40);
check("refused below trust 65", /needs trust 65.*you're at 40\.0/.test(triggers.beginRecording(HYP, "GameBot", "sleepy")), true);
check("  nothing recorded", triggers.isRecording(), false);

// --- record and commit ---
storage.setTrustValue(HYP, "GameBot", 70);
triggers.beginRecording(HYP, "GameBot", "sleepy time");
check("recording started", triggers.isRecording(), true);
triggers.recordAction("movement-block");
triggers.recordAction("speech-block");
triggers.commitRecording();
check("recording cleared", triggers.isRecording(), false);
const stored = storage.listTriggers();
check("one trigger stored", stored.length, 1);
check("  phrase", stored[0].phrase, "sleepy time");
check("  actions", stored[0].actions, ["movement-block", "speech-block"]);

// --- matching ---
check("matches installer", triggers.triggersFiredBy(HYP, "sleepy time now missy").length, 1);
check("ignores other speaker", triggers.triggersFiredBy(OTHER, "sleepy time").length, 0);
check("ignores unrelated line", triggers.triggersFiredBy(HYP, "hello there").length, 0);

// --- firing, with NO session (the whole point) ---
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
check("fires outside a session", said.length >= 2, true);

// permission revoked disarms that action
storage.setFeature("speechRestriction", false);
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
check("revoked permission skips its action", said.length, 1);

// master switch disarms everything
storage.setFeature("hypnoEnabled", false);
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
check("hypnoEnabled off disarms all", said.length, 0);

// --- future-tense phrasing records the same actions ---
// "when I say X, you will not be able to move" reads better while building a trigger than
// repeating the immediate wording, and maps to the same action.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("speechRestriction", true);
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "deep blue");
const rec = (t) => {
	const id = voice.matchSuggestion(t);
	if (id) triggers.recordAction(id);
	return id;
};
check("future: unable to move", rec("you will not be able to move"), "movement-block");
check("future: unable to speak", rec("you will be unable to speak"), "speech-block");
check("future: will not move", voice.matchSuggestion("you will not move"), "movement-block");
check("future: clothes", voice.matchSuggestion("you will not be able to change your clothes"), "clothing-block");
triggers.commitRecording();
check("future phrasing stored", storage.listTriggers()[0].actions, ["movement-block", "speech-block"]);

// --- bare "wake" ---
check("bare wake", voice.isWakeLine("Missy wake"), true);
check("wake up still works", voice.isWakeLine("Missy wake up"), true);
check("first-person wake ignored", voice.isWakeLine("i wake early"), false);

console.log(`triggers: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
