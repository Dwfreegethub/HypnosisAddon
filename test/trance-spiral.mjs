// The trance spiral (v1.9.0; JAX 2026-11-02, DW 2026-11-08) and the screen effect choice (v1.9.1).
//
// Her choice, off by default. One "Screen effect" choice: None, the grey fade, or the spiral at
// light, medium or heavy. The spiral turns slowly in her pulse colour where the grey veil was, and a
// landed command flashes it instead of the edge glow. Driven for real against a recording canvas;
// the main.ts and menu wiring is read off their source, as test/veil.mjs does.
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
const { light: LIGHT, medium: MEDIUM, heavy: HEAVY } = effects.SPIRAL_ALPHAS;
const frame = (opts) => { calls = []; return effects.drawTranceVeil(opts); };
const named = (n) => calls.filter((c) => c.name === n);
const lastAlpha = () => named("alpha").at(-1)?.args[0];
const spiralAt = (strength, now) => { frame({ spiral: strength, rgb: PINK, now }); return lastAlpha(); };

// --- the choice: None, the grey fade, three spirals -------------------------------------------
// Failure looks like: a moving picture over the screen for someone who never asked for one.
check("the grey fade by default", storage.getScreenEffect(), "fade");
check("  so no spiral strength", storage.getSpiralStrength(), "");
check("five choices, in order", storage.SCREEN_EFFECTS.map((e) => e.key), ["none", "fade", "light", "medium", "heavy"]);
storage.setScreenEffect("medium");
check("choosing a spiral keeps the fade on underneath", [storage.getScreenEffect(), storage.getFeatures().tranceScreenFade, storage.getSpiralStrength()], ["medium", true, "medium"]);
storage.setScreenEffect("none");
check("None turns the fade off", [storage.getScreenEffect(), storage.getFeatures().tranceScreenFade, storage.getSpiralStrength()], ["none", false, ""]);
storage.setScreenEffect("heavy");
check("  and a spiral from None turns it back on", [storage.getScreenEffect(), storage.getFeatures().tranceScreenFade], ["heavy", true]);
storage.setScreenEffect("fade");
check("the grey fade drops the spiral", [storage.getScreenEffect(), storage.getSpiralStrength()], ["fade", ""]);
storage.setScreenEffect("rainbow");
check("a bad choice changes nothing", storage.getScreenEffect(), "fade");
// DW: v1.9.0's strength was "a little too dark". Failure: light no lighter than v1.9.0's 0.36.
check("strengths rise light to heavy", LIGHT < MEDIUM && MEDIUM < HEAVY, true);
check("  and light is well under v1.9.0's 0.36", LIGHT <= 0.2, true);

// v1.9.0 (dev only) saved a tick box. Failure: someone who ticked it loses the spiral on upgrade.
{
	const lz = (await import("lz-string")).default;
	const old = JSON.parse(lz.decompressFromBase64(storage.exportSettings()));
	delete old.spiralStrength;
	old.features.tranceSpiral = true;
	old.features.tranceScreenFade = true;
	storage.importSettings(lz.compressToBase64(JSON.stringify(old)));
	check("v1.9.0's ticked spiral becomes Medium", storage.getScreenEffect(), "medium");
	check("  and the old key is not kept", "tranceSpiral" in storage.getFeatures(), false);
	old.features.tranceSpiral = false;
	storage.importSettings(lz.compressToBase64(JSON.stringify(old)));
	check("  unticked stays the grey fade", storage.getScreenEffect(), "fade");
	old.spiralStrength = "blinding";
	storage.importSettings(lz.compressToBase64(JSON.stringify(old)));
	check("  a junk strength is dropped", storage.getScreenEffect(), "fade");
}

// --- no spiral: the grey veil, exactly as before -----------------------------------------------
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);
check("no spiral: reports none", frame({ spiral: 0, rgb: PINK, now: 0 }), false);
check("  the white veil is painted", named("fillRect").map((c) => c.style), ["rgba(255, 255, 255, 0.3)"]);
check("  and no image", named("drawImage").length, 0);

// --- a spiral: instead of the grey ------------------------------------------------------------
check("a spiral: reports it", frame({ spiral: MEDIUM, rgb: PINK, now: 0 }), true);
// Failure: the grey still under it (DW: "you would not see the slightly gray out screen").
check("  no grey veil", named("fillRect").length, 0);
check("  one spiral drawn", named("drawImage").length, 1);
check("  clipped to the room half, never the chat", named("rect")[0]?.args, [0, 0, effects.VEIL_WIDTH, 1000]);
check("  about the room's centre", named("translate")[0]?.args, [effects.VEIL_WIDTH / 2, 500]);
const img = named("drawImage")[0]?.args;
check("  big enough to reach every corner", img && img[3] / 2 >= Math.hypot(effects.VEIL_WIDTH / 2, 500), true);
check("  balanced save/restore, so nothing leaks into BC's drawing", named("save").length === named("restore").length, true);
check("  drawn in her pulse colour", strokeStyle, `rgb(${PINK})`);
check("  as real bands (many strokes)", strokes > 300, true);
near("light at its strength", spiralAt(LIGHT, 0), LIGHT);
near("medium at its strength", spiralAt(MEDIUM, 0), MEDIUM);
near("heavy at its strength", spiralAt(HEAVY, 0), HEAVY);
// Walking trance thins it in proportion, as it thins the veil.
effects.setScreenFade(effects.WALKING_FADE_OPACITY);
near("walking trance: thinner, in proportion", spiralAt(MEDIUM, 0), MEDIUM * (effects.WALKING_FADE_OPACITY / effects.TRANCE_FADE_OPACITY));
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);

