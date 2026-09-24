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

// --- Cancel leaves the wizard from any page, applying nothing ---------------------------------
// Driven through the real click routing: every DrawButton is recorded with its rectangle, and a
// click is MouseIn answering true for that one rectangle. So a Cancel that is drawn but not wired,
// or wired to the wrong rectangle, fails here rather than in play.
// Failure looks like: no Cancel on a question page; the wizard still showing after Cancel; any
// ticked answer reaching storage; or a half-answered wizard's ticks surviving into the next run.
{
	let buttons = [];
	let target = null;
	globalThis.DrawButton = (x, y, w, h, label) => buttons.push({ x, y, w, h, label: String(label).replace(/^✓\s+/, "") });
	globalThis.MouseIn = (x, y, w, h) => !!target && target.x === x && target.y === y && target.w === w && target.h === h;
	const draw = () => { buttons = []; wizard.drawWizard(); return buttons.map((b) => b.label); };
	const click = (label) => {
		draw();
		target = buttons.find((b) => b.label === label) ?? null;
		if (!target) throw new Error(`no button "${label}" on this page; saw ${JSON.stringify(buttons.map((b) => b.label))}`);
		wizard.clickWizard();
		target = null;
	};
	const toQuestions = () => click("Answer a few questions instead");
	const nextTimes = (n) => { for (let i = 0; i < n; i++) click("Next"); };
	const QUESTION_COUNT = 5;

	// First run: tick something, then cancel from the first question.
	reset();
	check("cancel: a fresh install shows the wizard", wizard.shouldShowWizard(), true);
	check("cancel: not on the welcome page (Skip is its way out)", draw().includes("Cancel"), false);
	toQuestions();
	check("cancel: offered on the first question", draw().includes("Cancel"), true);
	click("Hold you still, quiet, kneeling; block the wardrobe");
	click("Cancel");
	check("cancel: the wizard closes", wizard.shouldShowWizard(), false);
	check("cancel: first run is marked done, so the settings tabs show", storage.getStarterState(), "done");
	check("cancel: the ticked answer was not applied", on("movementRestriction"), false);
	check("cancel: hypnosis stays off", on("hypnoEnabled"), false);

	// Every question page and the summary offer it.
	reset();
	toQuestions();
	const offered = [];
	for (let i = 0; i < QUESTION_COUNT; i++) { offered.push(draw().includes("Cancel")); click("Next"); }
	offered.push(draw().includes("Apply") && draw().includes("Cancel"));
	check("cancel: on all five questions and the summary", offered, [true, true, true, true, true, true]);
	click("Cancel"); // the wizard's page is module state that reset() does not touch

	// From the summary, one click short of Apply, still nothing is written.
	reset();
	toQuestions();
	click("Undress you, and stop you touching yourself");
	nextTimes(QUESTION_COUNT);
	click("Cancel");
	check("cancel from the summary: nothing applied", [on("undressControl"), on("hypnoEnabled")], [false, false]);
	check("cancel from the summary: the wizard closes", wizard.shouldShowWizard(), false);

	// The cancelled answers do not come back: a later run that ticks nothing applies nothing.
	reset();
	toQuestions();
	click("Set your arousal, force or deny an orgasm");
	click("Cancel");
	reset();
	toQuestions();
	nextTimes(QUESTION_COUNT);
	click("Apply");
	check("cancel: discarded ticks do not resurface in the next run", on("arousalControl"), false);

	// A re-run from the Setup button: cancelling leaves the existing settings exactly as they were.
	reset();
	wizard.applyPreset("light");
	storage.setStarterState("applied");
	const before = JSON.stringify(storage.getFeatures());
	wizard.startWizard();
	toQuestions();
	click("Plant triggers and suggestions that outlive the trance");
	click("Next");
	click("Only deep — hardest to reach, nothing casual");
	click("Cancel");
	check("re-run cancel: permissions unchanged", JSON.stringify(storage.getFeatures()), before);
	check("re-run cancel: no depth override written", storage.getDepthOverride("movementRestriction"), "");
	check("re-run cancel: setup state left alone", storage.getStarterState(), "applied");
	check("re-run cancel: the wizard closes", wizard.shouldShowWizard(), false);

	// Cancel must not sit on top of Back or the forward button.
	reset();
	toQuestions();
	click("Next");
	draw();
	const [cancel, back, next] = ["Cancel", "Back", "Next"].map((l) => buttons.find((b) => b.label === l));
	const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
	check("cancel: clear of Back and Next", [overlaps(cancel, back), overlaps(cancel, next)], [false, false]);
}

console.log(`wizard: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
