// The add-on's icon: a stylized two-arm hypnotic spiral ("concept C" from the 2026-09-15
// design pass, DW's pick). Used in two places — the remote icon on another player's
// Information Sheet (remote.ts) and the Preferences > Extensions entry (menu.ts).
//
// Shipped as an SVG `data:` URI so it needs no hosting and stays crisp at any button size.
// Verified against R131 that both render paths accept it: the Extensions list draws it as an
// HTML <img> (Screens/Character/Preference/Extensions.js, ElementButton.Create { image }),
// and the profile button draws it on the game canvas via DrawButton → drawImage, which needs
// the explicit width/height this SVG carries.
//
// Pure math + encodeURIComponent: no DOM, no BC globals, so this is a leaf module safe to
// evaluate at load. The geometry matches the design preview exactly.

const INK = "#2c2352";

/** One tapered arm of an Archimedean spiral — thick at the rim, tapering to a point at the
 * centre — as a filled SVG path `d`. Built by walking the centreline and offsetting each
 * point along the local normal by a half-width that shrinks toward the centre. `phase`
 * rotates the whole arm, so a second arm at π gives the two-arm swirl. */
function taperedArm(turns: number, rMax: number, wOuter: number, phase: number): string {
	const n = 130;
	const tMax = turns * 2 * Math.PI;
	const at = (i: number): [number, number, number] => {
		const t = (tMax * i) / n;
		const r = rMax * (t / tMax);
		const a = t + phase;
		return [50 + r * Math.cos(a), 50 + r * Math.sin(a), t / tMax];
	};
	const left: string[] = [];
	const right: string[] = [];
	for (let i = 0; i <= n; i++) {
		const [x, y, frac] = at(i);
		const p = at(Math.max(0, i - 1));
		const q = at(Math.min(n, i + 1));
		let tx = q[0] - p[0];
		let ty = q[1] - p[1];
		const len = Math.hypot(tx, ty) || 1;
		tx /= len;
		ty /= len;
		const nx = -ty;
		const ny = tx;
		const w = (wOuter * Math.pow(frac, 0.85)) / 2; // → 0 at the centre, wOuter at the rim
		left.push(`${(x + nx * w).toFixed(2)} ${(y + ny * w).toFixed(2)}`);
		right.push(`${(x - nx * w).toFixed(2)} ${(y - ny * w).toFixed(2)}`);
	}
	return `M${left.join(" L")} L${right.reverse().join(" L")} Z`;
}

function build(): string | undefined {
	try {
		const arms =
			`<path d="${taperedArm(3.1, 44, 15, 0)}" fill="${INK}"/>` +
			`<path d="${taperedArm(3.1, 44, 15, Math.PI)}" fill="${INK}"/>`;
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 100 100">${arms}</svg>`;
		return "data:image/svg+xml," + encodeURIComponent(svg);
	} catch {
		return undefined;
	}
}

/** The spiral as an SVG `data:` URI, built once at load, or `undefined` if it could not be
 * built — callers fall back to a text label so a broken build never leaves a blank button. */
export const SPIRAL_ICON: string | undefined = build();
