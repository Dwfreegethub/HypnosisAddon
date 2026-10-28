// ECHS starts once per page, however many loaders run it (v1.0.1, ahead of the FUSAM listing).
//
// Runs the real shipped bundle (dist/HypnosisAddon.js, built here) in a bare sandbox page, twice.
// The sign that the add-on proper started is bondage-club-mod-sdk appearing on window: main.ts
// imports it first, so it exists if and only if main.ts ran. Failure looks like the second run
// starting the add-on again (a second SDK init over the first, every handler hooked twice), or the
// first run not starting it at all.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
execFileSync(process.execPath, ["build.mjs"], { cwd: root, stdio: "ignore" });
const bundle = readFileSync(new URL("dist/HypnosisAddon.js", root), "utf8");
const version = JSON.parse(readFileSync(new URL("package.json", root), "utf8")).version;

// The sandbox has no BC in it, so main.ts gets as far as it gets and then fails. That is fine and
// expected: only whether it STARTED is under test. Its async failure is swallowed here.
process.on("unhandledRejection", () => {});

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const settle = () => new Promise((r) => setTimeout(r, 50));

const warnings = [];
let started = 0; // main.ts says "script loaded" once each time it runs
const page = { console: { log() {}, info: (...a) => { if (/script loaded/.test(a.join(" "))) started++; }, debug() {}, error() {}, warn: (...a) => warnings.push(a.join(" ")) }, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {}, TextEncoder, TextDecoder };
page.window = page;
page.globalThis = page;
vm.createContext(page);
const run = () => {
	try {
		vm.runInContext(bundle, page);
	} catch {
		// As above: a synchronous failure after the claim is the sandbox's missing BC, not the guard.
	}
};

// --- the first copy claims the page and starts -------------------------------------------------
run();
check("the first copy claims the page, synchronously, with its version", page.__ECHS_LOADED__, version);
await settle();
check("  and the add-on starts (main.ts ran once)", started, 1);


// --- a second copy does nothing, and says so ---------------------------------------------------
warnings.length = 0;
run();
await settle();
check("a second copy leaves the claim alone", page.__ECHS_LOADED__, version);
check("  and does not start the add-on again (main.ts still ran only once)", started, 1);
check("  and says so in the console, naming both loaders", warnings.some((w) => /already running/.test(w) && /FUSAM/.test(w)), true);

// --- a page some other loader already claimed: nothing starts at all ---------------------------
const other = { ...page, __ECHS_LOADED__: "0.0.1", bcModSdk: undefined };
other.window = other;
other.globalThis = other;
vm.createContext(other);
try { vm.runInContext(bundle, other); } catch {}
await settle();
check("an already-claimed page never gets the add-on", other.bcModSdk, undefined);

console.log(`load-once: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
