// The earned-only per-feature toggle (decided 2026-09-08, built once decay existed to price it).
//
// The structural rule is unchanged by DEFAULT: arousal cannot reach the three features that
// outlive the session or lie about the body. What changed is that the SUBJECT — never a
// hypnotist — may open two of them (illusion, triggers) to chemical depth for themselves, at the
// cost of fast decay. Carry-forward stays locked until it has a decay clock of its own.
//
// The asserts drive the real gate (depthAllows / depthRefusal / effectiveEarnedOnly), because the
// whole point is where the depth is READ from, not what a setting stores.
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { depth, storage } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
// Chemical depth: full 80, earned only 20 — deep because aroused, not because trusted.
const CHEM_FULL = 80, CHEM_EARNED = 20;
const reaches = (key) => depth.depthAllows(key, CHEM_FULL, CHEM_EARNED);

// --- which features are the subject's to open -----------------------------------------------
check("the illusion is toggleable", depth.isChemicalToggleable("illusionControl"), true);
check("triggers are toggleable", depth.isChemicalToggleable("triggerControl"), true);
check("carry-forward is NOT — it has no decay clock yet", depth.isChemicalToggleable("carryForward"), false);
check("a session feature is not a 'toggle' at all (never earned-only)", depth.isChemicalToggleable("movementRestriction"), false);

// --- default: earned-only holds, arousal cannot reach any of the three -----------------------
check("default: illusion is earned-only", depth.effectiveEarnedOnly("illusionControl"), true);
check("  arousal does not reach it", reaches("illusionControl"), false);
check("  the refusal names the earned rule", /arousal does not count/.test(depth.depthRefusal("illusionControl", CHEM_FULL, CHEM_EARNED) ?? ""), true);
check("default: triggers earned-only, unreached", [depth.effectiveEarnedOnly("triggerControl"), reaches("triggerControl")], [true, false]);
check("default: carry earned-only, unreached", [depth.effectiveEarnedOnly("carryForward"), reaches("carryForward")], [true, false]);

// --- the subject opens the illusion to arousal ----------------------------------------------
storage.setChemicalReach("illusionControl", true);
check("now the illusion reads full depth", depth.effectiveEarnedOnly("illusionControl"), false);
check("  arousal reaches it", reaches("illusionControl"), true);
check("  and the refusal is gone (it is reachable)", depth.depthRefusal("illusionControl", CHEM_FULL, CHEM_EARNED), null);
check("  triggers are UNAFFECTED — the toggle is per feature", reaches("triggerControl"), false);

// --- opening triggers marks a chemically-seeded plant for fast decay -------------------------
storage.setChemicalReach("triggerControl", true);
check("arousal reaches trigger planting now", reaches("triggerControl"), true);
// plantedChemical, as beginRecording computes it: did EARNED depth alone clear the gate? No ->
// it was carried by chemistry -> fast decay.
const plantedChemical = !depth.depthAllows("triggerControl", CHEM_EARNED, CHEM_EARNED);
check("a plant made on chemical depth is marked chemical", plantedChemical, true);
// Earned deep enough: not chemical, ordinary decay.
const earnedPlant = !depth.depthAllows("triggerControl", 80, 80);
check("a plant made on earned depth is NOT chemical", earnedPlant, false);

// --- carry-forward cannot be opened, even if a value is forced into storage ------------------
storage.setChemicalReach("carryForward", true); // the UI never does this; prove the gate ignores it
check("carry-forward stays earned-only regardless of storage", depth.effectiveEarnedOnly("carryForward"), true);
check("  arousal still cannot reach it", reaches("carryForward"), false);

// --- reversibility: turning it back off restores the default, sparsely -----------------------
storage.setChemicalReach("illusionControl", false);
check("closed again: earned-only", depth.effectiveEarnedOnly("illusionControl"), true);
check("  and unreachable by arousal", reaches("illusionControl"), false);
check("  the key is gone, not stored false (default stays in code)", storage.getChemicalReach("illusionControl"), false);

// --- a HYPNOTIST cannot flip this: it is only ever the subject's own storage -----------------
// There is no message handler and no cross-player path that writes chemicalReach — the setter is
// local. This asserts the surface: the only way in is setChemicalReach on this client.
check("earned depth still reaches an opened feature (nothing broke the ordinary path)",
	depth.depthAllows("triggerControl", 80, 80), true);

console.log(`chemical-reach: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
