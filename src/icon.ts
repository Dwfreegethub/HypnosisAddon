// The add-on's icon: a single-line hypnotic spiral ("option 5" from the 2026-09-16 icon
// refresh, DW's pick). It replaces the earlier FILLED two-arm spiral (v0.72.8), whose thick
// arms merged into a solid navy disc once DrawButton scaled it down to the 56×56 profile
// button — the visual regression logged as Known Bug #6. A stroked spiral keeps even gaps
// between its turns at any size, so it reads as a spiral rather than a blob, and its light
// weight matches the line-drawing remote icon it sits beneath.
//
// Used in two places from one source, so both move together: the remote icon on another
// player's Information Sheet (remote.ts) and the Preferences > Extensions entry (menu.ts).
//
// Shipped as an SVG `data:` URI so it needs no hosting and stays crisp at any button size.
// Verified against R131 that both render paths accept it: the Extensions list draws it as an
// HTML `<img>` (Screens/Character/Preference/Extensions.js, ElementButton.Create { image }),
// and the profile button draws it on the game canvas via DrawButton → drawImage. The explicit
// width/height are load-bearing there — DrawButton reads `img.width` to fit the image, and a
// viewBox-only SVG reports width 0, which would fit to nothing.
//
// Pure math + encodeURIComponent: no DOM, no BC globals, so this is a leaf module safe to
// evaluate at load.

const INK = "#2c2352";
const TURNS = 3.0;
const R_MAX = 44; // out of the 100-unit viewBox, centred at 50,50
const STROKE = 4.5;

/** A single Archimedean spiral from the centre out to `R_MAX`, as an SVG path `d`. The radius
 * grows linearly with the angle, so the gap between successive turns stays even — which is what
 * reads as a clean hypnotic spiral rather than a filled shape. */
function spiralPath(): string {
	const n = 240;
	const tMax = TURNS * 2 * Math.PI;
	const pts: string[] = [];
	for (let i = 0; i <= n; i++) {
		const t = (tMax * i) / n;
		const r = R_MAX * (t / tMax);
		pts.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
	}
	return `M${pts.join(" L")}`;
}

function build(): string | undefined {
	try {
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 100 100">` +
			`<path d="${spiralPath()}" fill="none" stroke="${INK}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>` +
			`<circle cx="50" cy="50" r="${(STROKE * 0.7).toFixed(2)}" fill="${INK}"/>` +
			`</svg>`;
		return "data:image/svg+xml," + encodeURIComponent(svg);
	} catch {
		return undefined;
	}
}

/** The spiral as an SVG `data:` URI, built once at load, or `undefined` if it could not be
 * built — callers fall back to a text label so a broken build never leaves a blank button. */
export const SPIRAL_ICON: string | undefined = build();
