// More movements (v1.16.5, DW 2026-11-22: "Build that group"). BC's own activities that move her
// rather than touch: Wiggle (hips, breasts and most of the body, on herself only), Nod, Struggle
// (while bound), the gagged sounds; and on someone else Cuddle, Kick, PoliteKiss, HandGag and
// CollarGrab. Plus more of her face: frown, sad, wince, eyebrows, drool and tears.
//
// The grammar is pure and tested directly; the handler is driven through handleSpokenLine with BC's
// activity calls stubbed PER CHARACTER, so we assert the right activity on the right zone of the
// right person reaches ActivityRun, and that BC's answer is what decides.
const HYP = 246108;
const REI = 300;

let ALLOWED = {}; // memberNumber -> { groupName: [activityName] }
const runCalls = [];
globalThis.ActivityAllowedForGroup = (char, groupName) =>
	((ALLOWED[char?.MemberNumber] || {})[groupName] || []).map((name) => ({ Activity: { Name: name }, Group: groupName }));
globalThis.AssetGroupGet = (_family, groupName) => ({ Name: groupName });
globalThis.ActivityRun = (actor, acted, groupObj, itemActivity) =>
	runCalls.push({ acted: acted?.MemberNumber, activity: itemActivity?.Activity?.Name, group: groupObj?.Name });

const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
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
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect]);
globalThis.ActivityOrgasmPrepare = () => {};
globalThis.ActivityOrgasmStart = () => {};
globalThis.ActivitySetArousal = () => {};
globalThis.ChatRoomCharacter = [Player, hyp, rei];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };

const { voice, storage, session } = await import("./harness-bundle.mjs");
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
const act = (l) => voice.matchActivityCommand(l);
const aim = (l) => voice.matchTargetedActivityCommand(l, ["GameBot", "Rei"]);

// --- the self grammar, pure -------------------------------------------------------------------
check("wiggle your hips", act("Missy, wiggle your hips"), { kind: "part", activity: "Wiggle", word: "hips" });
check("shake your breasts", act("Missy, shake your breasts"), { kind: "part", activity: "Wiggle", word: "breasts" });
check("sway / jiggle / bounce", ["sway your hips", "jiggle your butt", "bounce your chest"].map((l) => act(`Missy, ${l}`)?.activity), ["Wiggle", "Wiggle", "Wiggle"]);
check("shake must sit by the part (patter is not a wiggle)", act("Missy, feel your body shake as your hips relax")?.activity === "Wiggle", false);
check("bare wiggle", act("Missy, wiggle for me"), { kind: "bare", key: "wiggle" });
check("shake it", act("Missy, shake it"), { kind: "bare", key: "wiggle" });
check("wiggle three times", act("Missy, wiggle your hips three times"), { kind: "part", activity: "Wiggle", word: "hips", times: 3 });
check("nod", act("Missy, nod"), { kind: "bare", key: "nod" });
check("nod your head", act("Missy, nod your head"), { kind: "bare", key: "nod" });
check("'nod off' is drifting, not nodding", act("Missy, nod off now"), null);
check("'a nod' is a noun", act("Missy, give me a nod"), null);
check("struggle", act("Missy, struggle"), { kind: "bare", key: "struggle" });
check("fight your bonds", act("Missy, fight your bonds"), { kind: "bare", key: "struggle" });
check("'the more you struggle' is patter", act("Missy, the more you struggle the deeper you go"), null);
check("'struggle to wake' is patter", act("Missy, struggle to wake"), null);
check("'do not struggle' is no command", act("Missy, do not struggle"), null);
check("the gagged sounds", ["moan", "whimper", "groan", "giggle", "growl", "mumble"].map((w) => act(`Missy, ${w}`)?.key), ["moan", "whimper", "groan", "giggle", "growl", "mumble"]);
check("talk through your gag", act("Missy, talk through your gag"), { kind: "bare", key: "mumble" });
check("cover your mouth", act("Missy, cover your mouth"), { kind: "part", activity: "HandGag", word: "mouth" });
check("put your hand over your mouth", act("Missy, put your hand over your mouth")?.activity, "HandGag");
check("'cover your breasts' is not a hand gag", act("Missy, cover your breasts")?.activity === "HandGag", false);
check("grab your collar", act("Missy, grab your collar"), { kind: "part", activity: "CollarGrab", word: "collar" });
check("'grab your breasts' is not a collar grab", act("Missy, grab your breasts")?.activity === "CollarGrab", false);
check("hug is others only", act("Missy, hug your arms")?.activity === "Cuddle", false);
check("kick is others only", act("Missy, kick your legs")?.activity === "Kick", false);
check("peck your hand", act("Missy, peck your hand"), { kind: "part", activity: "PoliteKiss", word: "hand" });
check("old verbs unchanged", act("Missy, pinch your nipples"), { kind: "part", activity: "Pinch", word: "nipples" });

