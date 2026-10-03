// Whispers need no name (v0.100.3, Claire 2026-09-28): a whisper to the subject is addressed to her.
// The pose stubs below are copied from test/poses.mjs. Each check says what failure looks like.
const HYP = 246108;

// The 15 BC poses by category, from docs/bc-pose-reference.md.
const GROUP = {
	BaseLower: "L", Kneel: "L", KneelingSpread: "L", Spread: "L", LegsClosed: "L",
	BaseUpper: "U", BackCuffs: "U", BackBoxTie: "U", BackElbowTouch: "U", OverTheHead: "U", Yoked: "U",
	AllFours: "F", Hogtied: "F", TapedHands: "H", Suspension: "A",
};
/** BodyFull conflicts with upper and lower as well as with itself. */
const clashes = (a, b) => a === b || (a === "F" && (b === "L" || b === "U")) || (b === "F" && (a === "L" || a === "U"));
/** Poses "bondage" refuses right now. */
let refuse = new Set();
globalThis.CharacterSetActivePose = (C, pose) => {
	if (pose === null) { C.ActivePose = []; return; }
	if (!GROUP[pose] || refuse.has(pose)) return; // BC ignoring an unknown or blocked pose
	C.ActivePose = [...(C.ActivePose ?? []).filter((p) => !clashes(GROUP[p], GROUP[pose])), pose];
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
const hyp = { MemberNumber: HYP, Name: "GameBot" };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacter = [Player, hyp];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect]);
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
const local = [];
const room = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ChatRoomSendEmote = (m) => room.push(String(m));
const toHyp = [];
const poseSyncs = [];
globalThis.ServerSend = (t, data) => {
	if (t === "ChatRoomCharacterPoseUpdate") poseSyncs.push(data?.Pose);
	const m = data?.Dictionary?.[0]?.message;
	if (m?.type === "trigger-status") toHyp.push(m.text);
};

const { voice, storage, session, effects, flavor } = await import("./harness-bundle.mjs");
session.installSession();
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
// What main.ts does with a line: whisperedToMe is a whisper whose sender is not us.
const hear = (line, whisperedToMe) => voice.handleSpokenLine(HYP, voice.asAddressed(line, whisperedToMe));
const kneeling = () => (Player.ActivePose ?? []).includes("Kneel");

// --- the helper ---------------------------------------------------------------------------------
check("a nameless whisper gets her name in front", voice.asAddressed("kneel", true), "Missy, kneel");
check("a whisper that already names her is left alone", voice.asAddressed("Missy, kneel", true), "Missy, kneel");
check("  her nickname counts as her name", (() => { Player.Nickname = "Miss"; const r = voice.asAddressed("Miss, kneel", true); delete Player.Nickname; return r; })(), "Miss, kneel");
check("ordinary chat is never changed", voice.asAddressed("kneel", false), "kneel");

// --- in a session -------------------------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("postureControl", true);
check("setup: under with the hypnotist", session.forceTrance(HYP, 50, 50), null);

// Failure: a nameless line said ALOUD starts working. Only whispers lose the name requirement.
hear("kneel", false);
check("said aloud without her name: ignored, as before", kneeling(), false);
// Failure: the whispered command is ignored (the v0.100.2 behaviour).
hear("kneel", true);
check("whispered without her name: she kneels", kneeling(), true);
hear("stand up", true);
check("  and a whispered release works too", kneeling(), false);
// Failure: a whispered line still needs everything else; the name was the only gate removed.
storage.setFeature("postureControl", false);
hear("kneel", true);
check("whispered, but the permission is off: still refused", kneeling(), false);
storage.setFeature("postureControl", true);
session.safeword();
hear("kneel", true);
check("whispered, but no session: still ignored", kneeling(), false);

console.log(`whisper: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
