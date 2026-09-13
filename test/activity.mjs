// Compelled activities (v0.72.0): "Missy, touch your breasts" makes the subject perform a real
// BC activity on themselves. The grammar is pure and tested directly; the handler is driven
// through handleSpokenLine with BC's activity calls stubbed, so we assert the RIGHT activity on
// the RIGHT zone reaches ActivityRun, that BC's own filter is consulted, and that a commanded
// action pierces the self-touch BLOCK but never Freeze.
const HYP = 246108;

// A stubbed BC activity surface. ALLOWED describes what BC currently permits per group; the
// handler must consult it and only run what it returns.
let ALLOWED = {};            // groupName -> [activityName]
const runCalls = [];         // { activity, group } every ActivityRun the handler makes
globalThis.ActivityAllowedForGroup = (_char, groupName) =>
	(ALLOWED[groupName] || []).map((name) => ({ Activity: { Name: name }, Group: groupName }));
globalThis.AssetGroupGet = (_family, groupName) => ({ Name: groupName });
globalThis.ActivityRun = (_actor, _acted, groupObj, itemActivity) =>
	runCalls.push({ activity: itemActivity?.Activity?.Name, group: groupObj?.Name });

let frozen = false;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	HasEffect: (e) => e === "Freeze" && frozen,
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };

const { voice, storage, session, depth } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line) => voice.handleSpokenLine(HYP, line);
const lastRun = () => runCalls[runCalls.length - 1];
const lastReport = () => toHyp.filter((t) => t.startsWith("[command]")).at(-1) ?? "";
const reset = () => { runCalls.length = 0; toHyp.length = 0; };

// --- the grammar, pure ----------------------------------------------------------------------
check("verb + part parses to activity + word", voice.matchActivityCommand("Missy, pinch your nipples"), { kind: "part", activity: "Pinch", word: "nipples" });
check("touch = Caress (the universal)", voice.matchActivityCommand("touch your thighs").activity, "Caress");
check("spank maps to Spank", voice.matchActivityCommand("spank your bottom").activity, "Spank");
check("bare 'touch yourself' is vague", voice.matchActivityCommand("touch yourself"), { kind: "vague" });
check("bare 'finger yourself' is genital", voice.matchActivityCommand("finger yourself"), { kind: "genital" });
check("a NEGATED line is not a command (block owns it)", voice.matchActivityCommand("you cannot touch your breasts"), null);
check("'stop touching yourself' is not a command", voice.matchActivityCommand("stop touching yourself"), null);
check("plain conversation is nothing", voice.matchActivityCommand("I might touch base later"), null);

// --- the handler: gated on permission and depth ---------------------------------------------
storage.setFeature("hypnoEnabled", true);
session.forceTrance(HYP, 80, 80);
ALLOWED = { ItemBreast: ["Caress", "Grope"], ItemNipples: ["Pinch"], ItemVulva: ["MasturbateHand"] };

reset();
say("Missy, touch your breasts.");
check("refused without the permission", runCalls.length, 0);
check("  and the hypnotist is told which permission", /have not enabled/.test(lastReport()), true);

storage.setFeature("compelActivity", true);

// --- it runs the right activity on the right zone, through BC ---------------------------------
reset();
say("Missy, touch your breasts.");
check("with permission, Caress runs on the breast", lastRun(), { activity: "Caress", group: "ItemBreast" });
reset();
say("Missy, pinch your nipples.");
check("pinch runs Pinch on the nipples", lastRun(), { activity: "Pinch", group: "ItemNipples" });

// --- BC's filter is authoritative: an activity it does not allow there does not run ----------
reset();
say("Missy, grope your nipples.");  // ALLOWED[ItemNipples] has no Grope
check("an activity BC does not permit there does not run", runCalls.length, 0);
check("  and the hypnotist hears why", /won't land there/.test(lastReport()), true);

// --- the block-override: a commanded touch pierces the self-touch BLOCK ----------------------
// The subject has blocked their OWN breast-touch. A command still lands, because it is involuntary.
reset();
voice.handleSpokenLine(HYP, "Missy, you cannot touch your breasts."); // sets the block (needs selfTouchControl)
storage.setFeature("selfTouchControl", true);
voice.handleSpokenLine(HYP, "Missy, you cannot touch your breasts.");
reset();
say("Missy, touch your breasts.");
check("a command overrides the self-touch block (involuntary)", lastRun(), { activity: "Caress", group: "ItemBreast" });

// --- but Freeze is physical and stops it ----------------------------------------------------
reset();
frozen = true;
say("Missy, touch your breasts.");
check("frozen: nothing runs", runCalls.length, 0);
check("  and the hypnotist is told they cannot move", /frozen/.test(lastReport()), true);
frozen = false;

// --- bare 'touch yourself' wanders to an allowed zone and hints to the hypnotist -------------
reset();
say("Missy, touch yourself.");
check("vague touch still performs a Caress", lastRun()?.activity, "Caress");
check("  on one of the reachable zones", ["ItemBreast"].includes(lastRun()?.group), true);
check("  and the hypnotist is nudged to be specific", /wander/.test(lastReport()), true);

// --- depth gate: too shallow refuses --------------------------------------------------------
reset();
session.safeword();
session.forceTrance(HYP, 10, 10); // Drifting; compelActivity needs Yielding
say("Missy, touch your breasts.");
check("too shallow: refused for depth", runCalls.length, 0);
check("  named as a depth refusal", /needs Yielding/.test(lastReport()), true);

session.safeword();
console.log(`activity: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
