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

// BC keeps effects in a CACHED Player.Effect array — both HasEffect and ActivityOrgasmPrepare
// read it — and CharacterLoadEffect rebuilds it from appearance. Our effects.ts writes onto the
// invisible "Emoticon" carrier's Property.Effect. To model "OUR freeze/denial" versus a REAL
// restraint we keep both sources — the carrier we control, and realItemEffects we do not — and
// rebuild the cache from both exactly as BC would. That is what lets the suite prove a command
// pierces OUR restriction while a real one still stands.
const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
let realItemEffects = [];
const orgasmStarts = [];
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
// ActivityOrgasmPrepare bails (leaving OrgasmTimer untouched) when the CACHE says denied,
// modelling BC's own `C.Effect.includes("DenialMode")` check; otherwise it arms the timer.
globalThis.ActivityOrgasmPrepare = (C) => { if (!C.Effect.includes("DenialMode")) C.ArousalSettings.OrgasmTimer = CurrentTime + 5000; };
globalThis.ActivityOrgasmStart = () => orgasmStarts.push(true);
globalThis.ActivitySetArousal = () => {};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };

const { voice, storage, session, depth, effects } = await import("./harness-bundle.mjs");
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
const lastSuggestionReport = () => toHyp.filter((t) => t.startsWith("[suggestion]")).at(-1) ?? "";
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

// --- Freeze: OUR hypnotic freeze yields to a command; a REAL restraint still stops it --------
// "You cannot move" is a freeze WE applied; a command is involuntary, so it pierces our freeze
// exactly as it pierces the self-touch block (DW: command always wins). A heavy item that
// freezes her is physical and still refuses — hasOwnEffect tells the two apart.
reset();
emoticon.Property.Effect = ["Freeze"]; realItemEffects = []; CharacterLoadEffect(Player); // OUR freeze
say("Missy, touch your breasts.");
check("our own freeze does NOT stop a command", lastRun(), { activity: "Caress", group: "ItemBreast" });

reset();
effects.removeEffect("Freeze"); // our own freeze off first: since v0.90.2 we hold a record of it, not only the item
emoticon.Property.Effect = []; realItemEffects = ["Freeze"]; CharacterLoadEffect(Player); // a REAL restraint
say("Missy, touch your breasts.");
check("a real restraint's freeze still stops it", runCalls.length, 0);
check("  and the hypnotist is told they cannot move", /frozen/.test(lastReport()), true);
realItemEffects = []; emoticon.Property.Effect = []; CharacterLoadEffect(Player);

// --- bare 'touch yourself' wanders to an allowed zone and hints to the hypnotist -------------
reset();
say("Missy, touch yourself.");
check("vague touch still performs a Caress", lastRun()?.activity, "Caress");
check("  on one of the reachable zones", ["ItemBreast"].includes(lastRun()?.group), true);
check("  and the hypnotist is nudged to be specific", /wander/.test(lastReport()), true);

// --- orgasm: a forced "cum for me" overrides OUR denial, but not a real chastity item --------
// Same rule as the touch block: "you cannot cum" restricts HER volition, and a command is not
// her choice — so it pierces our denial and puts it straight back. A real belt (its own item)
// survives the effect-cache rebuild and still holds. Drives the real orgasm-force suggestion.
storage.setFeature("arousalControl", true);

reset(); orgasmStarts.length = 0;
emoticon.Property.Effect = ["DenialMode"]; realItemEffects = []; CharacterLoadEffect(Player); // OURS
Player.ArousalSettings.OrgasmTimer = 0;
say("Missy, cum for me.");
check("our denial is overridden — the orgasm lands", orgasmStarts.length, 1);
check("  and our denial is put straight back afterward", emoticon.Property.Effect.includes("DenialMode"), true);

reset(); orgasmStarts.length = 0;
emoticon.Property.Effect = []; realItemEffects = ["DenialMode"]; CharacterLoadEffect(Player); // a real belt
Player.ArousalSettings.OrgasmTimer = 0;
say("Missy, cum for me.");
check("a real chastity item is NOT overridden — no orgasm", orgasmStarts.length, 0);
check("  and the hypnotist is told it did not land", /did not land/.test(lastSuggestionReport()), true);
realItemEffects = []; emoticon.Property.Effect = []; CharacterLoadEffect(Player);

