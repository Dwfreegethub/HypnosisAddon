// The first-launch starter set (proposal §9).
//
// The button mechanics live in menu.ts behind canvas, but the part that MUST be right is the
// SET itself — which permissions a fresh install is offered. The whole safety argument is that
// nothing in it outlives the session or lies to the subject about their body, so this suite
// pins the composition against exactly that line, feature by feature, and locks the sparse
// first-launch state. If someone adds a persistent or deceiving flag to the set, this fails.
globalThis.Player = { MemberNumber: 1, ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { storage, depth } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const set = storage.STARTER_FEATURES;

// --- the exact five, and no more -------------------------------------------------------------
check("the starter set is the five session-scoped basics", [...set].sort(), [
	"clothingRestriction", "hypnoEnabled", "movementRestriction", "postureControl", "speechRestriction",
].sort());

// --- the safety property, checked against the gates rather than a hand-list ------------------
// Nothing in the set may be earned-only (those either outlive the session or deceive the
// subject). depth.ts is the authority on which those are, so this cannot drift from it.
for (const key of set) {
	const gate = depth.gateFor(key);
	check(`  ${key} is not an earned-only (persistent/deceiving) feature`, gate ? gate.earnedOnly : false, false);
}

// The specific flags the proposal argues OUT must never creep in.
for (const forbidden of [
	"illusionControl", "triggerControl", "carryForward", // persist or deceive
	"suppressClothing", "suppressBondage", "suppressActivities", // unaware of your own body
	"arousalControl", "undressControl", "selfTouchControl", // more intimate
	"lockedWhileHypnotized", // removes an exit
]) {
	check(`  the set excludes ${forbidden}`, set.includes(forbidden), false);
}

// hypnoEnabled must be in it — without the master switch the whole point (looks broken) stands.
check("the master switch is included", set.includes("hypnoEnabled"), true);

// --- the first-launch state is sparse: new until a choice is made ----------------------------
check("a fresh install is 'new'", storage.getStarterState(), "new");
storage.setStarterState("applied");
check("applying moves to 'applied'", storage.getStarterState(), "applied");
storage.setStarterState("done");
check("dismissing moves to 'done'", storage.getStarterState(), "done");
storage.setStarterState("new");
check("undo returns to 'new'", storage.getStarterState(), "new");
// "new" is stored as ABSENCE, so it survives a reset to defaults as new rather than as a value.
storage.setStarterState("done");
storage.resetSettings();
check("a reset returns to 'new' (nothing frozen in)", storage.getStarterState(), "new");

console.log(`starter: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
