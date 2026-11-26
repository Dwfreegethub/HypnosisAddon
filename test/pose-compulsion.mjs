// Pose compulsions (v1.19.7, DW 2026-11-26): "whenever you kneel", "whenever you raise your arms",
// "whenever Rei puts you on all fours". Anyone moving her counts, she herself included; ECHS's own
// posing never does (DW: "I dont think a echs action should trigger it").
//
// Failure looks like: a wording not read as its pose; the wrong pose setting one off; ECHS's own kneel
// setting one off; a change the hold refused (nothing changed) setting one off; a named watch going
// off for someone else; or one going off while she is under or out of a room.
const HYP = 246108, REI = 999, ZED = 777;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, IsPlayer: () => true,
	ActivePose: [], PoseMapping: { BodyLower: "BaseLower", BodyUpper: "BaseUpper" }, AllowedActivePoseMapping: {},
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: ZED, Name: "Zed" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
let inRoom = true;
globalThis.ServerPlayerIsInChatRoom = () => inRoom;
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
globalThis.CharacterRefresh = () => {};
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};
globalThis.InventoryGet = () => null;
let arousal = [];
globalThis.ActivitySetArousal = (C, p) => { arousal.push(p); C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;

// BC's pose call, as the hooks see it: the category is set in PoseMapping (and ActivePose).
const CAT = { BaseLower: "BodyLower", Kneel: "BodyLower", KneelingSpread: "BodyLower", Spread: "BodyLower", LegsClosed: "BodyLower", BaseUpper: "BodyUpper", OverTheHead: "BodyUpper", Yoked: "BodyUpper", BackBoxTie: "BodyUpper", AllFours: "BodyFull", Hogtied: "BodyFull" };
const bcSetPose = (C, pose) => {
	if (pose == null) { C.PoseMapping = { BodyLower: "BaseLower", BodyUpper: "BaseUpper" }; C.ActivePose = []; return; }
	const cat = CAT[pose];
	if (cat === "BodyFull") C.PoseMapping = { BodyFull: pose };
	else { delete C.PoseMapping.BodyFull; C.PoseMapping[cat] = pose; }
	C.ActivePose = Object.values(C.PoseMapping);
};
const hooks = {};
const modApi = { hookFunction: (name, _p, fn) => { (hooks[name] ??= []).push(fn); } };
const call = (name, args, inner) => (hooks[name] ?? []).reduceRight((next, fn) => (a) => fn(a, next), inner)(args);
globalThis.CharacterSetActivePose = (C, pose) => call("CharacterSetActivePose", [C, pose], ([c, p]) => bcSetPose(c, p));

const { voice, storage, session, timers, effects, poseWatch } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let clock = Date.now();
Date.now = () => clock;
for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "arousalControl", "postureControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(10);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
const plant = (lines) => { session.forceTrance(HYP, 80, 80); for (const l of lines) say(l); say("Missy, remember trigger"); session.wakeByHypnotist(HYP); drainPaced(); clock += 60_000; };
const only = () => storage.listTriggers().find((t) => t.fireOn);
const tick = async () => { await Promise.resolve(); await Promise.resolve(); drainPaced(); };
const reset = async () => {
	session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); drainPaced(); await tick();
	bcSetPose(Player, null); poseWatch.settlePose("adopt"); arousal = []; clock += 60_000; inRoom = true;
};
poseWatch.installPoseWatch(modApi);
// Her own click on the kneel button / pose menu: PoseSetActive on her client.
const herPose = async (pose) => { call("PoseSetActive", [Player, pose], ([c, p]) => bcSetPose(c, p)); await tick(); };
// Another player kneeling her: their client syncs her whole character.
const theirPose = async (by, pose) => { call("ChatRoomSyncSingle", [{ Character: { MemberNumber: 1 }, SourceMemberNumber: by }], () => bcSetPose(Player, pose)); await tick(); };

