// A hypnotist's list of what they planted, and the remote panel it opens from (v1.4.0; Eri 10-04;
// DW 2026-11-05). Each check says what failure looks like.
//
//   1. The subject answers only about the asker's own triggers, in words, never the number.
//   2. A saved trigger and a removal update the hypnotist's notes, on a message older builds ignore.
//   3. Someone not here: the notes, marked "last known". Someone here: what they say now.
//   4. The panel: Attempt/Wake, Planted triggers, help and exit. The old buttons are gone, and an
//      older build's press of one is ignored without printing junk on the subject's screen.
//
// One process plays both clients, with each message delivered by hand: the subject's reply is read
// off ServerSend and handed back in as coming from them.
const HYP = 246108, VEX = 424242, SUBJECT = 777;
let Commands = [];
globalThis.CommandCombine = (add) => { Commands = Commands.concat(Array.isArray(add) ? add : [add]); };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }] };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: VEX, Name: "Vex" }, { MemberNumber: SUBJECT, Name: "Ella" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.ChatRoomSendEmote = () => {};
globalThis.ChatRoomSendChatMessage = () => true;
let sent = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m) sent.push({ to: data.Target, ...m });
};
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
let now = Date.parse("2026-11-05T20:00:00Z");
Date.now = () => now;
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

// What the panel draws, for section 4.
const buttons = [], texts = [];
globalThis.DrawButton = (left, top, width, height, label) => buttons.push({ left, top, width, height, label });
globalThis.DrawText = (text) => texts.push(text);
globalThis.DrawTextFit = (text) => texts.push(text);
globalThis.DrawImageResize = () => {};
for (const n of ["DrawRect", "DrawEmptyRect", "DrawImage", "DrawTextWrap"]) globalThis[n] = () => {};
globalThis.MainCanvasWidth = 2000;
globalThis.MainCanvasHeight = 1000;
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.MainCanvas = {
	save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, font: "36px arial", textAlign: "", textBaseline: "", fillStyle: "",
	measureText: (t) => ({ width: t.length * 10 }), fillText: (text) => texts.push(text), fillRect() {}, strokeRect() {},
};
globalThis.MouseX = 0;
globalThis.MouseY = 0;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;

const { depth, storage, triggers, session, messaging, remote, planted, voice, commands, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const hooks = {};
triggers.installTriggers();
remote.installRemote({ hookFunction: (name, _p, fn) => (hooks[name] = fn) });
commands.installCommands();
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "postureControl"]) storage.setFeature(k, true);
storage.setTriggerScope("anyone");
const plant = (phrase, who = HYP, ...actions) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(who, who === HYP ? "GameBot" : "Vex", phrase);
	for (const a of actions.length ? actions : ["kneel"]) triggers.recordAction(a);
	triggers.commitRecording();
};
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); sent = []; local = []; };

// --- 1. the subject's answer --------------------------------------------------------------------
reset();
plant("ember glow");
plant("glowing", VEX);
sent = [];
deliver(HYP, { type: "state-query", planted: true });
const reply = sent.find((m) => m.type === "state-response");
check("it answers the one who asked", reply?.to, HYP);
// Failure: another hypnotist's word is handed over.
check("  theirs only", reply?.planted?.map((e) => e.word), ["ember glow"]);
check("  says what it does in words", reply?.planted?.[0]?.does, ["kneel"]);
check("  and how strong, as a band", reply?.planted?.[0]?.strength, "full strength");
// Failure: the number reaches the hypnotist, which it never does anywhere else.
check("  no number in it", /\d/.test(reply?.planted?.[0]?.strength ?? ""), false);
sent = [];
deliver(HYP, { type: "state-query" });
// Failure: an older client's query now gets a list it did not ask for.
check("not asked for: no list", sent.find((m) => m.type === "state-response")?.planted, undefined);
storage.forgetAllTriggers();
depth.setCurrentDepths(80, 80);
triggers.beginRecording(HYP, "GameBot", "", () => false, { fireOn: "arrive", watchName: "*" });
triggers.recordAction("kneel");
triggers.commitRecording();
sent = [];
deliver(HYP, { type: "state-query", planted: true });
const compulsion = sent.find((m) => m.type === "state-response")?.planted?.[0];
check("a compulsion shows what it waits for", [compulsion?.word, /comes in/.test(compulsion?.when ?? "")], ["", true]);
check("  and that it works once", compulsion?.once, true);

