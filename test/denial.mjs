// The orgasm denial hooks (denial.ts), driven directly.
//
// DW's live run on v0.83.1 (2026-09-23): the subject was told "you cannot cum", got the denial
// line, and her own masturbation finished her anyway. BC's DenialMode check (read from the live
// client the same night, see denial.ts) did not stop it, with BCX and WCE hooking around it, so the
// add-on now stops the orgasm itself, at ActivityOrgasmPrepare (and ActivityOrgasmStart behind
// it). These checks drive the two hooks the way bcModSdk would, with a stand-in for BC's own
// function behind each, and ask whether BC's orgasm was reached.
const HYP = 246108;

const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe", "Leash"] }, Property: { Effect: [] } };
let realItemEffects = [];
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
const other = { MemberNumber: HYP, Name: "GameBot", IsPlayer: () => false, ArousalSettings: { Progress: 0 } };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
globalThis.ChatRoomCharacter = [Player, other];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ActivitySetArousal = (C, p) => { C.ArousalSettings.Progress = p; };
globalThis.ActivityExpression = () => {};
const local = [];
const sent = [];
globalThis.ChatRoomSendLocal = (m) => local.push(typeof m === "string" ? m : JSON.stringify(m));
globalThis.ServerSend = (t, data) => sent.push({ t, data });
let arousalSyncs = 0;
globalThis.ActivityChatRoomArousalSync = () => { arousalSyncs++; };
globalThis.ActivityOrgasmGameTimer = 0;

const { denial, voice, storage, session } = await import("./harness-bundle.mjs");
session.installSession();

// Capture the hooks, and stand-ins for BC's functions behind them. BC's own Prepare here
// deliberately IGNORES DenialMode, which is what the live run showed: only our hook stands
// between the meter reaching the top and an orgasm.
const hooks = {};
denial.installDenial({ hookFunction: (name, _prio, fn) => { hooks[name] = fn; } });
let prepared = 0, started = 0;
const bcPrepare = (args) => { prepared++; if (args[0]?.ArousalSettings) args[0].ArousalSettings.OrgasmTimer = CurrentTime + 5000; };
const bcStart = () => { started++; };
// Wire the globals voice.ts's forced orgasm calls through the same hooks, as bcModSdk would.
globalThis.ActivityOrgasmPrepare = (...args) => hooks.ActivityOrgasmPrepare(args, bcPrepare);
globalThis.ActivityOrgasmStart = (...args) => hooks.ActivityOrgasmStart(args, bcStart);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const reset = () => {
	prepared = 0; started = 0; local.length = 0; sent.length = 0; arousalSyncs = 0;
	Player.ArousalSettings.OrgasmTimer = 0; Player.ArousalSettings.OrgasmStage = 0; Player.ArousalSettings.Progress = 100;
};
const say = (line) => voice.handleSpokenLine(HYP, line);

check("both hooks installed", [typeof hooks.ActivityOrgasmPrepare, typeof hooks.ActivityOrgasmStart], ["function", "function"]);

// --- no denial: BC's orgasm is untouched ---------------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("arousalControl", true);
reset();
ActivityOrgasmPrepare(Player);
check("no denial: BC's Prepare runs", prepared, 1);
check("  and the meter is not touched", Player.ArousalSettings.Progress, 100);

// --- the live-run case: "you cannot cum", then her own touch reaches the top ----------------
session.forceTrance(HYP, 80, 80);
say("Missy, you cannot cum.");
reset();
ActivityOrgasmPrepare(Player); // what BC calls when the meter reaches the top
check("denied: BC's Prepare is NOT reached", prepared, 0);
check("  no orgasm timer is armed", Player.ArousalSettings.OrgasmTimer, 0);
check("  the meter is held just short of the top", Player.ArousalSettings.Progress, denial.DENIAL_HOLD);
check("  and the subject is told it was held", local.some((l) => /edge|brink|over/.test(l)), true);
ActivityOrgasmStart(Player);
check("denied: a direct Start is stopped too", started, 0);
// BC's own check lets a Bypass caller through as a ruined orgasm; ours does not.
reset(); local.length = 0;
ActivityOrgasmPrepare(Player, true);
check("denied: a Bypass call is held as well", prepared, 0);

// --- announced once a minute, not on every climb ---------------------------------------------
// (The Bypass call above was the second climb; this is the third.)
reset();
ActivityOrgasmPrepare(Player);
check("a second climb straight after is held but not re-announced", [prepared, local.length], [0, 0]);

// --- only the player: another character's orgasm is never ours to stop -----------------------
reset();
hooks.ActivityOrgasmPrepare([other], bcPrepare);
check("another character's orgasm passes through", prepared, 1);

// --- a command still wins: "cum for me" pierces our denial (DW, 2026-09-12) -------------------
reset();
say("Missy, cum for me.");
check("a commanded orgasm reaches BC's Prepare", prepared, 1);
check("  and BC's Start", started, 1);
check("  and our denial is back in place afterwards", emoticon.Property.Effect.includes("DenialMode"), true);
reset();
ActivityOrgasmPrepare(Player);
check("  so the next climb is held again", prepared, 0);

