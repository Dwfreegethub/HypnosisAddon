// The self-touch hook on ActivityRun (selftouch.ts), driven directly.
//
// The bug this guards (DW's tracker, 2026-09-22, "Permanent Self-Touch Lockout via Bondage
// Gear"): after "don't touch yourself" and then a real restraint, the subject could not touch
// themselves ever again — not after the safeword, not after unticking movement, not after
// switching the add-on off. Only taking the item off cleared it. The cause was the hook's
// frozen check reading Player.HasEffect("Freeze"), which is true for ANY Freeze: ours on the
// Emoticon carrier, or a real device's. So a restraint that freezes kept tripping a hypnotic
// block with no session, no permission and no add-on switched on behind it, and narrated the
// restraint as hypnosis ("twitches towards herself, and nothing moves") to the whole room.
//
// Every "passes through" check below was run against the pre-fix hook and seen to fail.
const HYP = 246108;

// Same model as activity.mjs: BC's cached Player.Effect is rebuilt from OUR carrier plus a
// real item we do not control, so the suite can tell our freeze from a restraint's.
const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe", "Leash"] }, Property: { Effect: [] } };
let realItemEffects = [];
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	// Read live, the way BC's cache would read after CharacterLoadEffect.
	HasEffect(e) { return emoticon.Property.Effect.includes(e) || realItemEffects.includes(e); },
};
const other = { MemberNumber: HYP, Name: "GameBot", IsPlayer: () => false };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = () => {};
globalThis.ChatRoomCharacter = [Player, other];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ActivityGetGroupOrMirror = (_family, name) => ({ Name: name === "ItemNipples" ? "ItemBreast" : name });
// Everything the subject's own screen is told, and everything sent to the room.
const local = [];
const sent = [];
globalThis.ChatRoomSendLocal = (m) => local.push(typeof m === "string" ? m : JSON.stringify(m));
globalThis.ServerSend = (t, data) => sent.push({ t, data });

const { selftouch, storage, session, effects } = await import("./harness-bundle.mjs");
session.installSession();

// Capture the hook the way bcModSdk would hold it, and a stand-in for BC's real ActivityRun.
let hook = null;
selftouch.installSelfTouch({ hookFunction: (_name, _prio, fn) => { hook = fn; } });
let ran = 0;
const next = () => { ran++; return "ran"; };
const group = (Name) => ({ Name });
/** One self-activity through the hook. True if BC's ActivityRun was reached. */
const touchSelf = (g = "ItemBreast") => {
	const before = ran;
	hook([Player, Player, group(g), { Activity: { Name: "Caress" } }], next);
	return ran > before;
};
const quiet = () => { local.length = 0; sent.length = 0; };
/** Did anything reach the room or the subject's screen from the hook? */
const narrated = () => local.length > 0 || sent.some((s) => s.t === "ChatRoomChat");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

check("the hook was installed", typeof hook, "function");

// --- baseline: nothing on, nothing worn ------------------------------------------------------
check("no session, no gear: self-touch runs", touchSelf(), true);

// --- a real restraint with no hypnosis anywhere near it ---------------------------------------
// The add-on has never been switched on. A device that freezes is BC's business, not ours.
realItemEffects = ["Freeze"];
quiet();
check("real Freeze, add-on never on: self-touch is NOT blocked by us", touchSelf(), true);
check("  and nothing is narrated as hypnosis", narrated(), false);
realItemEffects = [];

// --- DW's sequence: block, then gear, then each of the three ways out -------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("selfTouchControl", true);
storage.setFeature("movementRestriction", true);

const enterAndBlock = () => {
	session.forceTrance(HYP, 80, 80);
	selftouch.setAllSelfTouchBlocked(true);
	realItemEffects = ["Freeze"];
};

// 1. The safeword.
enterAndBlock();
quiet();
check("under, blocked, in gear: self-touch is stopped", touchSelf(), false);
session.safeword();
quiet();
check("after the SAFEWORD, still in gear: self-touch runs", touchSelf(), true);
check("  and nothing is narrated", narrated(), false);
check("  and our block really is gone", selftouch.describeSelfTouchBlocks(), "no parts blocked");
realItemEffects = [];

// 2. The master switch.
enterAndBlock();
storage.setFeature("hypnoEnabled", false);
session.hardFloorStop();
quiet();
check("after HYPNOSIS ENABLED off, still in gear: self-touch runs", touchSelf(), true);
check("  and nothing is narrated", narrated(), false);
storage.setFeature("hypnoEnabled", true);
realItemEffects = [];

// 3. The trance ending on its own (the wake), not a safeword.
enterAndBlock();
check("  the hypnotist's wake ended it", session.wakeByHypnotist(HYP), true);
quiet();
check("after the trance ENDS, still in gear: self-touch runs", touchSelf(), true);
realItemEffects = [];

// --- the master switch is a floor for the hook itself, not only for what it clears ------------
// Whatever state is left behind, an add-on switched off must not stop anyone's hand.
selftouch.setAllSelfTouchBlocked(true);
selftouch.setBodyPartBlocked("breasts", ["ItemBreast", "ItemNipples"], true);
effects.applyEffect("Freeze");
storage.setFeature("hypnoEnabled", false);
quiet();
check("add-on off with stale blocks and our Freeze: self-touch runs", touchSelf(), true);
check("  and nothing is narrated", narrated(), false);
storage.setFeature("hypnoEnabled", true);
selftouch.clearSelfTouchBlocks();
effects.removeEffect("Freeze");

// --- what must still work: OUR restrictions still stop the subject's own hand -----------------
// Guards the fix from being "make the hook do nothing".
effects.applyEffect("Freeze");
quiet();
check("OUR Freeze still stops self-touch", touchSelf(), false);
check("  and says so (rule 5)", narrated(), true);
effects.removeEffect("Freeze");

// Our Freeze AND a real one: ours is still ours.
effects.applyEffect("Freeze");
realItemEffects = ["Freeze"];
check("OUR Freeze plus a real one: still stopped", touchSelf(), false);
effects.removeEffect("Freeze");
check("our Freeze lifted, real one stays: runs", touchSelf(), true);
realItemEffects = [];

selftouch.setAllSelfTouchBlocked(true);
quiet();
check("blanket block still stops self-touch", touchSelf(), false);
check("  and says so", narrated(), true);
realItemEffects = ["Freeze"];
check("blanket block with real gear on: still stopped (by the block, not the gear)", touchSelf(), false);
realItemEffects = [];
selftouch.clearSelfTouchBlocks();

selftouch.setBodyPartBlocked("breasts", ["ItemBreast", "ItemNipples"], true);
check("a blocked part stops touch there", touchSelf("ItemBreast"), false);
check("  including through BC's nipple->breast mirror", touchSelf("ItemNipples"), false);
check("  but not elsewhere", touchSelf("ItemHands"), true);
selftouch.clearSelfTouchBlocks();

// Someone else's touch is never ours to govern, and the hook never pretends to.
selftouch.setAllSelfTouchBlocked(true);
const before = ran;
hook([other, Player, group("ItemBreast"), { Activity: { Name: "Caress" } }], next);
check("another player's activity is untouched", ran > before, true);
selftouch.clearSelfTouchBlocks();

session.safeword();
console.log(`selftouch: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
