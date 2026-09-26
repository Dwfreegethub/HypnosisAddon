// The bookmark loader, v0.92.2 (DW, 2026-09-26).
//
// Builds src/bookmarklet.ts the way build.mjs does, then RUNS the resulting `javascript:` line
// against a stub page, as a browser would when the bookmark is clicked. The loader's rules must hold:
// GitHub first, jsDelivr only if GitHub fails, never both, a failure said; plus the bookmark's own:
// clicking it twice does not load ECHS twice. And its addresses must be the loader's.
//
// Every check states what failure looks like.
import esbuild from "esbuild";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const out = fileURLToPath(new URL("test/bookmarklet.gen.mjs", root));
await esbuild.build({
	entryPoints: [fileURLToPath(new URL("src/bookmarklet.ts", root))],
	bundle: true, format: "esm", outfile: out, logLevel: "warning",
	define: { __VERSION__: '"test"' },
});
const { bookmarkletUrl } = await import(pathToFileURL(out).href);
const { CDN_URL, GITHUB_URL } = await import("./loader-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const url = bookmarkletUrl();
// --- the address itself ------------------------------------------------------------------------
// Failure: not a bookmark address, split over lines, or pointing somewhere the loader does not.
check("starts with javascript:", url.startsWith("javascript:"), true);
check("one line (a bookmark address is one line)", url.includes("\n"), false);
check("fetches the loader's GitHub address", url.includes(JSON.stringify(GITHUB_URL)), true);
check("falls back to the loader's jsDelivr address", url.includes(JSON.stringify(CDN_URL)), true);
check("GitHub comes before jsDelivr, as in the loader", url.indexOf("fetch(G") < url.indexOf(".catch(cdn)"), true);

// --- running it against a stub page ------------------------------------------------------------
let appended = [], alerts = [], fetches = [], cdnFails = false, fetchImpl = null, mods = [];
const click = async () => {
	appended = []; alerts = []; fetches = [];
	const head = {
		appendChild(el) {
			appended.push(el);
			if (el.src) queueMicrotask(() => (cdnFails ? el.onerror?.() : el.onload?.()));
		},
	};
	const ctx = {
		window: { bcModSdk: mods.length ? { getModsInfo: () => mods.map((name) => ({ name })) } : undefined },
		document: { head, createElement: (tag) => ({ tag, textContent: "", src: "" }) },
		fetch: async (u, o) => { fetches.push(u); return fetchImpl(u, o); },
		alert: (m) => alerts.push(m),
	};
	new Function("window", "document", "fetch", "alert", url.slice("javascript:".length))(ctx.window, ctx.document, ctx.fetch, ctx.alert);
	for (let i = 0; i < 10; i++) await new Promise((r) => setTimeout(r, 0));
};
const ok = (text) => async () => ({ ok: true, text: async () => text });

// GitHub answers. Failure: jsDelivr asked as well (the double load), or the code not run.
mods = []; cdnFails = false; fetchImpl = ok("/* ECHS */");
await click();
check("GitHub ok: fetched from GitHub", fetches, [GITHUB_URL]);
check("  one script, inline, carrying the code", appended.map((e) => [Boolean(e.src), e.textContent.startsWith("/* ECHS */")]), [[false, true]]);
check("  no alert", alerts, []);

// GitHub fails three ways; jsDelivr loads. Failure: nothing loaded, or both.
for (const [label, impl] of Object.entries({
	"404": async () => ({ ok: false, text: async () => "Not Found" }),
	unreachable: async () => { throw new TypeError("Failed to fetch"); },
	empty: ok("  \n"),
})) {
	fetchImpl = impl; cdnFails = false;
	await click();
	check(`GitHub ${label}: one script tag, at jsDelivr with a per-load timestamp`, appended.map((e) => /\?t=\d+$/.test(e.src) && e.src.split("?")[0] === CDN_URL), [true]);
	check(`  nothing inline`, appended.some((e) => e.textContent), false);
	check(`  no alert`, alerts, []);
}

// Both fail. Failure: silence (rule 5).
fetchImpl = async () => { throw new TypeError("Failed to fetch"); }; cdnFails = true;
await click();
check("both fail: the player is told", alerts.length === 1 && /could not load/.test(alerts[0]), true);

// Already loaded. Failure: fetched and run a second time.
mods = ["LSCG", "ECHS"]; fetchImpl = ok("/* ECHS */"); cdnFails = false;
await click();
check("already loaded: says so", alerts, ["ECHS is already loaded."]);
check("  and loads nothing", [fetches.length, appended.length], [0, 0]);
mods = ["LSCG"];
await click();
check("other add-ons loaded, not ECHS: loads", fetches, [GITHUB_URL]);

// --- the committed copy matches the source (after a release) -------------------------------------
// Failure: a bookmarklet.txt that players copy but that no longer matches what the source builds.
const committed = new URL("bookmarklet.txt", root);
if (existsSync(committed)) check("committed bookmarklet.txt is current (run npm run release)", readFileSync(committed, "utf8").trim(), url);

console.log(`bookmarklet: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
