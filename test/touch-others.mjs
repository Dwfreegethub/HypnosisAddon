// Commanded activities on OTHERS (v0.84.0): "Missy, kiss Rei", "Missy, pinch Rei's nipples",
// "Missy, kiss me". The grammar is pure and tested directly; the handler is driven through
// handleSpokenLine with BC's activity calls stubbed PER CHARACTER, so we assert the activity
// reaches ActivityRun with the subject as actor and the named person as the one acted on, that
// BC's answer about THAT person is the one consulted, and that the hypnotist learns a reason
// only about their own body — never about a third party's settings.
const HYP = 246108;
const REI = 300, ELLA = 400;

let ALLOWED = {};  // memberNumber -> { groupName: [activityName] }
const runCalls = [];
globalThis.ActivityAllowedForGroup = (char, groupName) =>
	((ALLOWED[char?.MemberNumber] || {})[groupName] || []).map((name) => ({ Activity: { Name: name }, Group: groupName }));
globalThis.AssetGroupGet = (_family, groupName) => ({ Name: groupName });
globalThis.ActivityRun = (actor, acted, groupObj, itemActivity) =>
	runCalls.push({ actor: actor?.MemberNumber, acted: acted?.MemberNumber, activity: itemActivity?.Activity?.Name, group: groupObj?.Name });

const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
let realItemEffects = [];
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
const hyp = { MemberNumber: HYP, Name: "GameBot", ArousalSettings: { Active: "Hybrid" } };
const rei = { MemberNumber: REI, Name: "Rei", ArousalSettings: { Active: "Hybrid" } };
const ella = { MemberNumber: ELLA, Name: "Ellanora", Nickname: "Ella", ArousalSettings: { Active: "Hybrid" } };
const sam1 = { MemberNumber: 500, Name: "Sam" };
const sam2 = { MemberNumber: 501, Name: "Samantha", Nickname: "Sam" };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
globalThis.ActivityOrgasmPrepare = () => {};
globalThis.ActivityOrgasmStart = () => {};
globalThis.ActivitySetArousal = () => {};
globalThis.ChatRoomCharacter = [Player, hyp, rei, ella, sam1, sam2];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };

const { voice, storage, session, effects } = await import("./harness-bundle.mjs");
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

// --- the grammar, pure --------------------------------------------------------------------
const R = ["Rei", "GameBot"];
const m = (line, roster = R) => voice.matchTargetedActivityCommand(line, roster);
check("kiss <Name> — no part named", m("Missy, kiss Rei"), { activity: "Kiss", target: "rei", word: null });
check("kiss <Name>'s <part>", m("Missy kiss Rei's nipples"), { activity: "Kiss", target: "rei", word: "nipples" });
check("curly apostrophe reads the same", m("Missy, kiss Rei’s nipples"), { activity: "Kiss", target: "rei", word: "nipples" });
check("<verb> <Name> on the <part>", m("Missy, lick Rei on the neck"), { activity: "Lick", target: "rei", word: "neck" });
check("kiss me — me is the speaker", m("Missy, kiss me"), { activity: "Kiss", target: "me", word: null });
check("pinch my nipples — my is the speaker", m("Missy, pinch my nipples"), { activity: "Pinch", target: "me", word: "nipples" });
check("kiss me on the neck", m("Missy, kiss me on the neck"), { activity: "Kiss", target: "me", word: "neck" });
check("an unknown part is flagged, not dropped to the default",
	m("Missy, kiss Rei's cheek"), { activity: "Kiss", target: "rei", word: null, unknownPart: "cheek" });
check("names are EXACT — a longer name is not a match", m("Missy, kiss Reina"), null);
check("names are EXACT — a prefix is not a match", m("Missy, kiss Re"), null);
check("the longer of two overlapping names wins", m("Missy, kiss Rei Chan", ["Rei", "Rei Chan"]).target, "rei chan");
check("  and the shorter still resolves on its own", m("Missy, kiss Rei", ["Rei", "Rei Chan"]).target, "rei");
check("a negated line is not a command", m("Missy, do not kiss Rei"), null);
check("the self grammar is not claimed here", m("Missy, kiss your lips"), null);
check("'feel my hands' is patter, not an order", m("Missy, feel my hands on you"), null);
check("'rub my back' (not a known part) is not claimed", m("Missy, rub my back"), null);
check("a name nobody in the room has is not claimed", m("Missy, kiss Bob"), null);