// --- 2. notes kept up on a message every build knows --------------------------------------------
reset();
plant("ember glow");
const saved = sent.find((m) => m.type === "trigger-status" && /SAVED/.test(m.text));
// Failure: a new message type, which an older build prints on screen as raw text.
check("saving sends the list on trigger-status", saved?.planted?.map((e) => e.word), ["ember glow"]);
deliver(SUBJECT, saved);
check("the hypnotist's client keeps it", planted.plantedNote(SUBJECT)?.triggers.map((e) => e.word), ["ember glow"]);
check("  under the subject's name", planted.plantedNote(SUBJECT)?.name, "Ella");
check("  and shows the status line too", local.some((l) => /SAVED/.test(l)), true);
sent = [];
voice.handleSpokenLine(HYP, "Missy, forget the trigger ember glow");
const removed = sent.find((m) => m.type === "trigger-status" && /Removed/.test(m.text));
check("removing one sends the list too", removed?.planted, []);
deliver(SUBJECT, removed);
check("  and nothing left means no note", planted.plantedNote(SUBJECT), null);
deliver(SUBJECT, { type: "trigger-status", text: "ordinary" });
check("a status with no list changes nothing", planted.plantedNote(SUBJECT), null);

// Whatever came over the wire is cleaned. Failure: a modified client breaks the list or the settings.
deliver(SUBJECT, { type: "state-response", hypnoEnabled: true, planted: [null, 7, { word: 12, does: "x", strength: {}, once: 1 }, { word: "x".repeat(500), does: ["y"] }] });
const cleaned = planted.plantedNote(SUBJECT)?.triggers;
check("junk is dropped or made safe", [cleaned?.length, cleaned?.[0]?.word, cleaned?.[0]?.does, cleaned?.[1]?.word.length], [2, "", [], 100]);
storage.savePlantedNote(SUBJECT, null);

// --- 3. here, and not here ----------------------------------------------------------------------
reset();
storage.savePlantedNote(SUBJECT, { name: "Ella", updatedAt: now - 86_400_000, triggers: [{ word: "ember glow", when: "", does: ["kneel"], strength: "full strength", once: false, holding: false }] });
const run = (args) => { local = []; Commands.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "planted").Action(args); return local.join(" | "); };
sent = [];
local = [];
const out = (() => {
	ChatRoomCharacter = ChatRoomCharacter.filter((c) => c.MemberNumber !== SUBJECT);
	return run("Ella");
})();
// Failure: someone not in the room gets no answer at all.
check("not here: the notes, at once", /ember glow/.test(out), true);
check("  marked last known", /Last known/.test(out), true);
check("  and nobody was asked", sent.length, 0);
ChatRoomCharacter.push({ MemberNumber: SUBJECT, Name: "Ella" });
sent = [];
pendingTimers.length = 0;
run("Ella");
check("here: they are asked", sent.find((m) => m.type === "state-query")?.to, SUBJECT);
check("  for the list", sent.find((m) => m.type === "state-query")?.planted, true);
check("  while it waits, the status says so", planted.plantedStatus(SUBJECT), "asking");
deliver(SUBJECT, { type: "state-response", hypnoEnabled: true, planted: [{ word: "new word", when: "", does: ["kneel"], strength: "fading, reaches Yielding", once: true, holding: true }] });
local = [];
pendingTimers.at(-1).fn();
const live = local.join(" | ");
check("their answer replaces the notes", [/new word/.test(live), /ember glow/.test(live)], [true, false]);
check("  and is marked current", /answered just now/.test(live), true);
check("  with how it stands", /fading, reaches Yielding, works once, holding them now/.test(live), true);
// They stop answering.
sent = [];
pendingTimers.length = 0;
run("Ella");
now += planted.PLANTED_ASK_MS + 1;
check("no answer: back to last known", planted.plantedStatus(SUBJECT), "last-known");
local = [];
pendingTimers.at(-1).fn();
check("  and says so", /did not answer/.test(local.join(" ")), true);
check("nobody with that name", /nobody in your notes/.test(run("Zed")), true);
storage.savePlantedNote(SUBJECT, null);
check("no notes at all: says so", /no notes/.test(run("")), true);

