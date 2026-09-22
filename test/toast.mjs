// The "loaded" note fades out (v0.82.3).
//
// It used to be a permanent watermark in the bottom-right corner for the whole session. Now it is
// shown at load, fades, and removes itself. Timers are driven by hand so "it goes away" is a
// fact the suite observes rather than waits for.
// Failure looks like: the element still attached after both timers have run (the watermark is
// back), no timer scheduled at all, or the version typed in rather than read from the build.
import { readFileSync } from "node:fs";

const attached = [];
const makeEl = () => ({
	style: {},
	textContent: "",
	remove() { const i = attached.indexOf(this); if (i >= 0) attached.splice(i, 1); },
});
globalThis.document = { body: { appendChild(el) { attached.push(el); } }, createElement: makeEl };
const timers = [];
const realSetTimeout = globalThis.setTimeout;
globalThis.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { welcome } = await import("./harness-bundle.mjs");
timers.length = 0;

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

welcome.showLoadedToast();
const el = attached[0];
check("the toast appears at load", attached.length, 1);
check("  saying the build it is", el?.textContent, "ECHS vtest loaded");
check("  never in the way of a click", el?.style.pointerEvents, "none");
check("  fully visible to start with", el?.style.opacity, "1");
check("one timer scheduled for the fade", timers.length, 1);
check("  after the hold", timers[0]?.ms, welcome.LOADED_TOAST_HOLD_MS);

timers.shift().fn();
check("the fade starts: opacity drops to 0", el?.style.opacity, "0");
check("  still attached while it fades", attached.length, 1);
check("a removal is scheduled on a plain timer, not only on transitionend", timers.length, 1);
check("  once the fade has had time to finish", timers[0]?.ms > welcome.LOADED_TOAST_FADE_MS, true);

timers.shift().fn();
check("then the toast is gone from the page", attached.length, 0);
check("the whole thing is over in under ten seconds",
	welcome.LOADED_TOAST_HOLD_MS + welcome.LOADED_TOAST_FADE_MS + 100 < 10_000, true);

// No page body (an unexpected document state) must not throw into startup.
globalThis.document = { body: null, createElement: makeEl };
let threw = false;
try { welcome.showLoadedToast(); } catch { threw = true; }
check("no body: does nothing rather than throw", threw, false);

// main.ts must not bring back a persistent element of its own.
const main = readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
check("main.ts appends nothing to the page itself", /appendChild\(/.test(main), false);
check("  and shows the toast at startup", /showLoadedToast\b/.test(main), true);

globalThis.setTimeout = realSetTimeout;
console.log(`toast: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