// --- the wording ------------------------------------------------------------------------------------
const act = (line) => { const c = voice.parseCondition(line); return c?.fireOn === "act" ? `${c.who}:${c.act}` : null; };
check("parse: no doer is anyone", [
	act("Missy, whenever you kneel, you are very aroused"), act("Missy, when you get on your knees, you blush"), act("Missy, whenever you stand up, you blush"),
	act("Missy, whenever you get on all fours, you blush"), act("Missy, whenever you are hogtied, you blush"), act("Missy, whenever you spread your legs, you blush"),
	act("Missy, whenever you close your legs, you blush"), act("Missy, whenever you put your arms behind your back, you blush"), act("Missy, whenever you raise your arms, you blush"),
	act("Missy, whenever you hold your arms out, you blush"), act("Missy, whenever you lower your arms, you blush"), act("Missy, whenever you move, you blush"),
], [
	"anyone:pose-kneel", "anyone:pose-kneel", "anyone:pose-stand", "anyone:pose-allfours", "anyone:pose-hogtied", "anyone:pose-spread",
	"anyone:pose-closed", "anyone:pose-arms-back", "anyone:pose-arms-up", "anyone:pose-arms-out", "anyone:pose-arms-down", "anyone:pose-any",
]);
check("parse: a doer", [act("Missy, whenever Rei makes you kneel, you blush"), act("Missy, whenever anyone puts your arms behind your back, you blush"), act("Missy, when I put you on all fours, you blush"), act("Missy, whenever anyone pulls your arms behind your back, you blush")],
	["rei:pose-kneel", "anyone:pose-arms-back", "i:pose-allfours", "anyone:pose-arms-back"]);
check("parse: the old ones still read the same", [act("Missy, whenever anyone pulls your hair, you blush"), act("Missy, whenever anyone kisses you, you blush"), act("Missy, whenever you take your top off, you blush")], ["anyone:pull", "anyone:kiss", "anyone:off-top"]);

// --- the states -------------------------------------------------------------------------------------
const st = (m) => [...poseWatch.poseStatesOf(m)].sort();
check("states", [st({ BodyLower: "Kneel", BodyUpper: "BaseUpper" }), st({ BodyLower: "KneelingSpread", BodyUpper: "BackBoxTie" }), st({ BodyFull: "AllFours" }), st({})],
	[["arms-down", "kneel"], ["arms-back", "kneel", "legs-spread"], ["allfours"], ["arms-down", "stand"]]);
check("changes: newly come into, else changed", [
	poseWatch.poseChanges({ BodyLower: "BaseLower" }, { BodyLower: "Kneel" }), poseWatch.poseChanges({ BodyLower: "KneelingSpread" }, { BodyLower: "Kneel" }), poseWatch.poseChanges({ BodyLower: "Kneel" }, { BodyLower: "Kneel" }),
], [["pose:kneel"], ["pose:changed"], []]);

// --- she kneels -------------------------------------------------------------------------------------
await reset();
plant(["Missy, whenever you kneel, you are very aroused"]);
check("planted, read as hers", [only()?.act, only()?.watchName], ["pose-kneel", "*"]);
await herPose("Kneel");
check("she kneels: it goes off", arousal.length, 1);
clock += 60_000;
await herPose("BaseLower");
check("standing up is not kneeling", arousal.length, 1);
clock += 60_000;
await theirPose(REI, "Kneel");
check("Rei kneels her: it goes off too", arousal.length, 2);
clock += 60_000;
await herPose("Kneel");
check("already kneeling: nothing new", arousal.length, 2);

// --- ECHS never sets it off -------------------------------------------------------------------------
await reset();
plant(["Missy, whenever you kneel, you are very aroused"]);
check("ECHS's own kneel took", effects.setSuggestedPose("Kneel"), true);
await tick();
check("ECHS kneels her: nothing", arousal.length, 0);
clock += 60_000;
effects.setSuggestedPose(null);
await tick();
await herPose("Kneel");
check("then she kneels herself: it goes off", arousal.length, 1);
// A word trigger that kneels her: the trigger's pose is ECHS's.
await reset();
plant(["Missy, whenever you kneel, you are very aroused"]);
session.forceTrance(HYP, 80, 80); say("Missy, your trigger word is down girl"); say("Missy, kneel"); say("Missy, remember trigger"); session.wakeByHypnotist(HYP); drainPaced(); clock += 60_000;
await tick();
arousal = [];
say("down girl");
await tick();
check("a trigger that kneels her: it kneels her", Player.PoseMapping.BodyLower, "Kneel");
check("  and the pose compulsion stays quiet", arousal.length, 0);

// --- a change the hold refused is no change ---------------------------------------------------------
await reset();
plant(["Missy, whenever you kneel, you are very aroused"]);
// effects.ts's hold is the OUTER hook: it puts her back after BC (and the hooks inside it) applied
// the change, in the same call, before anything else runs.
call("ChatRoomSyncSingle", [{ Character: { MemberNumber: 1 }, SourceMemberNumber: REI }], () => bcSetPose(Player, "Kneel"));
bcSetPose(Player, "BaseLower");
await tick();
check("moved and put back in one go: nothing", arousal.length, 0);

