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
	prepared = 0; started = 0; local.length = 0; sent.length = 0;
	Player.ArousalSettings.OrgasmTimer = 0; Player.ArousalSettings.Progress = 100;
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

session.safeword();
console.log(`denial: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
