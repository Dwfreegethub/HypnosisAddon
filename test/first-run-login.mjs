// The first-run notice on an ordinary fresh login (v0.84.2).
//
// Until v0.84.2 the notice rode startRecovery()'s startup poll, which stops for good 20 s after
// load if there is still no room. Logging in and then browsing the room list takes longer than
// that, so on the ordinary way to arrive the notice never fired, and a fresh install stayed as
// silent as a broken one. It now rides the startup banner's poll, which waits up to ten minutes
// for a room. This suite walks that ordinary arrival: page loads before login, the player logs
// in, sits in the lobby past the 20 s mark, then joins a room.
//
// Both polls are driven rather than waited on: setInterval is stubbed so a tick is a function
// call, and Date.now is a clock the suite moves.
let local = [], room = [];
globalThis.Player = { MemberNumber: undefined, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.ChatRoomCharacter = [];
let inRoom = false;
globalThis.ServerPlayerIsInChatRoom = () => inRoom;
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = (m) => local.push(m);
globalThis.ChatRoomSendEmote = (m) => room.push(m);

let intervals = new Map(), nextId = 1;
globalThis.setInterval = (fn) => { const id = nextId++; intervals.set(id, fn); return id; };
globalThis.clearInterval = (id) => { intervals.delete(id); };
const tickAll = () => { for (const fn of [...intervals.values()]) fn(); };

let clock = 1_000_000;
Date.now = () => clock;

const { recovery, welcome, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// Page load, before login. main.ts starts the banner poll; session.ts starts recovery's.
recovery.startRecovery();
const recoveryPoll = nextId - 1;
welcome.startStartupBanner();
const bannerPoll = nextId - 1;
check("both startup polls are running", intervals.size, 2);

// --- in a room but identity not yet known: nothing reads settings or prints ---------------
// Artificial (BC does not put you in a room before login), but it is the guard against the
// v0.17.0 trap: the notice reads settings, and reading them before login caches defaults over
// the account's real data. Failure looks like any local line here.
inRoom = true;
globalThis.ChatRoomCharacter = [Player];
tickAll();
check("no identity yet: nothing printed", local.length, 0);
check("  and the banner poll is still waiting", intervals.has(bannerPoll), true);
inRoom = false;
globalThis.ChatRoomCharacter = [];

// --- log in, then browse the room list past the old 20 s cut-off ---------------------------
Player.MemberNumber = 1;
clock += 25_000;
tickAll();
// Recovery's own no-room fallback is unchanged: it still acts on identity alone and stops.
// Failure looks like its poll still present, which would mean this fix changed recovery.
check("recovery took its no-room fallback and stopped, as before", intervals.has(recoveryPoll), false);
check("still in the lobby: nothing printed", local.length, 0);
// The bug: with the notice on recovery's poll, nothing was left waiting at this point.
check("  the banner poll is still waiting for a room", intervals.has(bannerPoll), true);

// --- 55 s after load, the player joins a room ---------------------------------------------
clock += 30_000;
inRoom = true;
globalThis.ChatRoomCharacter = [Player];
tickAll();
// Failure looks like 1 (banner only): the notice did not fire on an ordinary fresh login.
check("joining a room prints the banner and the two-line notice", local.length, 3);
check("  banner first", /v\w+ · \/hypno help/.test(local[0] ?? ""), true);
check("  then the notice", /nothing is switched on yet/.test(local[1] ?? ""), true);
check("  all local, nothing emoted to the room", room.length, 0);
check("  the banner poll stopped itself", intervals.size, 0);
check("  and the notice is recorded as shown", storage.wasWelcomeShown(), true);

// --- never twice ---------------------------------------------------------------------------
local = [];
welcome.startStartupBanner();
tickAll();
check("a second start prints nothing", local.length, 0);

console.log(`first-run-login: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
