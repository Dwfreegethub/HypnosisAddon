// A compulsion whose pose is refused (easy, 2026-11-01; DW 2026-11-05). A "when someone comes in"
// trigger posted "{name} shifts, trying to obey..." to the whole room on every arrival while she
// was tied up, and nothing told her how to stop it. Each check says what failure looks like.
//
//   1. Refused by bondage, a compulsion says nothing to the room, however many times it goes off.
//   2. She is told privately, once, and how to remove it.
//   3. Under the Extreme lock the line does not offer a removal that would be refused.
//   4. A pose that lands is still seen, and a word someone said aloud still shows her trying.
const HYP = 246108, REI = 999;
let refuse = new Set();
globalThis.CharacterSetActivePose = (C, pose) => {
	if (pose === null) { C.ActivePose = []; return; }
	if (refuse.has(pose)) return; // BC ignoring a pose bondage blocks
	C.ActivePose = [pose];
};
const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [], ActivePose: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect]);
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
let room = [], local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = (m) => room.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
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

const { depth, voice, storage, triggers, session, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "triggerControl", "postureControl"]) storage.setFeature(k, true);
storage.setTriggerScope("anyone");
const plantWhen = (watch) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", "", () => false, watch);
	triggers.recordAction("kneel");
	triggers.commitRecording();
	// "It works every time", like easy's: a compulsion is otherwise used up by its first firing.
	delete storage.listTriggers().at(-1).oneShot;
};
const plantWord = (phrase) => {
	depth.setCurrentDepths(80, 80);
	triggers.beginRecording(HYP, "GameBot", phrase);
	triggers.recordAction("kneel");
	triggers.commitRecording();
};
const reset = () => {
	session.safeword();
	timers.clearAllTimers();
	storage.forgetAllTriggers();
	Player.ActivePose = [];
	refuse = new Set();
	room = []; local = [];
};
const arrive = () => { voice.noteArrival(REI); drainPaced(); };
const blockedInRoom = () => room.filter((m) => /will not go there/.test(m)).length;
const toldPrivately = () => local.filter((m) => /will not go there/.test(m));

// --- 1 and 2: tied up, on every arrival -----------------------------------------------------------
reset();
plantWhen({ fireOn: "arrive", watchName: "*" });
refuse.add("Kneel");
arrive();
arrive();
arrive();
// Failure: easy's bug, the room told on every arrival.
check("refused: the room is told nothing", blockedInRoom(), 0);
// Failure: rule 5, a refusal nobody hears about, or one repeated on every arrival.
check("refused: she is told privately, once", toldPrivately().length, 1);
check("  and how to remove it", /\/echs forgettrigger/.test(toldPrivately()[0] ?? ""), true);
check("  she did not move", Player.ActivePose, []);
check("the trigger is still planted", storage.listTriggers().length, 1);

// --- a speech compulsion, the same way ----------------------------------------------------------
reset();
plantWhen({ fireOn: "speak", watchName: "rei", watchMember: REI });
refuse.add("Kneel");
voice.handleSpokenLine(REI, "hello everyone");
drainPaced();
voice.handleSpokenLine(REI, "hello again");
drainPaced();
check("speech: the room is told nothing", blockedInRoom(), 0);
check("speech: she is told privately, once", toldPrivately().length, 1);

// --- 3: under the Extreme lock ------------------------------------------------------------------
reset();
plantWhen({ fireOn: "arrive", watchName: "rei", watchMember: REI });
refuse.add("Kneel");
storage.startExtremeLock("trial");
arrive();
check("locked: still told privately", toldPrivately().length, 1);
// Failure: she is pointed at a command that will refuse.
check("  without offering /echs forgettrigger", /forgettrigger/.test(toldPrivately()[0] ?? ""), false);
storage.clearExtremeLock();

// --- 4: what is left as it was ------------------------------------------------------------------
reset();
plantWhen({ fireOn: "arrive", watchName: "*" });
arrive();
// Failure: the fix swallowed the room line for a pose that landed.
check("not refused: she kneels", Player.ActivePose, ["Kneel"]);
check("  and the room sees it", room.some((m) => /will not go there/.test(m)), false);
check("  with a line", room.length > 0, true);
check("  and no private refusal", toldPrivately().length, 0);

reset();
plantWord("ember glow");
refuse.add("Kneel");
voice.handleSpokenLine(HYP, "ember glow");
drainPaced();
// Failure: a word said aloud lost the room's view of her trying, which the fix never meant to touch.
check("a spoken word refused: the room still sees her try", blockedInRoom(), 1);

reset();
console.log(`compulsion-refused: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