// --- it turns, slowly ------------------------------------------------------------------------
frame({ spiral: MEDIUM, rgb: PINK, now: 0 });
const a0 = named("rotate")[0]?.args[0];
frame({ spiral: MEDIUM, rgb: PINK, now: effects.SPIRAL_TURN_MS / 4 });
const a1 = named("rotate")[0]?.args[0];
near("a quarter turn in a quarter of the turn time", a1 - a0, Math.PI / 2);
// Failure: a spin fast enough to be uncomfortable to watch.
check("  no faster than a turn every 8 seconds", effects.SPIRAL_TURN_MS >= 8000, true);

// --- built once per colour, not every frame ----------------------------------------------------
const before = built;
for (let i = 0; i < 30; i++) frame({ spiral: MEDIUM, rgb: PINK, now: i * 16 });
check("thirty frames build nothing new", built, before);
frame({ spiral: MEDIUM, rgb: "80, 160, 255", now: 0 });
check("a new colour builds once", [built - before, strokeStyle], [1, "rgb(80, 160, 255)"]);
frame({ spiral: MEDIUM, rgb: PINK, now: 0 });

// --- a landed command flashes the spiral, and the edge glow stays off ---------------------------
// DW (v1.9.1): "more sudden... more of a flash and less of a fade in and out".
const t0 = 100_000;
const RISE = effects.SPIRAL_FLASH_RISE_MS, FALL = effects.SPIRAL_FLASH_FALL_MS, BOOST = effects.SPIRAL_FLASH_BOOST;
effects.startCommandPulse(PINK, t0);
near("at the flash's peak it is brighter", spiralAt(MEDIUM, t0 + RISE), MEDIUM + BOOST);
// Failure: back to a slow swell. It must be up almost at once and gone in about half a second.
check("  it is up within a tenth of a second", RISE <= 100, true);
check("  and gone within about half a second", RISE + FALL <= 600, true);
check("  most of the way up at half the rise", spiralAt(MEDIUM, t0 + RISE / 2) >= MEDIUM + BOOST / 2 - 1e-9, true);
check("  falls fastest first: under a third left at a third of the fall", spiralAt(MEDIUM, t0 + RISE + FALL / 3) - MEDIUM < BOOST / 2, true);
near("  back to its strength once the flash is over", spiralAt(MEDIUM, t0 + RISE + FALL), MEDIUM);
// The flash peak is a real change on every strength: noticeable, never blinding.
check("  heavy's flash stays see-through", HEAVY + BOOST < 0.8, true);
// A second command re-flashes, even while the glow's own 1.8 s pulse is still running.
effects.startCommandPulse(PINK, t0 + 700);
near("a second command flashes again", spiralAt(MEDIUM, t0 + 700 + RISE), MEDIUM + BOOST);
calls = [];
effects.drawCommandPulse(t0 + 900, true);
// Failure: both at once, the glow at the edge and the spiral flashing.
check("with the spiral showing, no edge glow or wash", named("fillRect").length, 0);
calls = [];
effects.drawCommandPulse(t0 + 900, false);
check("  without it, the edge glow as before", named("fillRect").length > 0, true);
effects.drawCommandPulse(t0 + 5000, false);

// --- blind: nothing, as for the veil ----------------------------------------------------------
dark = 0.15;
check("while BC darkens her screen: no spiral", [frame({ spiral: MEDIUM, rgb: PINK, now: 0 }), calls.length], [false, 0]);
dark = 1;

// --- awake: nothing -------------------------------------------------------------------------
effects.clearTranceStates();
check("awake: nothing at all", [frame({ spiral: MEDIUM, rgb: PINK, now: 0 }), calls.length], [false, 0]);

// --- no canvas to build on: the plain fade -----------------------------------------------------
effects.resetSpiralForTests();
const doc = globalThis.document;
delete globalThis.document;
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);
check("no canvas: reports no spiral", frame({ spiral: MEDIUM, rgb: PINK, now: 0 }), false);
check("  and falls back to the grey veil rather than nothing", named("fillRect").map((c) => c.style), ["rgba(255, 255, 255, 0.3)"]);
globalThis.document = doc;
effects.clearTranceStates();

// --- the wiring in main.ts and the menu --------------------------------------------------------
// Failure: main.ts never passes her strength, or the pulse is not told the spiral drew.
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
check("main.ts passes her strength and colour", /drawTranceVeil\(\{\s*spiral:\s*SPIRAL_ALPHAS\[getSpiralStrength\(\)\] \?\? 0,\s*rgb:\s*getPulseRgb\(\)/.test(main), true);
check("  and tells the pulse whether the spiral drew", /const spiral = drawTranceVeil\([\s\S]{0,120}drawCommandPulse\(now, spiral\)/.test(main), true);
const menu = readFileSync(new URL("../src/menu.ts", import.meta.url), "utf8");
// DW: "instead of a check box we can have a selector box". Failure: either tick box is still there.
check("the menu has no Screen Fade tick box", /key: "tranceScreenFade"/.test(menu), false);
check("  nor v1.9.0's spiral tick box", /key: "tranceSpiral"/.test(menu), false);
check("  but a dropdown of the five", /ElementCreateDropdown\(\s*SCREEN_EFFECT_ID,\s*SCREEN_EFFECTS\.map/.test(menu), true);
check("  removed off its tab and on every exit", (menu.match(/SCREEN_EFFECT_ID/g) ?? []).length >= 6 && /removeScreenEffectControl\(\);\s*\}/.test(menu), true);
check("  None takes the fade off at once", /now === "none" && was !== "none"\) onToggle\("tranceScreenFade", false\)/.test(menu), true);

console.log(`trance-spiral: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