// --- aimed at someone, pure --------------------------------------------------------------------
check("hug Rei (arms by default)", aim("Missy, hug Rei"), { activity: "Cuddle", target: "rei", word: "arms" });
check("cuddle me", aim("Missy, cuddle me"), { activity: "Cuddle", target: "me", word: "arms" });
check("nuzzle me (the nose)", aim("Missy, nuzzle me"), { activity: "Cuddle", target: "me", word: "nose" });
check("kick me (legs)", aim("Missy, kick me"), { activity: "Kick", target: "me", word: "legs" });
check("kick Rei's bottom", aim("Missy, kick Rei's bottom"), { activity: "Kick", target: "rei", word: "bottom" });
check("grab Rei by the collar", aim("Missy, grab Rei by the collar"), { activity: "CollarGrab", target: "rei", word: "collar" });
check("grab my collar", aim("Missy, grab my collar"), { activity: "CollarGrab", target: "me", word: "collar" });
check("grab me", aim("Missy, grab me"), { activity: "CollarGrab", target: "me", word: "collar" });
check("'grab me a drink' is not a collar grab", aim("Missy, grab me a drink"), null);
check("hand gag Rei", aim("Missy, hand gag Rei"), { activity: "HandGag", target: "rei", word: "mouth" });
check("cover my mouth", aim("Missy, cover my mouth"), { activity: "HandGag", target: "me", word: "mouth" });
check("put your hand over Rei's mouth", aim("Missy, put your hand over Rei's mouth"), { activity: "HandGag", target: "rei", word: "mouth" });
check("'cover me' is not a hand gag", aim("Missy, cover me"), null);
check("'cover Rei's eyes' is claimed by nothing", aim("Missy, cover Rei's eyes"), null);
check("peck my hand", aim("Missy, peck my hand"), { activity: "PoliteKiss", target: "me", word: "hand" });
check("peck Rei (the hand)", aim("Missy, peck Rei"), { activity: "PoliteKiss", target: "rei", word: "hand" });
check("'shake Rei's hand' is not aimed (wiggle is hers only)", aim("Missy, shake Rei's hand"), null);
check("kiss my hand is still a kiss, now on the hand", aim("Missy, kiss my hand"), { activity: "Kiss", target: "me", word: "hand" });
check("the name after the verb is kept (hug Rei)", voice.matchTargetedActivityCommand("Missy, hug Rei", ["Rei"])?.target, "rei");

// --- what a trigger list says ---------------------------------------------------------------------
check("describe a bare move", voice.describeAction("act:bare:nod"), "you nod");
check("describe a repeated wiggle", voice.describeAction("act:Wiggle:hips*2"), "you wiggle your hips 2 times");
check("describe a hand gag", voice.describeAction("act:HandGag:mouth"), "you put a hand over your mouth");
check("describe a massage (was 'massagehands')", voice.describeAction("act:MassageHands:shoulders"), "you massage your shoulders");

// --- the face, pure --------------------------------------------------------------------------
const sug = (l) => voice.matchSuggestion(l);
check("frown", sug("Missy, frown"), "frown");
check("'don't frown' is not a frown", sug("Missy, don't frown") === "frown", false);
check("look sad", sug("Missy, look sad"), "mouth-sad");
check("wince", sug("Missy, wince"), "wince");
check("raise an eyebrow (one)", sug("Missy, raise an eyebrow"), "brow-raise");
check("raise your eyebrows (both)", sug("Missy, raise your eyebrows"), "brows-raised");
check("furrow your brow", sug("Missy, furrow your brow"), "brows-furrow");
check("drool for me", sug("Missy, drool for me"), "drool");
check("cry for me", sug("Missy, cry for me"), "tears");
check("tears roll down your cheeks", sug("Missy, tears roll down your cheeks"), "tears");
check("'cry out' is not tears", sug("Missy, cry out my name") === "tears", false);
check("dry your eyes", sug("Missy, dry your eyes"), "face-dry");
check("wipe your mouth", sug("Missy, wipe your mouth"), "face-dry");

