// The startup version line (v0.81.0).
//
// One local chat line naming the build, so a tester can be asked what theirs says instead of
// everyone guessing which version is actually installed. Three ways it could go wrong, and all
// three are what this suite exists to catch:
//
//   1. it reaches the ROOM. A line saying what add-on somebody is running, emoted into a public
//      room, is the worst failure available here and is not recoverable once sent.
//   2. it prints before there is a chat log to print into. ChatRoomSendLocal called from the
//      lobby is swallowed with no error, so the banner would simply never appear and nothing
//      would say so — rule 5.
//   3. it prints more than once, or reads settings and so says different things to different
//      players.
//
// The poll is driven rather than waited on: setInterval is stubbed so a tick is a function call.
let local = [], room = [];
let inRoom = false;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = (m) => local.push(m);
globalThis.ChatRoomSendEmote = (m) => room.push(m);
globalThis.ServerPlayerIsInChatRoom = () => inRoom;

// The driven clock and poll. Every scheduled interval is kept so a tick can be forced; clearing
// one removes it, which is also how "the poll stopped itself" is observable below.
let intervals = new Map(), nextId = 1;
const realSetInterval = globalThis.setInterval, realClearInterval = globalThis.clearInterval;
globalThis.setInterval = (fn) => { const id = nextId++; intervals.set(id, fn); return id; };
globalThis.clearInterval = (id) => { intervals.delete(id); };
const tickAll = () => { for (const fn of [...intervals.values()]) fn(); };

const realNow = Date.now;
let clock = 1_000_000;
Date.now = () => clock;

const { welcome, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- not in a room: nothing is printed, and the poll keeps waiting -----------------------
// Failure looks like: local.length 1 here. That is the silent case — BC would drop the line
// and the banner would never be seen at all.
welcome.startStartupBanner();
check("nothing printed while still in the lobby", local.length, 0);
check("  and the poll is still waiting", intervals.size, 1);
tickAll();
check("a later tick with no room still prints nothing", local.length, 0);
check("  poll still waiting", intervals.size, 1);

// --- the room appears: one line, once -----------------------------------------------------
inRoom = true;
tickAll();
check("entering a room prints exactly one line", local.length, 1);
check("  the poll stopped itself", intervals.size, 0);

const line = local[0];
// tellPlayer brackets what it sends; that bracketing IS the local-only marker in this codebase.
check("local only (tellPlayer brackets it)", line.startsWith("[") && line.endsWith("]"), true);
check("nothing was emoted to the room", room.length, 0);
check("carries the full name", /Erotic Chat Hypnosis Suite \(ECHS\)/.test(line), true);
// __VERSION__ is the build-time define from package.json, and build-test.mjs pins it to the
// string "test" for the suites. So "vtest" here is the proof that the number comes from the
// build rather than a hand-typed literal, which is the whole reason this line can be trusted.
check("carries the build version, from the define", /\bvtest\b/.test(line), true);
check("points at the guide", /\/hypno help/.test(line), true);
check("one line, not several", line.includes("\n"), false);

// --- never twice --------------------------------------------------------------------------
// Failure looks like: local.length 2. A banner that reprints on every room change is noise in
// the middle of a scene rather than a startup line.
local = [];
welcome.showStartupBanner();
check("showing it again prints nothing", local.length, 0);
welcome.startStartupBanner();
tickAll();
check("  and a second poll cannot re-print it either", local.length, 0);

// --- it says the same thing to everyone -----------------------------------------------------
// The banner must not read settings: a line that varies with what is switched on would leak
// the player's configuration into a place they did not choose to show it, and would stop being
// a reliable answer to "which build are you on".
check("the banner reads no setting", /enabled|switched on|permission/i.test(line), false);

// --- the first-run notice no longer repeats the version --------------------------------------
// The two print next to each other on a fresh install, and both carrying "(ECHS) v0.81.0" read
// as a stutter. The notice keeps the name (it has to stand alone if it prints first) and drops
// the number, which the banner now owns. Failure looks like a version in the notice's line.
storage.resetSettings();
local = [];
welcome.maybeShowFirstRunNotice();
check("the first-run notice still fires", local.length, 2);
check("  and no longer carries a version number", /v\d|version/i.test(local[0]), false);

// --- every surface that shows a version reads the same build define ------------------------
// Three places now say which build this is: the corner watermark (main.ts), this banner
// (welcome.ts) and the settings screen title (menu.ts). A hand-typed number in any one of them
// would disagree with the other two the first time somebody bumped package.json without looking
// — and a version that lies is worse than no version at all, since the whole point is to settle
// "which build are you actually on". Source-level, because the settings title is drawn inside a
// BC canvas callback there is no way to call from here. Failure looks like a literal.
import { readFileSync } from "node:fs";
const src = (f) => readFileSync(new URL(`../src/${f}`, import.meta.url), "utf8");
const versionLine = (f, needle) => src(f).split("\n").find((l) => l.includes(needle)) ?? "";

for (const [file, needle, what] of [
	["main.ts", "el.textContent =", "the corner watermark"],
	["welcome.ts", "tellPlayer(`Erotic Chat", "the chat banner"],
	["menu.ts", "\u2014 settings`", "the settings screen title"],
]) {
	const line = versionLine(file, needle);
	check(`${what} reads the build define`, /\$\{__VERSION__\}/.test(line), true);
	check(`  and carries no hand-typed number`, /\bv?\d+\.\d+\.\d+\b/.test(line), false);
}

globalThis.setInterval = realSetInterval;
globalThis.clearInterval = realClearInterval;
Date.now = realNow;
console.log(`banner: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
