// The install loader (v0.83.0).
//
// Since v0.83.0 what a player installs is a small loader that fetches the add-on at runtime:
// jsDelivr first, then GitHub directly, then an on-screen notice. What this suite exists to catch:
//
//   1. a failed load that says nothing. With the add-on no longer in the installed file, a loader
//      that fails quietly leaves a player with no add-on and no sign anything is wrong (rule 5).
//   2. the add-on put into the page twice (fallback run after a CDN copy that did load), which
//      would hook every BC function twice.
//   3. a release that breaks the update chain for existing installs. Testers' managers find the
//      loader only because it keeps the old file's update URLs, name and host list; and they take
//      it only because its version line climbs past the old one.
//   4. a release that commits the wrong file to either place: the full add-on back at the root, or
//      the loader and the bundle pointing at different paths.
//
// The loader's DOM and network are stubbed; the load outcome of each source is set per scenario.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

// The loader logs through log.ts, which the stub below captures; this suite's own lines must not be
// captured with them, or a failure would print nowhere.
const say = console.log.bind(console);
let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) say(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- a stub DOM just big enough for the loader ---------------------------------------------
let appended = [], cdnOutcome = "load", fetchCalls = [], fetchImpl = null;
const makeEl = (tag) => {
	const el = { tag, style: {}, textContent: "", listeners: {}, removed: false };
	el.addEventListener = (ev, fn) => { el.listeners[ev] = fn; };
	el.remove = () => { el.removed = true; };
	return el;
};
const container = {
	appendChild(el) {
		appended.push(el);
		// A script tag with a src fires its outcome asynchronously, like a browser.
		if (el.tag === "script" && el.src) queueMicrotask(() => (cdnOutcome === "load" ? el.onload() : el.onerror()));
		return el;
	},
};
globalThis.document = { createElement: makeEl, head: container, body: container, documentElement: container };
globalThis.fetch = async (url, opts) => { fetchCalls.push(url); return fetchImpl(url, opts); };
const consoleLines = [];
for (const k of ["info", "warn", "debug", "log"]) console[k] = (...a) => consoleLines.push(`${k}: ${a.join(" ")}`);

const { runLoader, CDN_URL, FALLBACK_URL, FAILED_NOTICE } = await import("./loader-bundle.mjs");

const reset = () => { appended = []; fetchCalls = []; consoleLines.length = 0; };
const scripts = () => appended.filter((e) => e.tag === "script");
const notices = () => appended.filter((e) => e.tag === "div");
const okText = (text) => async () => ({ ok: true, status: 200, text: async () => text });

// --- jsDelivr loads: one script tag, nothing else -------------------------------------------
// Failure looks like: a fetch to GitHub here, which is the double load (2) — the fallback running
// even though the CDN copy already ran.
reset(); cdnOutcome = "load"; fetchImpl = okText("/* bundle */");
check("CDN ok: outcome", await runLoader(), "cdn");
check("CDN ok: one script tag, pointed at jsDelivr", scripts().map((s) => s.src), [CDN_URL]);
check("CDN ok: GitHub never fetched", fetchCalls.length, 0);
check("CDN ok: no failure notice", notices().length, 0);

// --- jsDelivr fails, GitHub answers: the bundle runs inline, once ----------------------------
// Failure looks like: outcome "failed" or no second script, meaning a player who can reach GitHub
// but not jsDelivr gets nothing.
reset(); cdnOutcome = "error"; fetchImpl = okText("/* the add-on */");
check("fallback: outcome", await runLoader(), "fallback");
check("fallback: GitHub fetched once, at the fallback URL", fetchCalls, [FALLBACK_URL]);
check("fallback: two script tags, the second inline", scripts().map((s) => Boolean(s.src)), [true, false]);
check("fallback: inline script carries the fetched code", scripts()[1]?.textContent.startsWith("/* the add-on */"), true);
check("fallback: no failure notice", notices().length, 0);
check("fallback: console says it fell back", consoleLines.some((l) => l.includes("GitHub fallback")), true);

// --- both fail, three ways: each must end in the visible notice -------------------------------
// Failure looks like: no div appended. That is (1), the silent failure this suite exists for.
const failures = {
	"GitHub answers 404": async () => ({ ok: false, status: 404, text: async () => "Not Found" }),
	"GitHub unreachable": async () => { throw new TypeError("Failed to fetch"); },
	"GitHub returns an empty file": okText("   \n"),
};
for (const [label, impl] of Object.entries(failures)) {
	reset(); cdnOutcome = "error"; fetchImpl = impl;
	check(`${label}: outcome`, await runLoader(), "failed");
	check(`${label}: nothing run inline`, scripts().filter((s) => !s.src).length, 0);
	check(`${label}: one notice on screen, saying so`, notices().map((n) => n.textContent), [FAILED_NOTICE]);
	check(`${label}: console warning names both sources`, consoleLines.some((l) => l.startsWith("warn:") && l.includes("both jsDelivr and the GitHub fallback")), true);
}
// The notice stays until clicked, then goes.
const notice = notices()[0];
check("notice is still up before any click", notice.removed, false);
notice.listeners.click?.();
check("clicking the notice removes it", notice.removed, true);
check("the notice tells the player what to do", /refresh/i.test(FAILED_NOTICE), true);

// --- both URLs name the file the release writes ----------------------------------------------
// Failure looks like: a mismatch here, where every tester's loader asks for a file main does not
// have and every load ends in the notice.
const release = read("release.mjs");
const BUNDLE_PATH = "cdn/HypnosisAddon.js";
check("release writes the bundle to cdn/HypnosisAddon.js", release.includes(`"${BUNDLE_PATH}"`), true);
check("jsDelivr URL: this repo, following main, that path", CDN_URL, `https://cdn.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@main/${BUNDLE_PATH}`);
check("GitHub URL: this repo, main, that path", FALLBACK_URL, `https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/${BUNDLE_PATH}`);
const purge = existsSync(new URL(".github/workflows/purge-cdn.yml", root)) ? read(".github/workflows/purge-cdn.yml") : "";
check("the cache purge clears the same URL the loader loads", purge.includes(`purge.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@main/${BUNDLE_PATH}`), true);

// --- the built loader keeps the update chain intact ------------------------------------------
// A fresh build, so this reads what build.mjs makes now and not a stale dist/.
execFileSync(process.execPath, ["build.mjs"], { cwd: root, stdio: "ignore" });
const pkg = JSON.parse(read("package.json"));
const meta = read("meta.txt");
const loader = read("dist/HypnosisAddon.loader.user.js");
const header = (s) => s.slice(0, s.indexOf("// ==/UserScript==")).split("\n");
const keyLines = (s, key) => header(s).filter((l) => new RegExp(`^// @${key}\\s`).test(l));
const INSTALL_URL = "https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js";

// Failure looks like: two version lines (a manager taking the last may read the wrong one, the
// v0.75.0 bug), or a hand-typed number that stops climbing, so installs never move onto a release.
check("loader: exactly one @version line", keyLines(loader, "version").length, 1);
check("loader: @version is package.json's", keyLines(loader, "version")[0]?.split(/\s+/).pop(), pkg.version);
// Failure looks like: a changed update URL. Existing installs check the OLD one, so they would
// never see the loader, or anything after it.
check("loader: @updateURL is the existing install URL", keyLines(loader, "updateURL").map((l) => l.split(/\s+/).pop()), [INSTALL_URL]);
check("loader: @downloadURL is the existing install URL", keyLines(loader, "downloadURL").map((l) => l.split(/\s+/).pop()), [INSTALL_URL]);
// A manager keys a script on name and namespace; a change makes the loader a second install.
check("loader: same @name as meta.txt", keyLines(loader, "name"), keyLines(meta, "name"));
check("loader: same @namespace as meta.txt", keyLines(loader, "namespace"), keyLines(meta, "namespace"));
// The host list decides where anything runs at all; a miss is silent.
check("loader: @match lines are meta.txt's, all of them", keyLines(loader, "match"), keyLines(meta, "match"));
check("loader: at least the eight known hosts", keyLines(loader, "match").length >= 8, true);
// The loader must stay small and must not carry the add-on inside it.
check("loader: does not contain the add-on itself", loader.includes("registerMod"), false);
check("loader: under 20 KB", loader.length < 20_000, true);

const bundle = read("dist/HypnosisAddon.js");
check("bundle: no userscript header (it is loaded, never installed)", bundle.includes("==UserScript=="), false);
check("bundle: is the add-on, at this version", bundle.includes(`__VERSION__`) === false && bundle.includes(`"${pkg.version}"`), true);

// --- the committed files have the right shape -------------------------------------------------
// Not whether they are current (that is `npm run release`'s job and would fail mid-change), only
// that the root file is the loader and the bundle exists. Failure looks like: the full add-on back
// at the root, which a manager would install happily, and the CDN split silently undone.
const committedRoot = read("HypnosisAddon.user.js");
check("committed root file is the loader", committedRoot.includes(CDN_URL) && !committedRoot.includes("registerMod"), true);
check("committed cdn/HypnosisAddon.js exists and is the add-on", existsSync(new URL(BUNDLE_PATH, root)) && read(BUNDLE_PATH).includes("registerMod"), true);

say(`loader: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