// --- addressee scoping keeps the object -----------------------------------------------------
// Before v0.84.0 a name after a verb opened a new address, so "Missy, kiss Rei" reached Missy's
// matcher as "Missy, kiss" and Rei was gone.
check("a name after an activity verb stays on the line",
	voice.scopeToAddressee("Missy, kiss Rei", ["Missy"], ["Rei"]).text, "Missy, kiss Rei");
check("  and Rei's own client does not read it as addressed to her",
	voice.scopeToAddressee("Missy, kiss Rei", ["Rei"], ["Missy"]), { text: null, scoped: true, ambiguous: false });
check("a non-activity verb still splits (stand Missy)",
	voice.scopeToAddressee("Natalia, stand Missy cum for me", ["Missy"], ["Natalia"]).text, "Missy, cum for me");
check("two subjects, one line: Missy's part keeps its object",
	voice.scopeToAddressee("Missy, kiss Rei. Ella, kneel.", ["Missy"], ["Rei", "Ella"]).text, "Missy, kiss Rei");
// Every single-word verb the grammar knows must be an object verb, or a new verb would bring
// back the lost-name bug for itself alone.
const verbWords = voice.ACTIVITY_VERBS.flatMap((v) =>
	v.re.source.replace(/\\b/g, "").replace(/[()?:]/g, "").split("|")).filter((w) => !w.includes(" "));
check("OBJECT_VERBS covers every activity verb", verbWords.filter((w) => !voice.OBJECT_VERBS.has(w)), []);

// --- the handler ----------------------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
session.forceTrance(HYP, 80, 80);
ALLOWED = {
	[HYP]: { ItemMouth: ["Kiss"], ItemNipples: ["Pinch", "Kiss"] },
	[REI]: { ItemMouth: ["Kiss"], ItemNipples: ["Kiss"], ItemButt: ["Spank"] },
	[ELLA]: { ItemMouth: ["Kiss"] },
	1: { ItemBreast: ["Caress"] },
};

reset();
say("Missy, kiss me.");
check("refused without Made to act", runCalls.length, 0);
check("  and the hypnotist is told which permission", /"Made to act"/.test(lastReport()), true);

storage.setFeature("compelActivity", true);
check("Made to touch others is off by default", storage.getFeatures().compelTouchOthers, false);

reset();
say("Missy, kiss me.");
check("kiss me lands on the hypnotist's lips, by the subject", lastRun(), { actor: 1, acted: HYP, activity: "Kiss", group: "ItemMouth" });
reset();
say("Missy, kiss GameBot.");
check("naming the hypnotist is the same as 'me' (no extra tick needed)", lastRun()?.acted, HYP);

reset();
say("Missy, kiss Rei.");
check("someone else needs Made to touch others", runCalls.length, 0);
check("  and the hypnotist is told which permission", /"Made to touch others"/.test(lastReport()), true);

storage.setFeature("compelTouchOthers", true);
reset();
say("Missy, kiss Rei.");
check("kiss Rei lands on Rei's lips", lastRun(), { actor: 1, acted: REI, activity: "Kiss", group: "ItemMouth" });
reset();
say("Missy kiss Rei's nipples");
check("kiss Rei's nipples lands on her nipples", lastRun(), { actor: 1, acted: REI, activity: "Kiss", group: "ItemNipples" });
reset();
say("Missy, spank Rei.");
check("spank with no part defaults to the bottom", lastRun(), { actor: 1, acted: REI, activity: "Spank", group: "ItemButt" });
reset();
say("Missy, kiss Ella.");
check("a nickname resolves", lastRun()?.acted, ELLA);
reset();
say("Missy, kiss Ellanora.");
check("so does the full name", lastRun()?.acted, ELLA);

// --- BC decides about the target ----------------------------------------------------------
reset();
say("Missy, spank Ella.");
check("BC does not offer it on her → nothing runs", runCalls.length, 0);
check("  and a third party's refusal carries NO reason", lastReport(), '[command] "spank" didn\'t land.');

