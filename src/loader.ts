// The install loader (v0.83.0).
//
// This is the whole of what a player's userscript manager installs. It does one thing: put the
// real add-on into the page, fetched fresh on every page load, so a fix reaches a tester on their
// next refresh instead of whenever their manager next checks for updates.
//
// It imports nothing from the rest of src/ but log.ts, which itself imports nothing: whatever it
// pulled in would be frozen into the installed copy, which is the thing this split exists to stop
// changing. log.ts is here so the console levels stay the add-on's own (test/console.mjs).
//
// Where the add-on comes from, in order (swapped in v0.92.1):
//   1. The raw GitHub copy, straight from main. raw.githubusercontent.com serves text/plain with
//      nosniff (checked 2026-09-23), so a script tag pointed at it is refused; it is fetched and
//      run as inline text instead. It allows any origin (access-control-allow-origin "*") and
//      caches for about five minutes, so a merged release reaches everyone within minutes.
//   2. jsDelivr, following main, as a script tag — for players who cannot reach GitHub.
//   3. Neither: say so on screen. A loader that fails quietly leaves a player with no add-on and
//      nothing anywhere telling them why (rule 5).
//
// WHY GITHUB FIRST (2026-09-26). jsDelivr used to be first. From v0.91.3 its lookup of what `main`
// means broke on its side (its data API answered 502, then `"version": null`), and it went on
// serving v0.91.2 for over an hour of purges — each accepted, unthrottled, on both of its networks.
// Serving an OLD copy is not an error, so the GitHub fallback never ran and every player stayed on
// the old build. GitHub cannot serve a stale `main` for longer than its short cache.
//
// Only a load that ERRORS falls through to the next source. There is deliberately no timeout: a
// slow jsDelivr that answered after the fallback had already run would put a second copy of the
// add-on in the page, hooking everything twice.
//
// Technique reference only: the "small installed loader, real code fetched at runtime" shape is
// the one LSCG's published loader uses (rule 7, no LSCG code). Nothing here is copied from it.

import { info, warn } from "./log";

/** jsDelivr's copy of the bundle on main. `npm run release` writes cdn/HypnosisAddon.js. */
export const CDN_URL = "https://cdn.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@main/cdn/HypnosisAddon.js";
/** The same file from GitHub directly, used only when the CDN copy fails to load. */
export const GITHUB_URL = "https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/cdn/HypnosisAddon.js";

/** The CDN address with a per-load timestamp, so the browser cannot answer from its cache. */
export function cdnUrlForThisLoad(now: number = Date.now()): string {
	return `${CDN_URL}?t=${now}`;
}

/** Loads the bundle from the CDN as a normal script tag. Resolves true if it ran, false if the
 * browser reported the load as failed (network error, blocked host, 404). */
function loadFromCdn(): Promise<boolean> {
	return new Promise((resolve) => {
		const s = document.createElement("script");
		// A fresh address every load (v0.91.1). jsDelivr sends `Cache-Control: max-age=604800`, so a
		// browser may reuse its copy for a WEEK: the purge after each merge cleared jsDelivr's servers
		// and not players' browsers, and "fetched fresh on every page load" (above) was not true. The
		// timestamp defeats only the browser cache — jsDelivr ignores the query string and serves its
		// own (purged) copy either way (checked 2026-09-26: the same `Age` for different `?t=`).
		s.src = cdnUrlForThisLoad();
		s.onload = () => resolve(true);
		s.onerror = () => resolve(false);
		(document.head || document.documentElement).appendChild(s);
	});
}

/** Fetches the bundle from GitHub and runs it as an inline script. Resolves true only if the
 * fetch came back OK and non-empty; the text is then run the same way the CDN copy would be. */
async function loadFromGitHub(): Promise<boolean> {
	try {
		const res = await fetch(GITHUB_URL, { cache: "no-cache" });
		if (!res.ok) {
			warn(`loader: GitHub answered ${res.status}`);
			return false;
		}
		const code = await res.text();
		if (!code.trim()) {
			warn("loader: GitHub returned an empty file");
			return false;
		}
		const s = document.createElement("script");
		// sourceURL names the code in the console's stack traces, which would otherwise point at
		// an anonymous inline script.
		s.textContent = `${code}\n//# sourceURL=${GITHUB_URL}`;
		(document.head || document.documentElement).appendChild(s);
		return true;
	} catch (err) {
		warn("loader: GitHub could not be fetched:", err);
		return false;
	}
}

export const FAILED_NOTICE =
	"ECHS could not load: neither GitHub nor jsDelivr could be reached. Refresh the page to try again. (Click to dismiss.)";

/** A lasting on-screen line saying the add-on is not running. It stays until clicked, unlike the
 * add-on's own fading "loaded" toast: this is the only sign anything went wrong, and a player
 * who looks away for five seconds would otherwise never see it. */
function showFailedNotice(): void {
	const el = document.createElement("div");
	el.textContent = FAILED_NOTICE;
	Object.assign(el.style, {
		position: "fixed",
		bottom: "4px",
		right: "4px",
		maxWidth: "420px",
		zIndex: "9999",
		padding: "4px 8px",
		background: "rgba(140,0,0,0.85)",
		color: "#fff",
		fontSize: "12px",
		fontFamily: "sans-serif",
		borderRadius: "3px",
		cursor: "pointer",
	});
	el.addEventListener("click", () => el.remove());
	(document.body || document.documentElement).appendChild(el);
}

export async function runLoader(): Promise<"github" | "cdn" | "failed"> {
	info(`loader v${__VERSION__}: loading ECHS from GitHub`);
	if (await loadFromGitHub()) return "github";
	// Only after GitHub has FAILED, never alongside it: two copies in the page would hook everything
	// twice. There is deliberately no timeout for the same reason.
	warn(`loader: GitHub copy failed to load (${GITHUB_URL}); trying jsDelivr`);
	if (await loadFromCdn()) {
		info("loader: loaded ECHS from jsDelivr");
		return "cdn";
	}
	warn("loader: ECHS was not loaded: both GitHub and jsDelivr failed");
	showFailedNotice();
	return "failed";
}
