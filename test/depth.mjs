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
// v0.98.0: both the number and the tier, for what is needed and for where she is.
check("refusal names number and tier", /^needs 60 \[Deep\], at 20 \[Yielding\]/.test(depth.depthRefusal("triggerControl", 20, 20) ?? ""), true);
check("  and rounds where she is down, not up", /at 39 \[Yielding\]/.test(depth.depthRefusal("followControl", 39.6, 39.6) ?? ""), true);
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
check("default before any choice", depth.requiredDepth("movementRestriction"), 20);
check("  read as a tier", depth.requiredTier("movementRestriction"), "yielding");
storage.setDepthOverride("movementRestriction", 45);
check("a number is honoured", depth.requiredDepth("movementRestriction"), 45);
check("  and names its tier", depth.requiredTier("movementRestriction"), "entranced");
check("  44 is one short", depth.depthAllows("movementRestriction", 44, 44), false);
check("  45 is enough", depth.depthAllows("movementRestriction", 45, 45), true);
storage.clearDepthOverrides();
check("resetting restores the default", depth.requiredDepth("movementRestriction"), 20);

// Out-of-range and fractional input is made whole and kept inside 0-99, never refused.
check("setting 150 saves 99", storage.setDepthOverride("movementRestriction", 150), 99);
check("setting -3 saves 0", storage.setDepthOverride("movementRestriction", -3), 0);
check("setting 44.6 saves 45", storage.setDepthOverride("movementRestriction", 44.6), 45);
check("NaN saves 0 rather than junk", storage.setDepthOverride("movementRestriction", NaN), 0);
storage.clearDepthOverrides();

// The label the settings screen and every refusal share.
check("label", depth.depthLabel(45), "45 [Entranced]");
check("label at a floor", depth.depthLabel(80), "80 [Blank]");

// --- migrating saved tier names (v0.98.0) ------------------------------------------------------
// Failure: a player who set a gate before numbers came loses the choice, or gets a different one.
{
	const lz = (await import("lz-string")).default;
	const blob = {
		version: "0.97.4", trust: [], experience: 0, features: { hypnoEnabled: true }, chemicalScope: "arousal",
		relationshipOverride: {},
		depthGates: { movementRestriction: "blank", undressControl: "drifting", triggerControl: "yielding",
			followControl: "entranced", sightControl: "deep", forcedSpeech: "somethingelse", hearingControl: 250 },
	};
	storage.importSettings(lz.compressToBase64(JSON.stringify(blob)));
	check("blank becomes 80", depth.requiredDepth("movementRestriction"), 80);
	check("drifting becomes 0", depth.requiredDepth("undressControl"), 0);
	check("yielding becomes 20", depth.requiredDepth("triggerControl"), 20);
	check("entranced becomes 40", depth.requiredDepth("followControl"), 40);
	check("deep becomes 60", depth.requiredDepth("sightControl"), 60);
	check("an unknown name is dropped, so the default governs", depth.requiredDepth("forcedSpeech"), 40);
	check("a number out of range is clamped", depth.requiredDepth("hearingControl"), 99);
	check(
		"what is stored is numbers, and nothing for the dropped one",
		["movementRestriction", "undressControl", "triggerControl", "followControl", "sightControl", "forcedSpeech", "hearingControl"]
			.map((k) => typeof storage.getDepthOverride(k)),
		["number", "number", "number", "number", "number", "undefined", "number"],
	);
	storage.clearDepthOverrides();
}
// storage.ts spells the tier floors out to stay a leaf; they must match depth.ts's.
check(
	"storage's legacy floors match the tiers",
	depth.DEPTH_TIERS.map((t) => storage.LEGACY_GATE_TIERS[t.key]),
	depth.DEPTH_TIERS.map((t) => t.min),
);

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
check("scopes cycle", depth.nextScope("none"), "both");

console.log(`depth: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