// --- a name means only them --------------------------------------------------------------------------
await reset();
plant(["Missy, whenever Rei makes you kneel, you are very aroused"]);
await theirPose(ZED, "Kneel");
check("Zed kneels her: not Rei", arousal.length, 0);
await reset();
plant(["Missy, whenever Rei makes you kneel, you are very aroused"]);
await herPose("Kneel");
check("she kneels herself: not Rei", arousal.length, 0);
await reset();
plant(["Missy, whenever Rei makes you kneel, you are very aroused"]);
await theirPose(REI, "Kneel");
check("Rei kneels her: it goes off", arousal.length, 1);

// --- arms, and any move -----------------------------------------------------------------------------
await reset();
plant(["Missy, whenever you raise your arms, you are very aroused"]);
await herPose("Kneel");
check("kneeling is not raising her arms", arousal.length, 0);
await herPose("OverTheHead");
check("arms up: it goes off", arousal.length, 1);
await reset();
plant(["Missy, whenever you move, you are very aroused"]);
await herPose("Spread");
check("any move: it goes off", arousal.length, 1);

// --- holds while you kneel (v1.19.8) ------------------------------------------------------------------
await reset();
toHyp = [];
plant(["Missy, whenever you kneel, you are very aroused", "Missy, this trigger holds while you kneel"]);
check("stored as holding while in the pose", only()?.whileWorn, true);
check("  the hypnotist was told how it lets go", /holds while they stay that way \(kneel\) and lets go when they move out of it/.test(toHyp.join(" ")), true);
check("  listed with its tag", /holds while in the pose/.test(voice.triggerRow(only(), false)), true);
await herPose("Kneel");
check("she kneels: it fires and holds", [arousal.length, voice.isTriggerInEffect(only()), only()?.wornHold?.pose], [1, true, "kneel"]);
clock += 2.5 * 60_000;
voice.checkWornHolds();
check("still kneeling after 2.5 minutes: the arousal comes back", arousal.length, 2);
await herPose("KneelingSpread");
check("kneeling spread is still kneeling: holds", voice.isTriggerInEffect(only()), true);
said = [];
await herPose("BaseLower");
check("she stands: it lets go at once", [voice.isTriggerInEffect(only()), only()?.wornHold], [false, undefined]);
check("  and she is told", said.some((l) => /As you move out of it/.test(l)), true);
clock += 60_000;
await theirPose(REI, "Kneel");
check("Rei kneels her again: holds again", voice.isTriggerInEffect(only()), true);
effects.setSuggestedPose(null);
await tick();
check("ECHS standing her up lets it go too", voice.isTriggerInEffect(only()), false);
// The wordings.
const opt = (line) => voice.parseTriggerControl(line)?.option?.kind ?? null;
check("wordings", ["Missy, this trigger holds while you kneel", "Missy, this trigger holds while you stay like that", "Missy, it lasts until you stand up", "Missy, this trigger holds as long as you stay on your knees", "Missy, this trigger holds while your arms stay up".replace("your arms stay up", "you keep your arms up")].map(opt), ["whileWorn", "whileWorn", "whileWorn", "whileWorn", "whileWorn"]);
// Arms: lets go when they come down.
await reset();
plant(["Missy, whenever you raise your arms, you are very aroused", "Missy, this trigger holds while you stay like that"]);
await herPose("OverTheHead");
check("arms up: holds", voice.isTriggerInEffect(only()), true);
await herPose("Kneel");
check("kneeling with arms still up: holds", voice.isTriggerInEffect(only()), true);
await herPose("BaseUpper");
check("arms down: lets go", voice.isTriggerInEffect(only()), false);
// "you move" has no pose to stay in.
await reset();
toHyp = [];
plant(["Missy, whenever you move, you are very aroused", "Missy, this trigger holds while you stay like that"]);
check("on \"you move\": ignored, and says why", [/has no pose to stay in/.test(toHyp.join(" ")), only()?.whileWorn], [true, undefined]);

// --- not while under, not out of a room --------------------------------------------------------------
await reset();
plant(["Missy, whenever you kneel, you are very aroused"]);
session.forceTrance(HYP, 80, 80);
await herPose("Kneel");
check("under: nothing", arousal.length, 0);
session.wakeByHypnotist(HYP); drainPaced();
await herPose("BaseLower");
inRoom = false;
clock += 60_000;
await herPose("Kneel");
check("out of a room: nothing", arousal.length, 0);

console.log(`pose-compulsion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
