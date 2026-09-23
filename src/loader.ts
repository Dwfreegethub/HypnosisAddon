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
// Where the add-on comes from, in order:
//   1. jsDelivr, following main. A real CDN serving the right content type, so an ordinary
//      script tag works. jsDelivr caches a branch URL for up to 12 hours by its own account (not
//      verified from here: jsDelivr is unreachable from the build workspace), which is why
//      .github/workflows/purge-cdn.yml clears that cache on every push that changes the bundle.
//   2. The raw GitHub copy of the same file. raw.githubusercontent.com serves text/plain with
//      nosniff (checked 2026-09-23), so a script tag pointed at it is refused; it has to be
//      fetched and run as inline text instead. It allows any origin (access-control-allow-origin
//      "*", checked the same day) and caches for five minutes. It exists for players who can
//      reach GitHub but not jsDelivr.
//   3. Neither: say so on screen. A loader that fails quietly leaves a player with no add-on and
//      nothing anywhere telling them why (rule 5).
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
export const FALLBACK_URL = "https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/cdn/HypnosisAddon.js";

/** Loads the bundle from the CDN as a normal script tag. Resolves true if it ran, false if the
 * browser reported the load as failed (network error, blocked host, 404). */
function loadFromCdn(): Promise<boolean> {
	return new Promise((resolve) => {
		const s = document.createElement("script");
		s.src = CDN_URL;
		s.onload = () => resolve(true);
		s.onerror = () => resolve(false);
		(document.head || document.documentElement).appendChild(s);
	});
}

/** Fetches the bundle from GitHub and runs it as an inline script. Resolves true only if the
 * fetch came back OK and non-empty; the text is then run the same way the CDN copy would be. */
async function loadFromFallback(): Promise<boolean> {
	try {
		const res = await fetch(FALLBACK_URL, { cache: "no-cache" });
		if (!res.ok) {
			warn(`loader: GitHub fallback answered ${res.status}`);
			return false;
		}
		const code = await res.text();
		if (!code.trim()) {
			warn("loader: GitHub fallback returned an empty file");
			return false;
		}
		const s = document.createElement("script");
		// sourceURL names the code in the console's stack traces, which would otherwise point at
		// an anonymous inline script.
		s.textContent = `${code}\n//# sourceURL=${FALLBACK_URL}`;
		(document.head || document.documentElement).appendChild(s);
		return true;
	} catch (err) {
		warn("loader: GitHub fallback could not be fetched:", err);
		return false;
	}
}

export const FAILED_NOTICE =
	"ECHS could not load: neither jsDelivr nor GitHub could be reached. Refresh the page to try again. (Click to dismiss.)";

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

export async function runLoader(): Promise<"cdn" | "fallback" | "failed"> {
	info(`loader v${__VERSION__}: loading ECHS from jsDelivr`);
	if (await loadFromCdn()) return "cdn";
	warn(`loader: jsDelivr copy failed to load (${CDN_URL}); trying GitHub directly`);
	if (await loadFromFallback()) {
		info("loader: loaded ECHS from the GitHub fallback");
		return "fallback";
	}
	warn("loader: ECHS was not loaded: both jsDelivr and the GitHub fallback failed");
	showFailedNotice();
	return "failed";
}
