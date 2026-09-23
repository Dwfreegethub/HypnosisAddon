// Import respects "Lock settings while a session is on you".
//
// The bug: the lock greyed and refused every checkbox and the attempt limit, but the Data tab's
// Import button was handled before the lock was ever read, and `/hypno import` never read it at
// all. Import replaces every toggle in one go without ending anything, so a subject mid-session
// could paste a blob and rewrite every permission the lock was holding still, including the lock
// itself. Export (read-only) and Reset (ends the session before it wipes, Known Bug #4) stay open
// on purpose, and the suite checks that too, so a fix that locked the whole row would fail here.
//
// Every "refused" check below was run against the pre-fix code and seen to fail. The controls at
// the end (lock ticked but no session; session but lock unticked) are what stop a fix that simply
// broke Import from passing.
//
// FAILURE LOOKS LIKE: a FAIL line with want/got, and a non-zero exit.
const HYP = 246108;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect() { return false; },
	GetPronouns: () => "SheHer",
};
globalThis.CurrentTime = 1_000_000;
globalThis.Asset = [];
globalThis.CharacterLoadEffect = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterRefresh = () => {};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.ChatRoomData = null;
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendEmote = () => {};
const local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(typeof m === "string" ? m : JSON.stringify(m));
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);

// The clipboard, controllable: each readText() hands back a promise the suite resolves itself,
// so it can start a session while the browser is still "asking".
let reads = 0;
let writes = 0;
let pendingRead = null;
const clipboard = {
	readText() {
		reads++;
		return new Promise((resolve) => { pendingRead = resolve; });
	},
	writeText() {
		writes++;
		return Promise.resolve();
	},
};
// Node 21+ has a getter-only global navigator, so plain assignment would silently do nothing.
Object.defineProperty(globalThis, "navigator", { value: { clipboard }, configurable: true, writable: true });

const { storage, session, menu, commands } = await import("./harness-bundle.mjs");
session.installSession();
commands.installCommands();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const flush = () => new Promise((r) => setImmediate(r));
const quiet = () => { local.length = 0; };
const saw = (text) => local.some((m) => m.includes(text));

const hypno = registered.find((c) => c.Tag === "hypno");
const importCmd = hypno?.Subcommands?.find((s) => s.Tag === "import");
check("/hypno import is registered", typeof importCmd?.Action, "function");
const EXPORT = 0, IMPORT = 1, RESET = 2;

// --- the blob a subject would paste to get round the lock ------------------------------------
// Lock off, a permission on. The live settings are the opposite: lock on, that permission off.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("undressControl", true);
storage.setFeature("lockedWhileHypnotized", false);
const blob = storage.exportSettings();
storage.setFeature("undressControl", false);
storage.setFeature("lockedWhileHypnotized", true);
const state = () => {
	const f = storage.getFeatures();
	return { lock: f.lockedWhileHypnotized, undress: f.undressControl };
};
const LOCKED_STATE = { lock: true, undress: false };
const IMPORTED_STATE = { lock: false, undress: true };
const restore = () => {
	storage.setFeature("undressControl", false);
	storage.setFeature("lockedWhileHypnotized", true);
};

check("forceTrance started a session", session.forceTrance(HYP, 80, 80), null);
check("  and the settings screen reads as locked", menu.settingsLocked(), true);

// --- the typed command is refused -------------------------------------------------------------
quiet();
importCmd?.Action(blob);
check("/hypno import under the lock changes nothing", state(), LOCKED_STATE);
check("  and says it was refused", saw(menu.IMPORT_LOCKED_MESSAGE), true);
check("  and does not claim an import", saw("Imported:"), false);

// --- the Data tab button is refused, before the clipboard is read -----------------------------
quiet();
reads = 0;
menu.clickDataButton(IMPORT);
check("the Import button under the lock never reads the clipboard", reads, 0);
check("  and says it was refused", saw(menu.IMPORT_LOCKED_MESSAGE), true);
check("  and changes nothing", state(), LOCKED_STATE);

// --- Export and Reset stay open under the lock ------------------------------------------------
quiet();
writes = 0;
menu.clickDataButton(EXPORT);
await flush();
check("Export still works under the lock", writes, 1);
check("  and is not refused", saw(menu.IMPORT_LOCKED_MESSAGE), false);
quiet();
menu.clickDataButton(RESET);
check("Reset still arms under the lock (it ends the session first, Known Bug #4)", saw("Click Reset again"), true);

// --- a session that starts while the clipboard is still being read ---------------------------
session.safeword();
check("after the safeword the lock has lifted", menu.settingsLocked(), false);
quiet();
reads = 0;
menu.clickDataButton(IMPORT);
check("with no session the button reads the clipboard", reads, 1);
check("forceTrance started a second session mid-read", session.forceTrance(HYP, 80, 80), null);
pendingRead?.(blob);
await flush();
check("an import that lands after the session started changes nothing", state(), LOCKED_STATE);
check("  and says it was refused", saw(menu.IMPORT_LOCKED_MESSAGE), true);
session.safeword();

// --- controls: the lock is opt-in and session-scoped, so Import must still work outside it -----
// Without these, a fix that broke Import outright would pass every check above.
quiet();
importCmd?.Action(blob);
check("lock ticked but no session: /hypno import works", state(), IMPORTED_STATE);
check("  and says so", saw("Imported:"), true);
restore();

quiet();
reads = 0;
menu.clickDataButton(IMPORT);
pendingRead?.(blob);
await flush();
check("lock ticked but no session: the button imports", state(), IMPORTED_STATE);
restore();

storage.setFeature("lockedWhileHypnotized", false);
check("forceTrance started a session with the lock unticked", session.forceTrance(HYP, 80, 80), null);
check("  and the screen does not read as locked", menu.settingsLocked(), false);
quiet();
importCmd?.Action(blob);
check("session but lock unticked: /hypno import works", state(), IMPORTED_STATE);
check("  and is not refused", saw(menu.IMPORT_LOCKED_MESSAGE), false);

// A suite that leaves a trance running never exits: its timers hold the event loop open.
session.safeword();

console.log(`import-lock: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
