// Trance depth as the feature gate.
//
// The redesign's core claim is that ONE number can answer every feature — and the reason it
// cannot quite is what this suite mostly protects. Drugs and arousal may never write anything
// permanent nor reach a feature that lies to the subject about their own body, and that is a
// rule about where the depth CAME FROM, not how much of it there is. Hence two numbers.
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { depth, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- the tiers ---------------------------------------------------------------------------
check("0 is Drifting", depth.tierOf(0), "drifting");
check("19 is still Drifting", depth.tierOf(19), "drifting");
check("20 is Yielding", depth.tierOf(20), "yielding");
check("40 is Entranced", depth.tierOf(40), "entranced");
check("60 is Deep", depth.tierOf(60), "deep");
check("80 is Blank", depth.tierOf(80), "blank");
check("100 is still Blank", depth.tierOf(100), "blank");
// The boundaries are the doc's, and off-by-one here would silently move every gate.
check("boundaries", depth.DEPTH_TIERS.map((t) => t.min), [0, 20, 40, 60, 80]);

// --- what each feature needs --------------------------------------------------------------
check("awareness is the shallowest thing", depth.requiredTier("suppressClothing"), "drifting");
check("being frozen is Yielding", depth.requiredTier("movementRestriction"), "yielding");
check("undressing is Entranced", depth.requiredTier("undressControl"), "entranced");
check("arousal is Entranced", depth.requiredTier("arousalControl"), "entranced");
check("the illusion is Deep", depth.requiredTier("illusionControl"), "deep");
check("triggers are Deep", depth.requiredTier("triggerControl"), "deep");
check("carrying is Deep", depth.requiredTier("carryForward"), "deep");

// --- the two-depth rule, which is the whole reason this is not one number -------------------
// Three features are earned-only. Every other one takes the full depth, chemicals included.
const earned = depth.DEPTH_GATES.filter((g) => g.earnedOnly).map((g) => g.key).sort();
check("exactly three are earned-only", earned, ["carryForward", "illusionControl", "triggerControl"]);

// Deep in the full sense, shallow in the earned one: arousal carried them there.
check("arousal reaches a session feature", depth.depthAllows("movementRestriction", 80, 20), true);
check("  but not a trigger", depth.depthAllows("triggerControl", 80, 20), false);
check("  nor carrying", depth.depthAllows("carryForward", 80, 20), false);
check("  nor the illusion — it lies to her", depth.depthAllows("illusionControl", 80, 20), false);
// Earned there on their own, and everything opens.
check("earned depth reaches the trigger", depth.depthAllows("triggerControl", 80, 80), true);
check("  and the illusion", depth.depthAllows("illusionControl", 80, 80), true);

// A refusal says which of the two it failed, because those are different problems with
// different answers — one is "go deeper", the other is "arousal will not do it".
check("refusal names the tier", /needs Deep/.test(depth.depthRefusal("triggerControl", 20, 20) ?? ""), true);
check("  and names the earned rule", /arousal does not count/.test(depth.depthRefusal("triggerControl", 80, 20) ?? ""), true);
check("  session refusals do not", /arousal does not count/.test(depth.depthRefusal("movementRestriction", 10, 10) ?? ""), false);
check("no refusal when it is reachable", depth.depthRefusal("movementRestriction", 30, 30), null);

// --- nothing is reachable with no trance ----------------------------------------------------
// Depth 0 is the honest answer outside a session, and every gated feature needs one.
depth.clearCurrentDepths();
check("no trance, no depth", depth.currentDepth(), 0);
for (const g of depth.DEPTH_GATES) {
	if (depth.requiredDepth(g.key) > 0) check(`  ${g.key} is out of reach`, depth.depthAllows(g.key), false);
}
// Awareness sits at Drifting, whose floor is 0 — so it IS reachable in the shallowest trance,
// which is the design rather than a hole: noticing less is the first thing hypnosis does.
check("but awareness is reachable at the surface", depth.depthAllows("suppressClothing"), true);

// --- earned can never exceed full ------------------------------------------------------------
// Same roll, fewer inputs. A subject deeper in the earned sense than in reality is nonsense.
depth.setCurrentDepths(40, 90);
check("earned is clamped to full", depth.currentDepthEarned(), 40);
depth.setCurrentDepths(90, 40);
check("  and otherwise kept", depth.currentDepthEarned(), 40);

// --- player overrides -------------------------------------------------------------------------
// Only differences are stored, so retuning a default moves everyone who has not chosen.
check("default before any choice", depth.requiredTier("movementRestriction"), "yielding");
storage.setDepthOverride("movementRestriction", "blank");
check("an override is honoured", depth.requiredTier("movementRestriction"), "blank");
check("  and raises the bar", depth.depthAllows("movementRestriction", 60, 60), false);
storage.clearDepthOverrides();
check("resetting restores the default", depth.requiredTier("movementRestriction"), "yielding");

// Junk in storage falls back rather than throwing — a settings file is not a trusted input.
storage.setDepthOverride("movementRestriction", "somethingelse");
check("an unknown tier is ignored", depth.requiredTier("movementRestriction"), "yielding");
storage.clearDepthOverrides();

// --- the chemical scope --------------------------------------------------------------------
check("arousal counts by default", depth.arousalCounts(), true);
storage.setChemicalScope("none");
check("  and can be switched off", depth.arousalCounts(), false);
storage.setChemicalScope("drugs");
check("  drugs-only excludes arousal", depth.arousalCounts(), false);
storage.setChemicalScope("both");
check("  both includes it", depth.arousalCounts(), true);
storage.setChemicalScope("arousal");

// Cycling is what the settings screen does; it must come back round rather than dead-end.
check("tiers cycle", depth.nextTier("blank"), "drifting");
check("scopes cycle", depth.nextScope("none"), "both");

console.log(`depth: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
