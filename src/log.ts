const TAG = "[HypnosisAddon]";

// Three levels, so the browser console only shows what somebody needs to see.
//
// Everything used to go through console.log, which put a line in every player's devtools for
// every chat message, hook and state change in the room — noise that buried the few lines that
// meant something had actually gone wrong. Routine diagnostics are now console.debug, which
// Chrome files under "Verbose" (hidden unless asked for) and Firefox under "Debug". They are
// all still there for a tester who turns that level on.

//
// console.debug alone was not enough: other mod developers keep Verbose on for their own work,
// and there our line per chat message was still a flood (Fina's feedback, v0.85.3). So routine
// diagnostics are now also OFF unless asked for — `/hypno debug`, remembered per browser — and
// on by themselves in the Hypno Testing room, so a tester never has to remember to ask. warn()
// and info() are not gated: a fault must always show (rule 5), and so must the startup line.

// Its own localStorage key, not the synced settings: this is about one browser's devtools, not
// about the account, and it has to be readable before login, when the settings are not loaded.
const DEBUG_KEY = "ECHS_DEBUG";

function readDebugFlag(): boolean {
	try {
		return typeof localStorage !== "undefined" && localStorage.getItem(DEBUG_KEY) === "true";
	} catch {
		return false; // storage blocked: stay quiet
	}
}

let debugFlag = readDebugFlag();

/** Whether `/hypno debug` is switched on in this browser. The room does not count here. */
export function isDebugFlagOn(): boolean {
	return debugFlag;
}

/** Switch routine diagnostics on or off for this browser, and remember it across reloads.
 * Returns false if the choice could not be saved (it still applies until the page reloads). */
export function setDebugFlag(on: boolean): boolean {
	debugFlag = on;
	try {
		localStorage.setItem(DEBUG_KEY, on ? "true" : "false");
		return true;
	} catch {
		return false;
	}
}

/** Whether log() writes anything right now: the flag, or standing in the testing room. The
 * ROOM, not isTestingMode(): the harness pins that on for every suite, which would make the
 * gate impossible to test switched off. */
export function isDebugLogging(): boolean {
	return debugFlag || inTestingRoom();
}

/** Routine diagnostics — what the add-on saw and did. Silent unless isDebugLogging(), and even
 * then filed under the browser's Verbose / Debug level. */
export function log(...args: unknown[]): void {
	if (!isDebugLogging()) return;
	console.debug(TAG, ...args);
}

/** Something that should have worked and did not: a caught exception, a BC piece missing, a
 * hook that failed to install. Always visible, because rule 5 — a silent failure looks exactly
 * like a silent success. A refusal the add-on MEANT to make (a gate saying no) is not this;
 * that is ordinary behaviour and goes through log(). */
export function warn(...args: unknown[]): void {
	console.warn(TAG, ...args);
}

/** The one line that says the script is running at all. Visible at the default level, because
 * the troubleshooting page tells players to look for it in the console when nothing else
 * appears. Used once, at startup. */
export function info(...args: unknown[]): void {
	console.info(TAG, ...args);
}

// The testing room. While the player is in a chat room with this name (case-insensitive,
// whitespace-trimmed) the testing affordances are live; everywhere else — and when not in a
// room at all — they are off. So the shipped build is safe by default and there is no release
// flag anyone can forget to flip. DW's call, 2026-09-15.
const TESTING_ROOM = "hypno testing";

// Test-harness override. build-test.mjs rewrites this ONE line to `true` so the unit suites run
// with the testing affordances on without simulating a room (many stand their fixtures up
// through forceTrance / agetrigger). build.mjs does NOT touch it, so the shipped userscript is
// governed purely by the room check below. Typed `boolean` on purpose, so the harness can flip
// it without `if (FORCE_TESTING)` reading as statically dead. Keep this line's exact shape —
// build-test.mjs matches it and throws if it cannot find it.
const FORCE_TESTING: boolean = false;

/** Whether the testing affordances are available right now: the force-state commands
 * (`/hypno trance`, `/hypno depth`, `/hypno agetrigger`), `/hypno triggers full`, and the
 * `/bot` test-bot channel. True in the testing room (or when the harness has pinned it on),
 * false everywhere else.
 *
 * A RUNTIME check, not a build constant — re-evaluated on every call, so leaving and re-entering
 * the room turns the affordances off and on with no reload. Every command handler that offered
 * one refuses when this is false, so a command that exists but is out of its room says so rather
 * than misbehaving. Lives here because log.ts is the one module everything imports and that
 * imports nothing, so it can be read from anywhere without a cycle.
 *
 * Reads BC's own current-room global; not being in a room (ChatRoomData null) reads as off, the
 * safe default. Wrapped so a missing or unexpected global can never throw into a handler. */
export function isTestingMode(): boolean {
	return FORCE_TESTING || inTestingRoom();
}

/** The room half of isTestingMode, without the harness override. */
function inTestingRoom(): boolean {
	try {
		const name = typeof ChatRoomData !== "undefined" && ChatRoomData ? ChatRoomData.Name : null;
		return typeof name === "string" && name.trim().toLowerCase() === TESTING_ROOM;
	} catch {
		return false;
	}
}