// --- 4. the panel -------------------------------------------------------------------------------
reset();
const target = ChatRoomCharacter.find((c) => c.MemberNumber === SUBJECT);
globalThis.InformationSheetSelection = target;
const frame = () => { buttons.length = 0; texts.length = 0; hooks.InformationSheetRun([], () => {}); };
const clickAt = (x, y) => { MouseX = x; MouseY = y; hooks.InformationSheetClick([], () => {}); };
const clickButton = (label) => { const b = buttons.find((x) => x.label === label); clickAt(b.left + 5, b.top + 5); };
frame();
const icon = buttons.find((b) => b.label === "" || b.label === "H");
clickAt(icon.left + 5, icon.top + 5);
deliver(SUBJECT, { type: "state-response", hypnoEnabled: true, planted: [] });
frame();
const labels = buttons.map((b) => b.label);
// Failure: the testing buttons are back.
check("no movement button", labels.some((l) => /Movement/.test(l)), false);
check("no clothing button", labels.some((l) => /Clothing/.test(l)), false);
check("no kneel or stand button", labels.some((l) => /^(Kneel|Stand)$/.test(l)), false);
check("the hypnotize button stays", labels.some((l) => /Checking|Attempt Hypnosis/.test(l)), true);
check("the list's button is there", labels.includes("Planted triggers"), true);
const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const session_ = buttons.find((b) => /Checking|Attempt/.test(b.label));
check("  and clear of it", overlaps(session_, buttons.find((b) => b.label === "Planted triggers")), false);

sent = [];
const many = Array.from({ length: 7 }, (_, i) => ({ word: `word ${i + 1}`, when: "", does: ["kneel"], strength: "full strength", once: false, holding: false }));
storage.savePlantedNote(SUBJECT, { name: "Ella", updatedAt: now, triggers: many });
clickButton("Planted triggers");
check("opening it asks them again", sent.some((m) => m.type === "state-query" && m.planted), true);
frame();
check("the page says whose it is", texts.some((t) => /What you planted in Ella/.test(t)), true);
check("  the first row reads as a list", texts.some((t) => /^1\. "word 1"$/.test(t)), true);
check("  says how it stands", texts.includes("full strength"), true);
check("  says what it does", texts.includes("kneel"), true);
check("  a page at a time", texts.some((t) => /"word 6"/.test(t)), false);
check("  says which page", texts.includes("1 / 2"), true);
clickButton("Next");
frame();
check("Next shows the rest", texts.some((t) => /^6\. "word 6"$/.test(t)), true);
const exit = buttons.find((b) => b.label === "");
clickAt(exit.left + 5, exit.top + 5);
frame();
check("exit goes back to the panel, not out of it", buttons.some((b) => b.label === "Planted triggers"), true);
storage.savePlantedNote(SUBJECT, null);
clickButton("Planted triggers");
deliver(SUBJECT, { type: "state-response", hypnoEnabled: true, planted: [] });
frame();
check("nothing planted: it says so", texts.some((t) => /nothing you planted is in Ella/.test(t)), true);

// An older hypnotist's button. Failure: raw JSON on her screen, or the effect still applied.
local = [];
session.forceTrance(HYP, 80, 80);
const before = JSON.stringify(Player.Appearance);
deliver(HYP, { type: "remote-request", feature: "movement", enable: true });
check("an old button press is ignored", JSON.stringify(Player.Appearance), before);
check("  with nothing on her screen", local, []);
session.safeword();

reset();
console.log(`planted: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
