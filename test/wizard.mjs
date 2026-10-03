// The setup wizard (wizard.ts), v0.99.0 overhaul — job2.md.
//
// What MUST be right is what each template and each answer writes to storage, and that Cancel
// writes nothing. All of that is storage, so it is driven here with no real canvas; the click
// routing is driven through recorded DrawButton rectangles, so a button drawn but not wired fails.
//
// The safety properties first: Hypnotist only leaves the subject side off; Light never silences;
// only Extreme opens the earned-only features to arousal; Extreme's lock starts ONLY on confirming
// its warning; and nobody who chose the old Extreme before v0.99.0 is locked by upgrading.
globalThis.Player = { MemberNumber: 1, ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomSendLocal = () => {};

const { wizard, storage, extreme, depth } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const on = (k) => storage.getFeatures()[k] === true;
const onList = (keys) => keys.filter(on);
const reset = () => storage.resetSettings();
const ALL_GRANTS = [
	"movementRestriction", "clothingRestriction", "postureControl", "followControl", "speechRestriction",
	"selfTouchControl", "compelActivity", "compelTouchOthers", "forcedSpeech", "hearingControl", "sightControl",
	"arousalControl", "illusionControl", "undressControl", "triggerControl", "carryForward",
	"suppressClothing", "suppressBondage", "suppressActivities", "lockedWhileHypnotized",
];
const DAY = 86_400_000;

// --- the four templates ----------------------------------------------------------------------
check("four templates", wizard.PRESETS.map((p) => p.key), ["hypnotist", "light", "balanced", "extreme"]);
check("an unknown template is refused", wizard.applyPreset("nope"), false);

// Hypnotist only (job2.md §2A, §5): hypnosis OFF, every grant off, auto-answer Fight.
reset();
check("hypnotist: applies", wizard.applyPreset("hypnotist"), true);
check("  hypnosis is OFF", on("hypnoEnabled"), false);
check("  every grant off", onList(ALL_GRANTS), []);
check("  auto-answer Fight", storage.getDefaultStance(), "fight");
check("  setup marked done", storage.getStarterState(), "done");
check("  no lock", storage.getExtremeLock(), null);

// Light / safe: posture and movement only; a trance never silences.
reset();
wizard.applyPreset("light");
check("light: hypnosis on", on("hypnoEnabled"), true);
check("  exactly movement and posture", onList(ALL_GRANTS), ["movementRestriction", "postureControl"]);
check("  wardrobe lock dropped (DW)", on("clothingRestriction"), false);
check("  Cannot Speak trance default OFF", on("tranceCannotSpeak"), false);
check("  Screen Fade ON, Cannot Move ON", [on("tranceScreenFade"), on("tranceCannotMove")], [true, true]);
check("  asked first", storage.getDefaultStance(), "prompt");
check("  sink deeper stops at Yielding", storage.getDeepestTier(), "yielding");
check("  depths at their defaults", storage.getDepthOverride("movementRestriction"), undefined);
check("  toy mode off", storage.getToyMode(), false);

// Balanced.
reset();
wizard.applyPreset("balanced");
check(
	"balanced: the listed grants, triggers included",
	onList(ALL_GRANTS),
	["movementRestriction", "clothingRestriction", "postureControl", "speechRestriction", "selfTouchControl", "arousalControl", "undressControl", "triggerControl"],
);
check("  NOT touch others, made to speak, sight, hearing, carry-forward, illusion",
	onList(["compelTouchOthers", "forcedSpeech", "sightControl", "hearingControl", "carryForward", "illusionControl"]), []);
check("  trance can silence (factory default)", on("tranceCannotSpeak"), true);
check("  sink deeper stops at Entranced", storage.getDeepestTier(), "entranced");
check("  triggers from owner, lovers and whitelist", storage.getTriggerScope(), "whitelist");
check("  no lifespan cap (DW, §5.1)", storage.getTriggerLifespan(), 0);
check("  drop triggers off", storage.getDropMode(), "off");
check("  trigger fade at its default", storage.getTriggerDecayRate(), "never");
check("  arousal reaches nothing earned-only", [storage.getChemicalReach("illusionControl"), storage.getChemicalReach("triggerControl")], [false, false]);

// Extreme's settings (applyPreset only — the lock is confirmExtreme's).
reset();
wizard.applyPreset("extreme");
check("extreme: every grant on", onList(ALL_GRANTS), ALL_GRANTS);
check("  every depth gate at 20 (DW)", depth.DEPTH_GATES.every((g) => storage.getDepthOverride(g.key) === 20), true);
check("  sink deeper stops at Blank", storage.getDeepestTier(), "blank");
check("  arousal opened to the illusion and triggers", [storage.getChemicalReach("illusionControl"), storage.getChemicalReach("triggerControl")], [true, true]);
check("  agrees without asking", storage.getDefaultStance(), "agree");
check("  toy mode on, for owner, lovers and whitelist", [storage.getToyMode(), storage.getToyScope()], [true, "whitelist"]);
check("  drop triggers unlimited", storage.getDropMode(), "unlimited");
check("  away: keep my answer", storage.getAwayStance(), "keep");
check("  triggers from everyone but the blacklist", storage.getTriggerScope(), "notblack");
check("  triggers fade very slowly (DW, deliberate)", storage.getTriggerDecayRate(), "veryslow");
check("  Clothes Look Unchanged stays OFF", on("tranceClothingFreeze"), false);
check("  Silence OOC stays OFF", on("blockOOC"), false);
check("  applying the settings alone starts NO lock", storage.getExtremeLock(), null);

// Confirming the warning: the settings AND the first-week lock.
reset();
const t0 = Date.UTC(2026, 9, 2, 12);
wizard.confirmExtreme(t0);
const lock = storage.getExtremeLock();
check("confirm: settings applied", on("compelTouchOthers"), true);
check("confirm: a 7-day trial lock", [lock?.stage, lock && (lock.until - t0) / DAY], ["trial", 7]);
check("confirm: the settings are locked", extreme.extremeLocked(), true);

// A template replaces what the last one set: Light after Extreme leaves nothing of Extreme behind.
storage.clearExtremeLock();
wizard.applyPreset("light");
check("light after extreme: depth overrides cleared", storage.getDepthOverride("triggerControl"), undefined);
check("  arousal reach closed", storage.getChemicalReach("triggerControl"), false);
check("  toy mode off, back to asking", [storage.getToyMode(), storage.getDefaultStance()], [false, "prompt"]);
check("  trigger scope and fade back to defaults", [storage.getTriggerScope(), storage.getTriggerDecayRate()], ["hypnotist", "never"]);
check("  settings lock off again", on("lockedWhileHypnotized"), false);

// The player's own preferences are not a template's business.
reset();
for (const k of ["showTriggerWords", "releaseOnDisconnect", "selfTrigger", "strictTriggerMatch"]) storage.setFeature(k, true);
wizard.applyPreset("balanced");
check("preferences survive a template", ["showTriggerWords", "releaseOnDisconnect", "selfTrigger", "strictTriggerMatch"].every(on), true);

// --- DW: nobody who chose the OLD Extreme is put in the new lock ---------------------------
// v0.97/v0.98 Extreme stored only its settings (every gate Drifting, every permission on) and
// starterState "done" — never which preset it was. Loading such a profile must not lock anything.
// Failure looks like: getExtremeLock() returning anything, or settings reading as locked.
{
	const lz = (await import("lz-string")).default;
	const old = {
		version: "0.98.3", trust: [], experience: 0, starterState: "done", chemicalScope: "arousal",
		relationshipOverride: {}, chemicalReach: { illusionControl: true, triggerControl: true }, deepestTier: "blank",
		features: Object.fromEntries(["hypnoEnabled", ...ALL_GRANTS].map((k) => [k, true])),
		depthGates: Object.fromEntries(depth.DEPTH_GATES.map((g) => [g.key, "drifting"])),
	};
	storage.importSettings(lz.compressToBase64(JSON.stringify(old)));
	check("old Extreme profile: no lock", storage.getExtremeLock(), null);
	check("old Extreme profile: settings not locked", extreme.extremeLocked(), false);
	check("old Extreme profile: its settings kept", [on("compelTouchOthers"), storage.getDepthOverride("triggerControl")], [true, 0]);
}

// --- the questions -------------------------------------------------------------------------------
check("five questions, in order", wizard.QUESTIONS.map((q) => q.key), ["role", "induction", "physical", "senses", "triggers"]);
check("Q1 has two answers (DW merged Subject and Both)", wizard.QUESTIONS[0].options.map((o) => o.value), ["hypnotist", "subject"]);

const cfgFor = (a) => wizard.wizardConfig(a);
check("Q1 hypnotist = the Hypnotist only template", cfgFor({ role: "hypnotist" }), wizard.PRESETS[0].config);

const base = { role: "subject", induction: "ask", physical: "basics", senses: "none", triggers: "none" };
const basic = cfgFor(base);
check("basics: hypnosis on, posture and freeze only", [basic.hypnoEnabled, basic.features], [true, ["movementRestriction", "postureControl"]]);
check("  asked first, no toy mode", [basic.stance, !!basic.toyMode], ["prompt", false]);
check("  sink deeper: Yielding", basic.deepest, "yielding");

const trusted = cfgFor({ ...base, induction: "trusted" });
check("Q2 trusted: toy mode for owner and lovers, still asks others", [trusted.toyMode, trusted.toyScope, trusted.stance], [true, "lovers", "prompt"]);
const submit = cfgFor({ ...base, induction: "submit" });
check("Q2 submit: agree, toy mode, keep my answer when away", [submit.stance, submit.toyMode, submit.away], ["agree", true, "keep"]);

const standard = cfgFor({ ...base, physical: "standard" });
check("Q3 standard: adds silence, self-touch, undressing, arousal; Entranced",
	[["speechRestriction", "selfTouchControl", "undressControl", "arousalControl"].every((k) => standard.features.includes(k)), standard.deepest], [true, "entranced"]);
const deep = cfgFor({ ...base, physical: "deep" });
check("Q3 deep: adds touch others, follow, made to act; Deep",
	[["compelActivity", "compelTouchOthers", "followControl", "speechRestriction"].every((k) => deep.features.includes(k)), deep.deepest], [true, "deep"]);

check("Q4 none: nothing sensory", ["illusionControl", "sightControl", "hearingControl", "suppressClothing"].some((k) => basic.features.includes(k)), false);
const veil = cfgFor({ ...base, senses: "veil" });
check("Q4 veil: the illusion only", ["illusionControl", "sightControl"].map((k) => veil.features.includes(k)), [true, false]);
const full = cfgFor({ ...base, senses: "full" });
check("Q4 full: illusion, sight, hearing and the three awareness",
	["illusionControl", "sightControl", "hearingControl", "suppressClothing", "suppressBondage", "suppressActivities"].every((k) => full.features.includes(k)), true);
check("Q4: the trance veil is never turned off", [basic.trance?.tranceScreenFade, full.trance?.tranceScreenFade], [undefined, undefined]);

const trig = cfgFor({ ...base, triggers: "standard" });
check("Q5 standard: triggers, owner/lovers/whitelist, no drops, no carry",
	[trig.features.includes("triggerControl"), trig.triggerScope, trig.drop ?? "off", trig.features.includes("carryForward")], [true, "whitelist", "off", false]);
const cond = cfgFor({ ...base, triggers: "deep" });
check("Q5 deep: triggers from all but blacklist, made to speak, drops, carry-forward",
	[cond.triggerScope, cond.drop, ["triggerControl", "forcedSpeech", "carryForward"].every((k) => cond.features.includes(k))], ["notblack", "unlimited", true]);
check("questions never lock and never open arousal reach", [cond.openChemical, cond.allDepths], [undefined, undefined]);

// --- the template blurbs are readable in full (v0.82.3) ------------------------------------------
// The canvas is modelled with a per-character width — 0.46em is Arial-like, 0.6em is monospace —
// and every fillText is recorded. Failure looks like: a line ending in "…", a blurb whose words do
// not all reach the screen, or one spilling into the next row.
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
			check(`${label}: every word of "${p.name}" is drawn`, p.blurb.split(/\s+/).filter((w) => !text.includes(w)), []);
		}
		const blurbLines = drawn.filter((d) => d.x > 400);
		const rows = wizard.PRESETS.map((_, i) => blurbLines.filter((d) => Math.floor((d.y - blurbLines[0].y + 45) / 90) === i));
		check(`${label}: no blurb spills into the next row`, rows.every((r) => r.length && Math.max(...r.map((d) => d.y)) - Math.min(...r.map((d) => d.y)) + r[0].size < 90), true);
		check(`${label}: still readable, not shrunk below the floor`, Math.min(...blurbLines.map((d) => d.size)) >= 18, true);
	}
	wizard.cancelWizard();
}

