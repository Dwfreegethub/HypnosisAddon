const TAG = "[HypnosisAddon]";

// Three levels, so the browser console only shows what somebody needs to see.
//
// Everything used to go through console.log, which put a line in every player's devtools for
// every chat message, hook and state change in the room — noise that buried the few lines that
// meant something had actually gone wrong. Routine diagnostics are now console.debug, which
// Chrome files under "Verbose" (hidden unless asked for) and Firefox under "Debug". They are
// all still there for a tester who turns that level on.

/** Routine diagnostics — what the add-on saw and did. Hidden at the browser's default level. */
export function log(...args: unknown[]): void {
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
	if (FORCE_TESTING) return true;
	try {
		const name = typeof ChatRoomData !== "undefined" && ChatRoomData ? ChatRoomData.Name : null;
		return typeof name === "string" && name.trim().toLowerCase() === TESTING_ROOM;
	} catch {
		return false;
	}
}