// --- a real chastity item is BC's to enforce, not ours ----------------------------------------
say("Missy, you may cum now.");
realItemEffects = ["DenialMode"]; CharacterLoadEffect(Player);
reset();
ActivityOrgasmPrepare(Player);
check("a real item's DenialMode alone: our hook stands aside for BC", prepared, 1);
realItemEffects = []; CharacterLoadEffect(Player);

// --- permission, the safeword and the master switch all release it ----------------------------
say("Missy, you cannot cum.");
say("Missy, you may cum now.");
reset();
ActivityOrgasmPrepare(Player);
check("after 'you may cum now', BC's orgasm is reached", prepared, 1);

say("Missy, you cannot cum.");
session.safeword();
reset();
ActivityOrgasmPrepare(Player);
check("after the safeword, BC's orgasm is reached", prepared, 1);

// Master switch as a floor for the hook itself, even with our effect somehow still on the carrier.
emoticon.Property.Effect = ["DenialMode"]; CharacterLoadEffect(Player);
storage.setFeature("hypnoEnabled", false);
reset();
ActivityOrgasmPrepare(Player);
check("Hypnosis Enabled off: the hook never stops an orgasm", prepared, 1);
emoticon.Property.Effect = []; CharacterLoadEffect(Player);

// --- a fault in the check falls through to BC rather than making orgasms impossible ----------
reset();
hooks.ActivityOrgasmPrepare([{ get IsPlayer() { throw new Error("boom"); } }], bcPrepare);
check("a throwing check falls through to BC", prepared, 1);

// --- v0.84.1: a queued orgasm is cancelled, not left waiting for the denial to lift ------------
// BC's Timer.js calls ActivityOrgasmStart once OrgasmTimer runs out while OrgasmStage <= 1. v0.83.2
// swallowed that Start but left the timer set, so BC retried it every second and the first tick
// after release gave her a full orgasm. The natural way in: the denial lands inside BC's 5-second
// window, i.e. after Prepare had already armed it.
storage.setFeature("hypnoEnabled", true);
session.forceTrance(HYP, 80, 80);
reset();
ActivityOrgasmPrepare(Player);
check("setup: BC's orgasm window is open before the denial", Player.ArousalSettings.OrgasmTimer > 0, true);
say("Missy, you cannot cum.");
Player.ArousalSettings.OrgasmTimer = CurrentTime - 1; // the window ran out: Timer.js calls Start now
ActivityOrgasmStart(Player);
check("queued: BC's Start is not reached", started, 0);
// Failure looks like: a timer still set, which is v0.83.2's queued orgasm waiting to fire.
check("  the queued orgasm is cancelled", [Player.ArousalSettings.OrgasmTimer, Player.ArousalSettings.OrgasmStage], [0, 0]);
check("  she is held at the edge", Player.ArousalSettings.Progress, denial.DENIAL_HOLD);
check("  and the room's copy is told the orgasm is off", arousalSyncs, 1);

reset();
Player.ArousalSettings.OrgasmTimer = CurrentTime + 3000; Player.ArousalSettings.OrgasmStage = 1;
ActivityOrgasmStart(Player); // she surrenders, or times out, during BC's resist game
check("resist game: cancelled the same way", [started, Player.ArousalSettings.OrgasmTimer, Player.ArousalSettings.OrgasmStage], [0, 0, 0]);

say("Missy, you may cum now.");
check("lifting the denial afterwards finds nothing queued to fire", Player.ArousalSettings.OrgasmTimer, 0);

// An ordinary climb-and-hold with nothing queued stays unsynced, as BC's own DenialMode branch is.
say("Missy, you cannot cum.");
reset();
ActivityOrgasmPrepare(Player);
check("a plain hold does not sync the room every climb", arousalSyncs, 0);

// --- an orgasm already HAPPENING is not ours to cut short --------------------------------------
// Stage 2 is only reachable while our denial was off (a commanded "cum for me"), so ending it
// would be taking the command back.
reset();
const happeningUntil = CurrentTime + 8000;
Player.ArousalSettings.OrgasmTimer = happeningUntil; Player.ArousalSettings.OrgasmStage = 2;
ActivityOrgasmPrepare(Player);
check("mid-orgasm: left to finish", [Player.ArousalSettings.OrgasmTimer, Player.ArousalSettings.OrgasmStage, Player.ArousalSettings.Progress], [happeningUntil, 2, 100]);
check("  and no second one is started", prepared, 0);

// --- v0.84.1: the carrier being wiped no longer takes the denial with it ------------------------
// Anything rebuilding the Emoticon item (an outfit load, another mod restoring appearance) strips
// Property.Effect. The hook used to read only the carrier, so it stood aside.
reset();
emoticon.Property.Effect = []; CharacterLoadEffect(Player);
ActivityOrgasmPrepare(Player);
// Failure looks like: prepared 1, the orgasm v0.84.0 would have let through.
check("carrier wiped: the orgasm is still held", prepared, 0);
check("  the carrier is put back", emoticon.Property.Effect.includes("DenialMode"), true);
check("  so BC's own cached effects say denied again", Player.Effect.includes("DenialMode"), true);

// The flag must come down with every release, or it would deny forever.
session.safeword();
storage.setFeature("hypnoEnabled", true);
reset();
ActivityOrgasmPrepare(Player);
check("after the safeword the flag is down as well: BC's orgasm is reached", prepared, 1);

session.safeword();
console.log(`denial: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