reset();
rei.AllowItem = false;
say("Missy, kiss Rei.");
check("BC item permission refuses even where the activity is offered", runCalls.length, 0);
check("  still with no reason for a third party", lastReport(), '[command] "kiss" didn\'t land.');
delete rei.AllowItem;

reset();
globalThis.ServerChatRoomGetAllowItem = (_s, t) => t.MemberNumber !== REI;
say("Missy, kiss Rei.");
check("BC's own item-permission function is honoured too", runCalls.length, 0);
reset();
say("Missy, kiss Ella.");
check("  and only refuses whom it says", lastRun()?.acted, ELLA);
delete globalThis.ServerChatRoomGetAllowItem;

// --- the hypnotist's OWN refusals name the cause ------------------------------------------
reset();
hyp.ArousalSettings.Active = "Inactive";
ALLOWED[HYP].ItemMouth = [];
say("Missy, kiss me.");
check("own arousal Inactive: nothing runs", runCalls.length, 0);
check("  and the hypnotist hears it is their own setting", /Inactive/.test(lastReport()), true);
hyp.ArousalSettings.Active = "Hybrid";

reset();
globalThis.PreferenceGetArousalZone = (c, g) => ({ Name: g, Factor: c.MemberNumber === HYP && g === "ItemMouth" ? 0 : 2 });
say("Missy, kiss me.");
check("own zone set to no: named", /lips set to no/.test(lastReport()), true);
delete globalThis.PreferenceGetArousalZone;

reset();
hyp.AllowItem = false;
say("Missy, kiss me.");
check("own item permission: named", /item permissions/.test(lastReport()), true);
delete hyp.AllowItem;

reset();
say("Missy, kiss me.");
check("no cause found: a list of where to look, not a guess", /something blocks it in BC/.test(lastReport()), true);
ALLOWED[HYP].ItemMouth = ["Kiss"];

// --- refusals that are ours ---------------------------------------------------------------
reset();
say("Missy, kiss Sam.");
check("two people answer to the name → refused, nobody touched", runCalls.length, 0);
check("  and said", /more than one person/.test(lastReport()), true);

reset();
say("Missy, tickle Rei.");
check("a verb with no obvious spot asks for a part", runCalls.length, 0);
check("  and says so", /Name a part/.test(lastReport()), true);

reset();
say("Missy, kiss Rei's cheek.");
check("an unknown part does not fall back to the lips", runCalls.length, 0);
check("  and says so", /don't know "cheek"/.test(lastReport()), true);

reset();
say("kiss Rei");
check("the subject's name is still required", runCalls.length, 0);

reset();
effects.removeEffect("Freeze"); // our own freeze off first (v0.90.2: held in our record too)
emoticon.Property.Effect = []; realItemEffects = ["Freeze"]; CharacterLoadEffect(Player);
say("Missy, kiss Rei.");
check("a real restraint's freeze stops it", runCalls.length, 0);
realItemEffects = []; CharacterLoadEffect(Player);

reset();
say("Missy, touch your breasts.");
check("the self grammar still works", lastRun(), { actor: 1, acted: 1, activity: "Caress", group: "ItemBreast" });

reset();
say("Missy, kiss Rei. Ella, kneel.");
check("a two-subject line still reaches Missy's part whole", lastRun()?.acted, REI);

// --- not into a trigger yet ---------------------------------------------------------------
storage.setFeature("triggerControl", true);
storage.setDepthOverride("triggerControl", "drifting");
say("Missy, your trigger word is sleepy.");
reset();
say("Missy, kiss Rei.");
check("while recording a trigger it is refused, not recorded or performed", runCalls.length, 0);
check("  and said", /Not recorded/.test(lastReport()), true);
triggers_cancel: {
	const { triggers } = await import("./harness-bundle.mjs");
	triggers.cancelRecording();
}
storage.setDepthOverride("triggerControl", "deep");

// --- depth -------------------------------------------------------------------------------
session.safeword();
session.forceTrance(HYP, 10, 10);
reset();
say("Missy, kiss Rei.");
check("too shallow: refused for depth", runCalls.length, 0);
check("  named as a depth refusal", /needs Yielding/.test(lastReport()), true);

// --- no session, no command ---------------------------------------------------------------
session.safeword();
reset();
say("Missy, kiss Rei.");
check("no session → nothing runs", runCalls.length, 0);

session.safeword();
console.log(`touch-others: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