// --- the handler --------------------------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
session.forceTrance(HYP, 80, 80);
storage.setFeature("compelActivity", false);
reset();
ALLOWED = { 1: { ItemPelvis: ["Wiggle"] } };
say("Missy, wiggle your hips.");
check("refused without Made to Act", runCalls.length, 0);
storage.setFeature("compelActivity", true);

reset();
say("Missy, wiggle your hips.");
check("wiggle your hips: BC's Wiggle on her pelvis", lastRun(), { acted: 1, activity: "Wiggle", group: "ItemPelvis" });
reset();
ALLOWED = { 1: { ItemButt: ["Wiggle"] } };
say("Missy, wiggle.");
check("bare wiggle: the bottom when the hips won't", lastRun(), { acted: 1, activity: "Wiggle", group: "ItemButt" });
reset();
ALLOWED = { 1: { ItemHead: ["Nod"] } };
say("Missy, nod.");
check("nod: BC's Nod on her head", lastRun(), { acted: 1, activity: "Nod", group: "ItemHead" });
reset();
ALLOWED = { 1: {} };
say("Missy, struggle.");
check("struggle untied: nothing runs", runCalls.length, 0);
check("  and the hypnotist is told why", /nothing tying/.test(lastReport()), true);
reset();
ALLOWED = { 1: { ItemLegs: ["StruggleLegs"] } };
say("Missy, struggle.");
check("struggle with her legs tied", lastRun(), { acted: 1, activity: "StruggleLegs", group: "ItemLegs" });
reset();
ALLOWED = { 1: {} };
say("Missy, whimper.");
check("whimper ungagged: nothing runs", runCalls.length, 0);
check("  and the hypnotist is told it needs a gag", /through a gag/.test(lastReport()), true);
reset();
ALLOWED = { 1: { ItemMouth: ["MoanGagWhimper"] } };
say("Missy, whimper.");
check("whimper gagged", lastRun(), { acted: 1, activity: "MoanGagWhimper", group: "ItemMouth" });
reset();
ALLOWED = { 1: {} };
say("Missy, moan for me.");
check("moan ungagged: no activity (the moan face, as before)", runCalls.length, 0);
check("  and no gag complaint", lastReport(), "");
reset();
ALLOWED = { 1: { ItemMouth: ["MoanGag"] } };
say("Missy, moan for me.");
check("moan gagged: BC's MoanGag", lastRun(), { acted: 1, activity: "MoanGag", group: "ItemMouth" });
reset();
ALLOWED = { 1: { ItemMouth: ["HandGag"] } };
say("Missy, cover your mouth.");
check("cover your mouth: her own hand", lastRun(), { acted: 1, activity: "HandGag", group: "ItemMouth" });

// On the hypnotist (Made to Act is enough) and on Rei (needs Made to touch others).
reset();
ALLOWED = { [HYP]: { ItemArms: ["Cuddle"] } };
say("Missy, hug me.");
check("hug me: Cuddle on the hypnotist's arms", lastRun(), { acted: HYP, activity: "Cuddle", group: "ItemArms" });
reset();
ALLOWED = { [REI]: { ItemNeck: ["CollarGrab"] } };
storage.setFeature("compelTouchOthers", false);
say("Missy, grab Rei by the collar.");
check("grab Rei refused without Made to touch others", runCalls.length, 0);
storage.setFeature("compelTouchOthers", true);
say("Missy, grab Rei by the collar.");
check("grab Rei by the collar: CollarGrab on Rei's neck", lastRun(), { acted: REI, activity: "CollarGrab", group: "ItemNeck" });
reset();
ALLOWED = { [REI]: { ItemLegs: ["Kick"] } };
say("Missy, kick Rei.");
check("kick Rei: their legs", lastRun(), { acted: REI, activity: "Kick", group: "ItemLegs" });
reset();
ALLOWED = { [REI]: {} };
say("Missy, hand gag Rei.");
check("BC says no on Rei: nothing runs", runCalls.length, 0);
check("  and only 'didn't land' (nothing about Rei's settings)", lastReport(), `[command] "put a hand over" didn't land.`);

// A trigger replays a bare move.
storage.setFeature("triggerControl", true);
storage.forgetAllTriggers();
say("Missy, your trigger word is wigglebug.");
say("Missy, wiggle.");
say("Missy, remember trigger.");
session.safeword();
reset();
ALLOWED = { 1: { ItemPelvis: ["Wiggle"] } };
say("wigglebug");
check("a trigger replays the wiggle", lastRun(), { acted: 1, activity: "Wiggle", group: "ItemPelvis" });
storage.forgetAllTriggers();

session.safeword();
console.log(`movements: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
