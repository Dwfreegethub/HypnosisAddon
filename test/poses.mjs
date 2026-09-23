// The pose library (v0.85.0): every BC stance and arm pose, not only kneel and stand.
//
// What this pins:
//   - the wording: each pose's phrases reach it, and the overlaps land on the narrower entry
//     ("stand with your legs apart" is a stance, not "stand");
//   - the two groups: a leg pose never undoes an arm pose and "stand" leaves the arms alone;
//   - rule 5: a pose BC refuses is reported as refused, never announced as done;
//   - teardown undoes only what a suggestion set, never a pose the subject chose.
//
// BC's pose setter is stubbed to replace only the pose's own category, which is what the
// code assumes and what could NOT be checked against BC's source when this was written (see
// POSE_GROUPS in effects.ts). If BC turns out to behave differently, this suite still passes
// and a live run is what shows it; the stub is the assumption, written down.
const HYP = 246108;

const GROUP = {
	Kneel: "L", KneelingSpread: "L", Spread: "L", LegsClosed: "L", Sit: "L", AllFours: "L", Hogtied: "L",
	HandsBehindBack: "U", BackBoxTie: "U", BackElbowTouch: "U", OverHead: "U", CrossedArms: "U", Yoke: "U", Surrender: "U",
};
/** Poses "bondage" refuses right now. */
let refuse = new Set();
globalThis.CharacterSetActivePose = (C, pose) => {
	if (pose === null) { C.ActivePose = []; return; }
	if (!GROUP[pose] || refuse.has(pose)) return; // BC ignoring an unknown or blocked pose
	C.ActivePose = [...(C.ActivePose ?? []).filter((p) => GROUP[p] !== GROUP[pose]), pose];
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
const say = (line) => voice.handleSpokenLine(HYP, line);
const poses = () => [...(Player.ActivePose ?? [])].sort();
const reset = () => { local.length = 0; room.length = 0; toHyp.length = 0; poseSyncs.length = 0; };

// --- wording -------------------------------------------------------------------------------
const CASES = [
	["Missy, kneel.", "kneel"],
	["kneel spread", "kneel-spread"],
	["Spread your knees for me.", "kneel-spread"],
	["Spread your legs.", "legs-spread"],
	// The overlap that decides the order: bare "stand" is in this line too.
	["Stand with your legs apart.", "legs-spread"],
	["Stand with your feet together.", "legs-closed"],
	["Legs closed.", "legs-closed"],
	["Sit.", "sit"],
	["Sit down.", "sit"],
	["Sit on the floor.", "sit"],
	["On all fours.", "all-fours"],
	["Get on your hands and knees.", "all-fours"],
	["Lie down.", "lie-down"],
	["Lay down.", "lie-down"],
	["Down on your stomach.", "lie-down"],
	["Hands behind your back.", "hands-behind"],
	["Clasp your hands behind your back.", "hands-behind"],
	["Arms behind your back.", "arms-behind"],
	["Box your arms.", "arms-behind"],
	["Elbows behind your back.", "elbows-behind"],
	["Put your hands up.", "arms-up"],
	["Raise your arms.", "arms-up"],
	["Hands above your head.", "arms-up"],
	["Cross your arms.", "arms-crossed"],
	["Hold your arms out.", "arms-out"],
	["Yoke your arms.", "arms-out"],
	["Surrender.", "surrender"],
	// Surrender is checked before arms-up on purpose.
	["Put your hands up where I can see them.", "surrender"],
	["Relax your arms.", "arms-relax"],
	["Arms at your sides.", "arms-relax"],
	["Stand up.", "stand"],
	["On your feet.", "stand"],
	// Patter that must not seat anyone on the floor.
	["Sit back and relax.", null],
	["Just sit with that feeling.", null],
	["I sit down beside you.", null],
	["I lie down next to you.", null],
	// DW's call, 2026-09-23: kept despite the clash, and noted in the wiki. Pinned here so a
	// change to it is a decision, not an accident.
	["Surrender to my voice.", "surrender"],
];
for (const [phrase, want] of CASES) check(`match ${JSON.stringify(phrase)}`, voice.matchSuggestion(phrase), want);

// Every new flavor key has a private line and a room line that names the character.
for (const key of ["kneel-spread", "legs-spread", "legs-closed", "sit", "all-fours", "lie-down", "hands-behind",
	"arms-behind", "elbows-behind", "arms-up", "arms-crossed", "arms-out", "surrender", "arms-relax", "pose-blocked"]) {
	check(`${key} has a private line`, typeof flavor.flavor(key), "string");
	check(`  ${key} room line names the character`, /Missy/.test(flavor.publicFlavor(key) ?? ""), true);
}

// --- the two groups, spoken ----------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("postureControl", true);
session.forceTrance(HYP, 80, 80);

reset();
say("Missy, kneel.");
say("Missy, hands behind your back.");
check("kneel then hands behind: both held", poses(), ["HandsBehindBack", "Kneel"]);
check("  the room was told the pose, not the whole appearance", poseSyncs.at(-1), ["Kneel", "HandsBehindBack"]);

say("Missy, sit.");
check("sit replaces kneel and keeps the hands", poses(), ["HandsBehindBack", "Sit"]);

say("Missy, stand up.");
check("stand clears the legs only", poses(), ["HandsBehindBack"]);

say("Missy, spread your legs.");
say("Missy, relax your arms.");
check("relax your arms clears the arms only", poses(), ["Spread"]);
say("Missy, stand.");
check("and stand clears the rest", poses(), []);

// --- rule 5: refused is reported, not announced ---------------------------------------------
reset();
refuse = new Set(["Kneel"]);
say("Missy, kneel.");
check("a refused kneel does not happen", poses(), []);
check("  the hypnotist is told it did not land",
	toHyp.some((t) => t.includes('"kneel" matched but did not land: pose-blocked')), true);
check("  the room hears nothing but the attempt", room.length > 0 && room.every((m) => /will not go there/.test(m)), true);
check("  the room hears her try", room.some((m) => /will not go there/.test(m)), true);
refuse = new Set();

// A pose BC does not know (a wrong name in POSE_GROUPS) reads the same way.
reset();
check("an unknown pose name does not report success", effects.setSuggestedPose("NoSuchPose", "arms"), false);

// --- permission --------------------------------------------------------------------------
storage.setFeature("postureControl", false);
reset();
say("Missy, cross your arms.");
check("Posture Control off: nothing happens", poses(), []);
check("  and the hypnotist hears why", toHyp.some((t) => t.startsWith('[suggestion] Refused — "arms-crossed"')), true);
storage.setFeature("postureControl", true);

// --- teardown undoes only ours --------------------------------------------------------------
say("Missy, kneel.");
// The subject raises her own arms from BC's pose menu, not by suggestion.
CharacterSetActivePose(Player, "OverHead");
check("before the safeword: our kneel, her own arms", poses(), ["Kneel", "OverHead"]);
session.safeword();
check("the safeword undoes our kneel and leaves her arms", poses(), ["OverHead"]);
CharacterSetActivePose(Player, null);

// A pose she changed out of herself is hers now: ending the session must not reset it.
session.forceTrance(HYP, 80, 80);
say("Missy, kneel.");
CharacterSetActivePose(Player, "AllFours");
session.safeword();
check("a pose she chose since is left alone", poses(), ["AllFours"]);
CharacterSetActivePose(Player, null);

// --- a trigger's undo only takes back its own pose ------------------------------------------
effects.setSuggestedPose("Kneel");
effects.setSuggestedPose("Sit");
effects.clearSuggestedPose("stance", "Kneel");
check("undoing kneel leaves a sit said since", poses(), ["Sit"]);
effects.clearSuggestedPose("stance", "Sit");
check("  undoing the sit itself clears it", poses(), []);

// --- saved across a reconnect ----------------------------------------------------------------
effects.setSuggestedPose("Kneel");
effects.setSuggestedPose("BackBoxTie");
check("what we set is what gets saved", effects.suggestedPose(), ["Kneel", "BackBoxTie"]);
effects.clearSuggestedPose();
check("  cleared", poses(), []);
effects.restoreSuggestedPose(["Kneel", "BackBoxTie"]);
check("a saved pair comes back", poses(), ["BackBoxTie", "Kneel"]);
effects.clearSuggestedPose();
// A save written before v0.85.0 held one string.
effects.restoreSuggestedPose("Kneel");
check("an old single-string save still restores", poses(), ["Kneel"]);
effects.clearSuggestedPose();

session.safeword();
console.log(`poses: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
