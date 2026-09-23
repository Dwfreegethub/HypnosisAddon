// The trance veil stays on the room (v0.82.3).
//
// It used to be painted after DrawProcess — BC's whole per-frame draw — across the full canvas,
// so the white wash lay over every menu, the settings screens, the wardrobe and BC's own
// dialogs. It now paints after ChatRoomRun, over the character half only. What this suite can
// and cannot prove: the rect and the "nothing at zero" rule are driven for real against a
// recording canvas; which BC function the hook sits on is read off main.ts's source, the same
// way test/banner.mjs checks the settings title, because main.ts runs its hooks at import and
// cannot be loaded here. Whether BC draws a character dialog inside ChatRoomRun is not
// something any suite here can settle — that needs a live client.
import { readFileSync } from "node:fs";

let rects = [];
globalThis.MainCanvasWidth = 2000;
globalThis.MainCanvasHeight = 1000;
globalThis.MainCanvas = {
	fillStyle: "",
	save() {},
	restore() {},
	fillRect(x, y, w, h) { rects.push({ x, y, w, h, style: this.fillStyle }); },
};
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { effects } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- no trance, no paint ------------------------------------------------------------------
// Failure looks like: one rect here, a faint white box on every awake player's screen.
effects.clearTranceStates();
rects = [];
effects.drawTranceVeil();
check("nothing painted with the fade at zero", rects.length, 0);

// --- under: the character half, and only that ---------------------------------------------
// Failure looks like: w 2000, the old full-canvas wash over the menu bar and any dialog.
effects.setScreenFade(effects.TRANCE_FADE_OPACITY);
rects = [];
effects.drawTranceVeil();
check("one rect painted while under", rects.length, 1);
check("  from the left edge", [rects[0]?.x, rects[0]?.y], [0, 0]);
check("  as wide as the character half, not the canvas", rects[0]?.w, 1003);
check("  and never reaching the right half", (rects[0]?.x ?? 0) + (rects[0]?.w ?? 0) <= 1003, true);
check("  full height", rects[0]?.h, 1000);
check("  at the trance opacity", rects[0]?.style, "rgba(255, 255, 255, 0.3)");

// Walking trance thins the same veil; it must use the same rect.
effects.setScreenFade(effects.WALKING_FADE_OPACITY);
rects = [];
effects.drawTranceVeil();
check("walking veil uses the same rect", rects[0]?.w, 1003);
check("  at the thin opacity", rects[0]?.style, "rgba(255, 255, 255, 0.08)");

effects.clearTranceStates();
rects = [];
effects.drawTranceVeil();
check("waking clears it", rects.length, 0);

// --- where main.ts hooks it ---------------------------------------------------------------
// Failure looks like: the veil still riding DrawProcess (every screen), or sitting above the
// induction prompt's box so the Agree / Ignore / Fight buttons are washed out.
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const prompt = readFileSync(new URL("../src/prompt.ts", import.meta.url), "utf8");
check("main.ts no longer hooks DrawProcess", /hookFunction\(\s*"DrawProcess"/.test(main), false);
check("main.ts never fills the whole canvas", /fillRect\(\s*0\s*,\s*0\s*,\s*MainCanvasWidth/.test(main), false);
const veilHook = main.match(/hookFunction\(\s*"(\w+)"\s*,\s*(\d+)\s*,[\s\S]{0,200}?drawTranceVeil\(\)/);
check("the veil is drawn from a ChatRoomRun hook", veilHook?.[1], "ChatRoomRun");
const promptHook = prompt.match(/hookFunction\(\s*"ChatRoomRun"\s*,\s*(\d+)/);
check("  at a lower priority than the prompt box, so the box paints on top",
	Number(veilHook?.[2]) < Number(promptHook?.[1]), true);

console.log(`veil: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
