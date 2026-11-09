// The trance spiral (v1.9.0; JAX 2026-11-02, DW 2026-11-08).
//
// Her choice, off by default. While the fade is on, a slowly turning spiral in her pulse colour
// takes the grey veil's place, and a landed command swells the spiral instead of the edge glow.
// Driven for real against a recording canvas; the main.ts wiring is read off its source, as
// test/veil.mjs does, because main.ts runs its hooks at import.
import { readFileSync } from "node:fs";

let calls = [];
const record = (name) => (...args) => calls.push({ name, args });
globalThis.MainCanvasWidth = 2000;
globalThis.MainCanvasHeight = 1000;
globalThis.MainCanvas = {
	fillStyle: "",
	_alpha: 1,
	get globalAlpha() { return this._alpha; },
	set globalAlpha(v) { this._alpha = v; calls.push({ name: "alpha", args: [v] }); },
	save: record("save"),
	restore: record("restore"),
	beginPath: record("beginPath"),
	rect: record("rect"),
	clip: record("clip"),
	translate: record("translate"),
	rotate: record("rotate"),
	drawImage: record("drawImage"),
	fillRect(x, y, w, h) { calls.push({ name: "fillRect", args: [x, y, w, h], style: this.fillStyle }); },
};
let built = 0;
let strokes = 0;
let strokeStyle = "";
const makeCanvas = () => {
	built++;
	const ctx = {
		set strokeStyle(v) { strokeStyle = v; },
		get strokeStyle() { return strokeStyle; },
		lineCap: "", lineWidth: 0,
		beginPath() {}, moveTo() {}, lineTo() {}, stroke() { strokes++; },
	};
	return { width: 0, height: 0, getContext: () => ctx };
};
globalThis.document = { createElement: (tag) => (tag === "canvas" ? makeCanvas() : {}) };
let dark = 1;
globalThis.CharacterGetDarkFactor = () => dark;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { effects, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const near = (label, got, want) => {
	const ok = typeof got === "number" && Math.abs(got - want) < 1e-6;
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}: want ${want}, got ${got}`);
};
const PINK = "255, 105, 180";
const frame = (opts) => { calls = []; return effects.drawTranceVeil(opts); };
const named = (n) => calls.filter((c) => c.name === n);
const lastAlpha = () => named("alpha").at(-1)?.args[0];

// --- off by default --------------------------------------------------------------------------
// Failure looks like: a moving picture over the screen for someone who never asked for one.
check("off by default", storage.getFeatures().tranceSpiral, false);

// --- spiral off: the grey veil, exactly as before ---------------------------------------------
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);
check("spiral off: reports no spiral", frame({ spiral: false, rgb: PINK, now: 0 }), false);
check("  the white veil is painted", named("fillRect").map((c) => c.style), ["rgba(255, 255, 255, 0.3)"]);
check("  and no image", named("drawImage").length, 0);

// --- spiral on: the spiral instead of the grey -------------------------------------------------
check("spiral on: reports the spiral", frame({ spiral: true, rgb: PINK, now: 0 }), true);
// Failure: the grey still under it (DW: "you would not see the slightly gray out screen").
check("  no grey veil", named("fillRect").length, 0);
check("  one spiral drawn", named("drawImage").length, 1);
check("  clipped to the room half, never the chat", named("rect")[0]?.args, [0, 0, effects.VEIL_WIDTH, 1000]);
check("  about the room's centre", named("translate")[0]?.args, [effects.VEIL_WIDTH / 2, 500]);
const img = named("drawImage")[0]?.args;
check("  big enough to reach every corner", img && img[3] / 2 >= Math.hypot(effects.VEIL_WIDTH / 2, 500), true);
near("  at the trance strength", lastAlpha(), 0.3 * effects.SPIRAL_ALPHA_PER_FADE);
check("  balanced save/restore, so nothing leaks into BC's drawing", named("save").length === named("restore").length, true);
check("  drawn in her pulse colour", strokeStyle, `rgb(${PINK})`);
check("  as real bands (many strokes)", strokes > 300, true);

// Walking trance thins it, as it thins the veil.
effects.setScreenFade(effects.WALKING_FADE_OPACITY);
frame({ spiral: true, rgb: PINK, now: 0 });
near("walking trance: thinner", lastAlpha(), 0.08 * effects.SPIRAL_ALPHA_PER_FADE);
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);

// --- it turns, slowly ------------------------------------------------------------------------
frame({ spiral: true, rgb: PINK, now: 0 });
const a0 = named("rotate")[0]?.args[0];
frame({ spiral: true, rgb: PINK, now: effects.SPIRAL_TURN_MS / 4 });
const a1 = named("rotate")[0]?.args[0];
near("a quarter turn in a quarter of the turn time", a1 - a0, Math.PI / 2);
// Failure: a spin fast enough to be uncomfortable to watch.
check("  no faster than a turn every 8 seconds", effects.SPIRAL_TURN_MS >= 8000, true);

// --- built once per colour, not every frame ----------------------------------------------------
const before = built;
for (let i = 0; i < 30; i++) frame({ spiral: true, rgb: PINK, now: i * 16 });
check("thirty frames build nothing new", built, before);
frame({ spiral: true, rgb: "80, 160, 255", now: 0 });
check("a new colour builds once", [built - before, strokeStyle], [1, "rgb(80, 160, 255)"]);
frame({ spiral: true, rgb: PINK, now: 0 });

// --- a landed command swells the spiral, and the edge glow stays off ---------------------------
const t0 = 100_000;
effects.startCommandPulse(PINK, t0);
frame({ spiral: true, rgb: PINK, now: t0 + 900 }); // the peak of the 1.8 s swell
near("at the pulse's peak it is brighter", lastAlpha(), 0.3 * effects.SPIRAL_ALPHA_PER_FADE + effects.SPIRAL_PULSE_BOOST);
frame({ spiral: true, rgb: PINK, now: t0 + 50 });
check("  it swells, never flashes", lastAlpha() < 0.3 * effects.SPIRAL_ALPHA_PER_FADE + effects.SPIRAL_PULSE_BOOST / 2, true);
calls = [];
effects.drawCommandPulse(t0 + 900, true);
// Failure: both at once, the glow at the edge and the spiral swelling.
check("  with the spiral showing, no edge glow or wash", named("fillRect").length, 0);
calls = [];
effects.drawCommandPulse(t0 + 900, false);
check("  without it, the edge glow as before", named("fillRect").length > 0, true);
calls = [];
effects.drawCommandPulse(t0 + 2000, true);
frame({ spiral: true, rgb: PINK, now: t0 + 2000 });
near("  and after it, back to the trance strength", lastAlpha(), 0.3 * effects.SPIRAL_ALPHA_PER_FADE);

// --- blind: nothing, as for the veil ----------------------------------------------------------
dark = 0.15;
check("while BC darkens her screen: no spiral", [frame({ spiral: true, rgb: PINK, now: 0 }), calls.length], [false, 0]);
dark = 1;

// --- awake: nothing -------------------------------------------------------------------------
effects.clearTranceStates();
check("awake: nothing at all", [frame({ spiral: true, rgb: PINK, now: 0 }), calls.length], [false, 0]);

// --- no canvas to build on: the plain fade, said once ------------------------------------------
effects.resetSpiralForTests();
const doc = globalThis.document;
delete globalThis.document;
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);
check("no canvas: reports no spiral", frame({ spiral: true, rgb: PINK, now: 0 }), false);
check("  and falls back to the grey veil rather than nothing", named("fillRect").map((c) => c.style), ["rgba(255, 255, 255, 0.3)"]);
globalThis.document = doc;
effects.clearTranceStates();

// --- the wiring in main.ts and the menu --------------------------------------------------------
// Failure: main.ts never passes her setting, or the pulse is not told the spiral drew.
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
check("main.ts passes her setting and colour", /drawTranceVeil\(\{\s*spiral:\s*getFeatures\(\)\.tranceSpiral === true,\s*rgb:\s*getPulseRgb\(\)/.test(main), true);
check("  and tells the pulse whether the spiral drew", /const spiral = drawTranceVeil\([\s\S]{0,120}drawCommandPulse\(now, spiral\)/.test(main), true);
const menu = readFileSync(new URL("../src/menu.ts", import.meta.url), "utf8");
check("the menu has the tick box", /key: "tranceSpiral", label: "Screen Fade as a turning spiral"/.test(menu), true);
check("  and says so when it would show nothing", /case "tranceSpiral":[\s\S]{0,300}tranceScreenFade\) tellPlayer\(/.test(menu), true);

console.log(`trance-spiral: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