// --- clicking through it -------------------------------------------------------------------------
// Every DrawButton is recorded with its rectangle and disabled flag; a click is MouseIn answering
// true for exactly that rectangle. Failure looks like: a page with no Cancel; Cancel writing
// anything; Next moving on with nothing chosen; Extreme applying or locking before Confirm.
{
	let buttons = [];
	let target = null;
	globalThis.DrawButton = (x, y, w, h, label, color, image, hover, disabled) =>
		buttons.push({ x, y, w, h, label: String(label).replace(/^✓\s+/, ""), color, disabled: !!disabled });
	globalThis.MouseIn = (x, y, w, h) => !!target && target.x === x && target.y === y && target.w === w && target.h === h;
	const draw = () => { buttons = []; wizard.drawWizard(); return buttons.map((b) => b.label); };
	const click = (label) => {
		draw();
		target = buttons.find((b) => b.label === label) ?? null;
		if (!target) throw new Error(`no button "${label}" on this page; saw ${JSON.stringify(buttons.map((b) => b.label))}`);
		wizard.clickWizard();
		target = null;
	};
	const opt = (q, value) => wizard.QUESTIONS[q].options.find((o) => o.value === value).label;
	const answerAll = (a) => {
		click("Answer a few questions instead");
		["role", "induction", "physical", "senses", "triggers"].forEach((key, i) => {
			click(opt(i, a[key]));
			click("Next");
		});
	};

	// The welcome page has Cancel now (job2.md §1), and on a first run it writes nothing.
	reset();
	check("ui: a fresh install shows the wizard", wizard.shouldShowWizard(), true);
	check("ui: Cancel on the welcome page", draw().includes("Cancel"), true);
	click("Cancel");
	check("ui: Cancel from welcome closes it", wizard.shouldShowWizard(), false);
	check("ui: and applies nothing", [on("hypnoEnabled"), storage.getStarterState()], [false, "done"]);

	// One-click templates apply at once, no confirmation (DW, §5.5).
	reset();
	click("Light / safe");
	check("ui: Light applies on one click", [on("postureControl"), wizard.shouldShowWizard()], [true, false]);
	reset();
	click("Balanced");
	check("ui: Balanced applies on one click", [on("triggerControl"), wizard.shouldShowWizard()], [true, false]);

	// Extreme asks first. Cancel there applies NOTHING and locks nothing.
	reset();
	click("Extreme");
	check("ui: Extreme shows its warning", draw().includes("Confirm 1-week lock"), true);
	check("ui: nothing applied yet", [on("compelTouchOthers"), storage.getExtremeLock()], [false, null]);
	click("Cancel");
	check("ui: Cancel on the warning applies nothing", [on("hypnoEnabled"), storage.getExtremeLock()], [false, null]);
	check("ui: and leaves the wizard", wizard.shouldShowWizard(), false);
	// Confirm applies and locks.
	reset();
	click("Extreme");
	click("Confirm 1-week lock");
	check("ui: Confirm applies Extreme", on("compelTouchOthers"), true);
	check("ui: and starts the trial lock", storage.getExtremeLock()?.stage, "trial");
	check("ui: and leaves the wizard", wizard.shouldShowWizard(), false);
	storage.clearExtremeLock();

	// Next waits for an answer.
	reset();
	click("Answer a few questions instead");
	draw();
	check("ui: Next is greyed with nothing chosen", buttons.find((b) => b.label === "Next")?.disabled, true);
	click("Next");
	check("ui: and does not move on", draw().includes(opt(0, "subject")), true);
	// v0.100.1 (DW): Next must LOOK clickable once answered. Failure: the same pale colour either way.
	const nextColor = () => { draw(); return buttons.find((b) => b.label === "Next")?.color; };
	check("ui: Next is dark grey while waiting", nextColor(), "#b8b8b8");
	click(opt(0, "subject"));
	check("ui: Next turns white, like the other buttons, once answered", [nextColor(), buttons.find((b) => b.label === "Next")?.disabled], ["White", false]);

	// Cancel is on every question and the summary, and from the summary still writes nothing.
	const offered = [];
	click(opt(0, "subject"));
	for (let i = 0; i < 5; i++) {
		offered.push(draw().includes("Cancel"));
		if (i > 0) click(wizard.QUESTIONS[i].options[2].label);
		click("Next");
	}
	offered.push(draw().includes("Apply") && draw().includes("Cancel"));
	check("ui: Cancel on all five questions and the summary", offered, [true, true, true, true, true, true]);
	click("Cancel");
	check("ui: Cancel from the summary writes nothing", [on("compelTouchOthers"), on("hypnoEnabled")], [false, false]);

	// Hypnotist on Q1 goes straight to the summary; Apply writes the template.
	reset();
	click("Answer a few questions instead");
	click(opt(0, "hypnotist"));
	click("Next");
	check("ui: Hypnotist goes straight to the summary", draw().includes("Apply"), true);
	click("Back");
	check("ui: Back from that summary returns to Q1", draw().includes(opt(0, "hypnotist")), true);
	click("Next");
	click("Apply");
	check("ui: Hypnotist applied", [on("hypnoEnabled"), storage.getDefaultStance()], [false, "fight"]);

	// A full path applies exactly what the answers say, and never locks.
	reset();
	answerAll({ role: "subject", induction: "submit", physical: "deep", senses: "full", triggers: "deep" });
	click("Apply");
	check("ui: full path applied", [on("compelTouchOthers"), on("sightControl"), on("carryForward"), storage.getDefaultStance()], [true, true, true, "agree"]);
	check("ui: questions never lock", storage.getExtremeLock(), null);
	check("ui: settings editable after the questions", extreme.extremeLocked(), false);

	// A re-run from the Setup button: Cancel leaves existing settings exactly as they were.
	reset();
	wizard.applyPreset("balanced");
	const before = JSON.stringify(storage.getFeatures());
	wizard.startWizard();
	click("Answer a few questions instead");
	click(opt(0, "subject"));
	click("Next");
	click("Cancel");
	check("re-run cancel: permissions unchanged", JSON.stringify(storage.getFeatures()), before);
	check("re-run cancel: the wizard closes", wizard.shouldShowWizard(), false);

	// Cancel must not sit on top of Back or the forward button.
	reset();
	click("Answer a few questions instead");
	click(opt(0, "subject"));
	click("Next");
	draw();
	const [cancel, back, next] = ["Cancel", "Back", "Next"].map((l) => buttons.find((b) => b.label === l));
	const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
	check("ui: Cancel clear of Back and Next", [overlaps(cancel, back), overlaps(cancel, next)], [false, false]);
	wizard.cancelWizard();
}

console.log(`wizard: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
