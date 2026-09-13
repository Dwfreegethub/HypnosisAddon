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

console.log(`wizard: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
