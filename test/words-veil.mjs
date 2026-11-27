// Words that slip past her (v1.24.0, DW 2026-11-26: "give suggestions with out the subject being able to
// read them on the screen"; DW chose "a vague line"). The hypnotist's lines to her still land, but her
// own screen shows only that something was murmured. Under Hearing.
//
// Failure looks like: a wording not read (or an existing hearing line taken for it); a line hidden from
// her without the murmur, or shown in full; OOC text hidden; it outliving its release, the wake, the
// safeword; it working without Hearing or without a speaker.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true, Appearance: [], ActivePose: [], PoseMapping: {} };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
globalThis.CharacterRefresh = () => {};
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
globalThis.InventoryGet = () => null;
globalThis.CurrentTime = Date.now();

const { voice, storage, session, suppression, effects } = await import("./harness-bundle.mjs");
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
const id = (line) => voice.matchSuggestion(line);

check("wordings", ["my words slip past you", "you will obey without knowing what i said", "my words are a murmur to you", "you will not catch my words", "you will do as i say without knowing why"].map(id), ["words-veil", "words-veil", "words-veil", "words-veil", "words-veil"]);
check("releases", ["you can understand my words again", "my words are clear to you again", "you can know what i say again"].map(id), ["words-veil-release", "words-veil-release", "words-veil-release"]);
check("the hearing lines are still theirs", ["you hear only my voice", "you can hear everyone again"].map(id), ["hear-voice", "hear-release"]);

for (const k of ["hypnoEnabled", "hearingControl", "movementRestriction"]) storage.setFeature(k, true);
session.forceTrance(HYP, 80, 80);
say("Missy, my words slip past you");
check("on: locked to the hypnotist", suppression.veiledBy(), HYP);
// The display half.
let murmured = [];
const data = { Type: "Chat", Sender: HYP, Content: "Missy, you cannot move" };
suppression.markVeiled(data);
check("a marked line is hidden, the murmur given", [suppression.veilFilter(data, "Missy, you cannot move", (s) => murmured.push(s)), murmured], [true, [HYP]]);
const ooc = { Type: "Chat", Sender: HYP, Content: "Missy, kneel (brb)" };
suppression.markVeiled(ooc);
check("  its OOC part still shown", suppression.veilFilter(ooc, "Missy, kneel (brb)", () => {}), { msg: "(brb)" });
check("  an unmarked line is left alone", suppression.veilFilter({ Type: "Chat", Sender: 5 }, "hi", () => {}), false);
check("  an action is left alone", suppression.veilFilter((() => { const d = { Type: "Action", Sender: HYP }; suppression.markVeiled(d); return d; })(), "x", () => {}), false);
// It still lands.
storage.setFeature("speechRestriction", true);
say("Missy, you cannot speak");
check("what she can't read still lands", effects.isSpeechBlocked(), true);
say("Missy, you can speak again");
// Release, hear-release, wake, safeword.
say("Missy, you can understand my words again");
check("released", suppression.veiledBy(), null);
say("Missy, my words slip past you");
say("Missy, you can hear everyone again");
check("\"you can hear everyone again\" ends it too", suppression.veiledBy(), null);
say("Missy, my words slip past you");
session.wakeByHypnotist(HYP);
drainPaced();
check("the wake ends it", suppression.veiledBy(), null);
session.forceTrance(HYP, 80, 80);
say("Missy, my words slip past you");
session.hardFloorStop();
check("the safeword ends it", suppression.veiledBy(), null);
// Without Hearing.
for (const k of ["hypnoEnabled", "hearingControl"]) storage.setFeature(k, k === "hypnoEnabled");
session.forceTrance(HYP, 80, 80);
toHyp = [];
say("Missy, my words slip past you");
check("without Hearing: refused, said so", [suppression.veiledBy(), toHyp.some((t) => /Refused/.test(t))], [null, true]);

console.log(`words-veil: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
