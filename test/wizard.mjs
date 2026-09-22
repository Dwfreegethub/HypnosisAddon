// The setup wizard's apply core (wizard.ts). The screen drawing is canvas and untested; what
// MUST be right is what each preset and each answer set actually writes to storage — the
// features, the depth tiers, the chemical scope, the skill rung, the decay rate. All of that is
// storage, so it is driven here with no canvas.
//
// The properties that matter most are the safety ones: Hypnotist-only turns the subject side
// fully off; Balanced never enables anything that outlives the session; only Extreme opens the
// earned-only features to arousal.
globalThis.Player = { MemberNumber: 1, ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { wizard, storage, depth } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const on = (k) => storage.getFeatures()[k] === true;
const anyEarnedOnlyOn = () => ["illusionControl", "triggerControl", "carryForward"].some(on);
const reset = () => storage.resetSettings();

// --- the four presets exist and are named -------------------------------------------------
check("four presets", wizard.PRESETS.map((p) => p.key), ["hypnotist", "light", "balanced", "extreme"]);
check("an unknown preset is refused", wizard.applyPreset("nope"), false);

// --- Hypnotist only: the subject side is entirely off -------------------------------------
reset();
check("hypnotist-only applies", wizard.applyPreset("hypnotist"), true);
check("  hypnosis is OFF", on("hypnoEnabled"), false);
check("  nothing else is on either", ["movementRestriction", "arousalControl", "illusionControl", "triggerControl"].some(on), false);
check("  and setup is marked done", storage.getStarterState(), "done");

// --- Light: exactly the five session basics -----------------------------------------------
reset();
wizard.applyPreset("light");
check("light turns hypnosis on", on("hypnoEnabled"), true);
check("  the four session basics on", ["movementRestriction", "speechRestriction", "postureControl", "clothingRestriction"].every(on), true);
check("  nothing intimate or lasting", ["undressControl", "arousalControl", "illusionControl", "triggerControl", "carryForward"].some(on), false);
check("  depths at their defaults (no overrides)", storage.getDepthOverride("triggerControl"), "");
check("  skill honoured from trusted people", storage.getSkillHonour(), "trusted");
check("  triggers do not fade", storage.getTriggerDecayRate(), "never");

// --- Balanced: session things, but NOTHING that outlives the session ----------------------
reset();
wizard.applyPreset("balanced");
check("balanced adds undressing and arousal", ["undressControl", "selfTouchControl", "arousalControl"].every(on), true);
check("  and the awareness suppressors", ["suppressClothing", "suppressBondage", "suppressActivities"].every(on), true);
check("  but NOT the illusion", on("illusionControl"), false);
check("  and NOTHING persistent", anyEarnedOnlyOn(), false);
check("  arousal may reach nothing earned-only", [storage.getChemicalReach("illusionControl"), storage.getChemicalReach("triggerControl")], [false, false]);

// --- Extreme: everything on, easiest access, arousal opened to the earned-only ------------
reset();
wizard.applyPreset("extreme");
check("extreme turns everything on", ["illusionControl", "triggerControl", "carryForward", "arousalControl", "undressControl"].every(on), true);
check("  easiest access — every gate at Drifting", storage.getDepthOverride("triggerControl"), "drifting");
check("  arousal opened to the illusion and triggers", [storage.getChemicalReach("illusionControl"), storage.getChemicalReach("triggerControl")], [true, true]);
check("  skill honoured up to the cap (rung 4 waits on fatigue)", storage.getSkillHonour(), "capped");

// --- a wizard config built by hand behaves the same as applySetup -------------------------
reset();
wizard.applySetup({
	features: ["movementRestriction", "speechRestriction", "arousalControl"],
	access: "deep",
	arousalShortcut: false,
	honour: "ignore",
	triggersFade: true,
});
check("custom: chosen features on", ["movementRestriction", "speechRestriction", "arousalControl"].every(on), true);
check("  unchosen off", on("undressControl"), false);
check("  hypnosis implied by any choice", on("hypnoEnabled"), true);
check("  'deep' raised every gate", storage.getDepthOverride("movementRestriction"), "deep");
check("  arousal shortcut off -> chemical scope neither", storage.getChemicalScope(), "neither");
check("  skill ignored", storage.getSkillHonour(), "ignore");
check("  triggers fade -> typical", storage.getTriggerDecayRate(), "typical");

// --- a config with NO features leaves hypnosis off ----------------------------------------
reset();
wizard.applySetup({ features: [], access: "earned", arousalShortcut: true, honour: "trusted", triggersFade: false });
check("no features -> hypnosis stays off", on("hypnoEnabled"), false);

// --- the preset blurbs are readable in full (v0.82.3) ----------------------------------------
// They used to go through drawLeftTextFit, which shrinks to 22px and then clips with "…". Balanced
// and Extreme measure 1404 and 1332px at 22px in Arial (measured in Chromium against Liberation
// Sans, which is metric-compatible) against a 1000px column, so their endings were never on screen
// for anyone; in a monospace font all four were cut. The canvas is modelled with a per-character
// width — 0.46em is Arial-like, 0.6em is monospace — and every fillText is recorded.
// Failure looks like: a line ending in "…", or a blurb whose words do not all reach the screen.
{
	let drawn = [];
	let em = 0.46;
	const sizeOf = (font) => Number(/(\d+)px/.exec(font)?.[1] ?? 10);
	globalThis.MainCanvasWidth = 2000;
	globalThis.MainCanvas = {
		font: "10px arial", textAlign: "left", textBaseline: "alphabetic", fillStyle: "",
		save() {}, restore() {},
		measureText(t) { return { width: t.length * sizeOf(this.font) * em }; },
		fillText(t, x, y) { drawn.push({ t, x, y, size: sizeOf(this.font) }); },
	};
	for (const fn of ["DrawText", "DrawRect", "DrawEmptyRect", "DrawButton"]) globalThis[fn] = () => {};

	for (const [label, width] of [["Arial-like", 0.46], ["monospace", 0.6]]) {
		em = width;
		drawn = [];
		wizard.startWizard();
		wizard.drawWizard();
		const text = drawn.map((d) => d.t).join(" ");
		check(`${label}: no blurb line is clipped`, drawn.filter((d) => d.t.endsWith("…")).map((d) => d.t), []);
		for (const p of wizard.PRESETS) {
			const words = p.blurb.split(/\s+/);
			check(`${label}: every word of "${p.name}" is drawn`, words.filter((w) => !text.includes(w)), []);
		}
		// Each blurb's lines stay inside its own 90px row, so neighbours never overlap.
		const blurbLines = drawn.filter((d) => d.x > 400);
		const rows = wizard.PRESETS.map((_, i) => blurbLines.filter((d) => Math.floor((d.y - blurbLines[0].y + 45) / 90) === i));
		check(`${label}: no blurb spills into the next row`, rows.every((r) => r.length && Math.max(...r.map((d) => d.y)) - Math.min(...r.map((d) => d.y)) + r[0].size < 90), true);
		check(`${label}: still readable, not shrunk below the floor`, Math.min(...blurbLines.map((d) => d.size)) >= 18, true);
	}
}

console.log(`wizard: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
