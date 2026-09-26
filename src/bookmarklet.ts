// The bookmark loader ("bookmarklet"), v0.92.2 (DW, 2026-09-26).
//
// A browser bookmark whose address is `javascript:…`: clicked on the game's tab, it runs in the
// page, exactly as the installed loader does — so it serves players with no userscript manager at
// all, including mobile browsers. The add-on needs nothing a manager provides (the loader is
// `@grant none`; the bundle uses no GM_ API), so the same bundle runs either way.
//
// Built FROM the loader's own addresses, never retyped, so the two cannot point at different
// places; `npm run build` writes it to dist/bookmarklet.txt and `npm run release` to the committed
// bookmarklet.txt. Same order and the same rules as the loader (loader.ts): GitHub first, jsDelivr
// only if GitHub fails, never both, and a failure SAID, not silent (rule 5).
//
// Two differences, both because a bookmark is clicked by hand, usually after logging in:
//   - clicking it twice must not load ECHS twice. The mod SDK refuses a second "ECHS" with an
//     error; the bookmark asks the SDK first and says "already loaded" instead;
//   - it reports with alert(): there is no page of ours to draw a notice on yet.
//
// Technique reference only: bookmark loaders are the common way BC add-ons (LSCG, BCX) are offered
// without a userscript manager (rule 7, no code from either).

import { CDN_URL, GITHUB_URL } from "./loader";

/** The bookmark's code, before the `javascript:` prefix. One line, no comments: some browsers
 * collapse a bookmark address to a single line, which would turn a `//` comment into the rest of it. */
export function bookmarkletCode(): string {
	return [
		"(()=>{",
		"const S=window.bcModSdk;",
		'if(S&&S.getModsInfo&&S.getModsInfo().some(m=>m.name==="ECHS")){alert("ECHS is already loaded.");return;}',
		`const G=${JSON.stringify(GITHUB_URL)},C=${JSON.stringify(CDN_URL)};`,
		'const fail=()=>alert("ECHS could not load: neither GitHub nor jsDelivr could be reached. Try again in a moment.");',
		"const cdn=()=>{const s=document.createElement(\"script\");s.src=C+\"?t=\"+Date.now();s.onerror=fail;document.head.appendChild(s);};",
		'fetch(G,{cache:"no-cache"}).then(r=>{if(!r.ok)throw 0;return r.text();}).then(t=>{if(!t.trim())throw 0;',
		'const s=document.createElement("script");s.textContent=t+"\\n//# sourceURL="+G;document.head.appendChild(s);}).catch(cdn);',
		"})();",
	].join("");
}

/** The whole bookmark address, ready to paste into a bookmark's URL field. */
export function bookmarkletUrl(): string {
	return `javascript:${bookmarkletCode()}`;
}