// --- spoken denial reaches BC on its own (v0.83.1) --------------------------------------------
// "You cannot cum" wrote DenialMode onto our carrier and never rebuilt BC's cached Player.Effect,
// which is what ActivityOrgasmPrepare reads when a vibrator or an activity reaches 100. So the
// denial was reported as landed and BC let the orgasm through anyway. Nothing here calls
// CharacterLoadEffect by hand: the suggestion alone has to put it where BC looks. On the old
// code each "cache" check below reads the opposite value and the natural orgasm arms its timer.
reset();
Player.ArousalSettings.OrgasmTimer = 0;
say("Missy, you cannot cum.");
check("spoken denial is stored on our carrier", emoticon.Property.Effect.includes("DenialMode"), true);
check("  and BC's cached effects see it, with no other refresh", Player.Effect.includes("DenialMode"), true);
ActivityOrgasmPrepare(Player); // what BC itself calls when arousal reaches 100
check("  so an orgasm BC starts on its own is refused", Player.ArousalSettings.OrgasmTimer, 0);
say("Missy, you may cum now.");
check("allowing clears it from BC's cache too", Player.Effect.includes("DenialMode"), false);
ActivityOrgasmPrepare(Player);
check("  and BC's own orgasm can land again", Player.ArousalSettings.OrgasmTimer > 0, true);
Player.ArousalSettings.OrgasmTimer = 0;
// A denial that names its own end holds an allow phrase in its condition; it used to LIFT denial.
say("Missy, you cannot cum until I allow you to cum.");
check("a denial naming its own end still denies", Player.Effect.includes("DenialMode"), true);
session.safeword();
check("the safeword clears denial from BC's cache", Player.Effect.includes("DenialMode"), false);
session.forceTrance(HYP, 80, 80);

// --- depth gate: too shallow refuses --------------------------------------------------------
reset();
session.safeword();
session.forceTrance(HYP, 10, 10); // Drifting; compelActivity needs Yielding
say("Missy, touch your breasts.");
check("too shallow: refused for depth", runCalls.length, 0);
check("  named as a depth refusal", /needs Yielding/.test(lastReport()), true);

// --- recordable into a trigger, then fired (the bug DW hit, v0.72.4) ------------------------
// A compelled command was PERFORMED instead of joining the trigger being recorded. It must be
// captured during setup — like a body-part block already is — and perform only when the phrase
// fires later.
reset();
session.safeword();
emoticon.Property.Effect = []; realItemEffects = []; CharacterLoadEffect(Player);
ALLOWED = { ItemBreast: ["Caress", "Grope"], ItemNipples: ["Pinch"], ItemVulva: ["MasturbateHand"] };
storage.setFeature("triggerControl", true);
storage.setFeature("compelActivity", true);
session.forceTrance(HYP, 80, 80);

say("Missy, your trigger word is sleepy."); // begin recording
reset();
say("Missy, touch your breasts."); // should RECORD, not perform
check("a compelled command is recorded, not performed, while a trigger records", runCalls.length, 0);
check("  and it is captured as an act: action", /Recorded act:Caress:breasts/.test(toHyp.at(-1) ?? ""), true);
say("Missy, remember trigger."); // commit

// Fire it — out of session, so the installer's own live trance does not suppress it.
session.safeword();
emoticon.Property.Effect = []; realItemEffects = []; CharacterLoadEffect(Player);
reset();
say("sleepy");
check("firing the trigger performs the activity for real", lastRun(), { activity: "Caress", group: "ItemBreast" });

// --- a compel in a trigger is gated by the trigger's STRENGTH, not just permission (v0.72.6) ----
// A faded/shallow trigger loses its compels along with everything else — compelActivity needs
// Yielding (20). A trigger at strength 15 is above the ghost line (10) but below that, so its
// compel is skipped as "too weak"; at 40 it fires. (Plant shallow on purpose via a lowered gate.)
session.safeword();
storage.forgetAllTriggers();
storage.setTriggerDecayRate("never"); // strength == planted depth, no decay to reason about
storage.setDepthOverride("triggerControl", "drifting"); // so we can deliberately plant shallow

session.forceTrance(HYP, 15, 15);
say("Missy, your trigger word is weakone.");
say("Missy, touch your breasts.");
say("Missy, remember trigger.");
session.safeword();
reset();
say("weakone");
check("a below-Yielding trigger does NOT fire its compel", runCalls.length, 0);

storage.forgetAllTriggers();
session.forceTrance(HYP, 40, 40);
say("Missy, your trigger word is strongone.");
say("Missy, touch your breasts.");
say("Missy, remember trigger.");
session.safeword();
reset();
say("strongone");
check("a deep-enough trigger DOES fire its compel", lastRun(), { activity: "Caress", group: "ItemBreast" });
storage.setDepthOverride("triggerControl", "deep");
storage.forgetAllTriggers();

session.safeword();
console.log(`activity: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
