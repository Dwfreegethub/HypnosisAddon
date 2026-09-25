// Console levels (v0.82.3), and the debug switch (v0.85.3).
//
// Every line the add-on wrote went through console.log, so an ordinary evening in a busy room
// filled a player's devtools with one line per chat message, hook and state change. Routine
// diagnostics went to console.debug (hidden at Chrome's default level); genuine faults go to
// console.warn so they still stand out; the one "script loaded" line stays console.info, because
// the troubleshooting page tells players to look for it.
//
// v0.85.3: other mod developers keep Verbose on, so console.debug was still a flood for them.
// log() is now silent unless /hypno debug is on or the player is in the Hypno Testing room.
// Failure looks like: a routine line printing with the switch off and outside the room (the
// flood is back), nothing printing with it on (a tester's diagnostics silently gone), the choice
// not surviving a reload, or warn()/info() being gated along with log() (a fault hidden — rule 5).
import { readFileSync, readdirSync } from "node:fs";

globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = String(v); } };
globalThis.ChatRoomData = null;

const seen = { log: [], debug: [], warn: [], info: [] };
const real = { ...console };
const capture = () => { for (const k of Object.keys(seen)) { seen[k] = []; console[k] = (...a) => seen[k].push(a.join(" ")); } };
const release = () => { const got = JSON.parse(JSON.stringify(seen)); for (const k of Object.keys(seen)) console[k] = real[k]; return got; };

let pass = 0, fail = 0;
const check = (label, g, want) => {
	const ok = JSON.stringify(g) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}
    want ${JSON.stringify(want)}
    got  ${JSON.stringify(g)}`);
};

const { build } = await import("./harness-bundle.mjs");
const everyLevel = () => {
	capture();
	build.log("ChatRoomMessage", "{}");
	build.warn("suggestion parsing failed:", "boom");
	build.info("script loaded (vtest)");
	return release();
};

// --- default: off, outside the testing room ---------------------------------------------------
check("the switch starts off", build.isDebugFlagOn(), false);
let got = everyLevel();
check("off: routine lines print nothing", got.debug, []);
check("  and nothing reaches console.log", got.log, []);
check("off: faults still go to console.warn", got.warn, ["[HypnosisAddon] suggestion parsing failed: boom"]);
check("off: the startup line is still console.info", got.info, ["[HypnosisAddon] script loaded (vtest)"]);
// The harness pins isTestingMode() on for every suite; the gate must not read that, or it could
// never be seen switched off in a test (and this suite would pass for the wrong reason).
check("the harness's forced testing mode does not count", [build.isTestingMode(), build.isDebugLogging()], [true, false]);

// --- the testing room turns it on by itself ---------------------------------------------------
globalThis.ChatRoomData = { Name: "  Hypno TESTING " };
got = everyLevel();
check("testing room: routine lines go to console.debug", got.debug, ["[HypnosisAddon] ChatRoomMessage {}"]);
check("  and never to console.log", got.log, []);
check("  without touching the saved switch", [build.isDebugFlagOn(), localStorage.getItem("ECHS_DEBUG")], [false, null]);
globalThis.ChatRoomData = { Name: "Hypno Testing 2" };
check("a room merely named like it does not count", build.isDebugLogging(), false);
globalThis.ChatRoomData = null;

// --- the switch -------------------------------------------------------------------------------
check("switching on reports it saved", build.setDebugFlag(true), true);
check("  and stores it for the next load", localStorage.getItem("ECHS_DEBUG"), "true");
got = everyLevel();
check("on: routine lines go to console.debug", got.debug, ["[HypnosisAddon] ChatRoomMessage {}"]);
check("  and never to console.log", got.log, []);

// A reload is a fresh module reading the same storage. A query string gives Node a new instance.
const reloaded = (await import("./harness-bundle.mjs?reload-on")).build;
check("on survives a reload", reloaded.isDebugFlagOn(), true);
build.setDebugFlag(false);
check("off is stored too", localStorage.getItem("ECHS_DEBUG"), "false");
check("off survives a reload", (await import("./harness-bundle.mjs?reload-off")).build.isDebugFlagOn(), false);
check("off: silent again", everyLevel().debug, []);

// Storage that throws (blocked site data) must never break logging or the command.
const goodStorage = globalThis.localStorage;
globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
check("blocked storage: switching on says it was not saved", build.setDebugFlag(true), false);
check("  but it still applies for this page", everyLevel().debug, ["[HypnosisAddon] ChatRoomMessage {}"]);
check("blocked storage reads as off on load", (await import("./harness-bundle.mjs?reload-blocked")).build.isDebugFlagOn(), false);
build.setDebugFlag(false);
globalThis.localStorage = goodStorage;

// --- /hypno debug ----------------------------------------------------------------------------
// Run through the real registration BC is handed, so a subcommand that exists in the source but
// never reaches BC fails here. Its answer must be in chat, not only the console (rule 5).
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, GetPronouns: () => "SheHer" };
globalThis.ChatRoomCharacter = [globalThis.Player];
const local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m));
globalThis.ServerPlayerIsInChatRoom = () => true;
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);
const { commands } = await import("./harness-bundle.mjs");
commands.installCommands();
const debugCmd = registered.find((c) => c.Tag === "hypno")?.Subcommands?.find((s) => s.Tag === "debug");
check("/hypno debug is registered", !!debugCmd, true);
const run = (args) => { local.length = 0; capture(); debugCmd?.Action(args); release(); return [...local]; };
check("bare toggles on, and says so in chat", [run("").some((m) => /now ON/.test(m)), build.isDebugFlagOn()], [true, true]);
check("bare again toggles off", [run("").some((m) => /now OFF/.test(m)), build.isDebugFlagOn()], [true, false]);
check("'on' sets on", (run("on"), build.isDebugFlagOn()), true);
check("'on' twice stays on", (run("ON"), build.isDebugFlagOn()), true);
check("'off' sets off", (run("off"), build.isDebugFlagOn()), false);
check("nonsense changes nothing and shows usage", [run("maybe").some((m) => /usage/.test(m)), build.isDebugFlagOn()], [true, false]);
globalThis.ChatRoomData = { Name: "Hypno Testing" };
check("off inside the testing room says it stays on there", run("off").some((m) => /stay on/.test(m)), true);
globalThis.ChatRoomData = null;

// Nothing in src/ reaches console directly except log.ts itself, so the levels cannot be
// bypassed by a stray console.log added later.
const src = new URL("../src/", import.meta.url);
const direct = readdirSync(src)
	.filter((f) => f.endsWith(".ts") && f !== "log.ts")
	.flatMap((f) => readFileSync(new URL(f, src), "utf8").split("\n")
		.map((l, i) => [f, i + 1, l])
		.filter(([, , l]) => /\bconsole\.\w+\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)))
	.map(([f, n]) => `${f}:${n}`);
check("no module writes to console directly", direct, []);

const main = readFileSync(new URL("main.ts", src), "utf8");
check("main.ts announces startup through info()", /\binfo\(`script loaded/.test(main), true);
// A hook that fails to install is the plainest fault there is; it must not be hidden.
check("  and reports a failed setup through warn()", /\bwarn\(`FAILED to set up/.test(main), true);

console.log(`console: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
