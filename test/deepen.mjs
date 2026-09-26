// "Sink deeper", v0.95.0 (DW, 2026-09-26, from job.md).
//
// The hypnotist takes her one tier deeper mid-trance. DW's decisions: one tier per success, never
// past HER "deepest I go" setting (default Entranced); FULL depth only, so earned depth and the
// Deep-tier features it gates do not move; the chance is her trust + their skill + time in trance
// + her induction choice - the tier being entered, 10-95; her spent trust gift makes it certain;
// 60 seconds AND a landed suggestion between tries; the hypnotist sees bands, never the tier.
// Every block states what failure looks like.
const HYP = 246108, REI = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "Eri" }, { MemberNumber: REI, Name: "Rei" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
let room = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = (t) => room.push(t);
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
let clock = 1_000_000;
Date.now = () => clock;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const { voice, storage, session, timers, depth, messaging } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "postureControl", "triggerControl", "movementRestriction", "suppressClothing"]) storage.setFeature(k, true);
storage.setFeature("tranceCannotMove", false);
const say = (line, who = HYP) => { toHyp = []; room = []; said = []; voice.handleSpokenLine(who, line); };
const tier = () => depth.tierOf(depth.currentDepth());
const lastHyp = () => toHyp.join(" | ");
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); clock += 20 * 60_000; storage.setRelationshipOverride(HYP, null); };
const under = (d = 25) => session.forceTrance(HYP, d, d);
const later = (s = 61) => { clock += s * 1000; };

// Never chosen: Entranced. Failure: deepening wide open, or shut, on a fresh install.
check("the default is Entranced", storage.getDeepestTier(), "entranced");

// --- the wordings -------------------------------------------------------------------------------------
// Failure: one of the brief's phrases missed, or a negated or unrelated line read as one.
for (const [line, want] of [
	["Missy, sink deeper", true],
	["Missy, go deeper", true],
	["drop deeper, Missy", true],
	["Missy, fall deeper", true],
	["Missy, deeper and deeper", true],
	["Missy, sleep deeper", true],
	["Missy, relax deeper", true],
	["Missy, let go deeper", true],
	["Missy, sink even deeper now", true],
	["Missy, drift deeper into trance", true],
	["Missy, don't go any deeper", false],
	["Missy, do not sink deeper", false],
	["Missy, don't stop, go deeper", true],
	["Missy, the water is deeper here", false],
	["Missy, kneel", false],
]) check(`"${line}"`, voice.isDeepeningLine(line), want);

// --- a success: one tier, full depth only, bands to the hypnotist ------------------------------------
// Failure: more than one tier, earned depth moving, or the tier name leaking to the hypnotist.
reset();
under(25); // Yielding
Math.random = () => 0;
say("Missy, sink deeper");
check("Yielding → Entranced", tier(), "entranced");
check("  a full step is a tier's width: 25 → 45", depth.currentDepth(), 45);
check("  earned depth untouched", depth.currentDepthEarned(), 25);
check("  the hypnotist is told, in a band", /\[deepen\] It takes\. They are deeply under\./.test(lastHyp()), true);
check("  never the tier name", /entranced/i.test(lastHyp()), false);
check("  she feels it", said.length > 0, true);
check("  the room sees a tell", room.length, 1);

// --- the pace: 60 seconds AND a suggestion that landed -----------------------------------------------
// Failure: back-to-back deepening, or the command rule not enforced.
storage.setDeepestTier("blank");
say("Missy, sink deeper");
check("straight away: still settling", [tier(), /still settling/.test(lastHyp())], ["entranced", true]);
later();
say("Missy, sink deeper");
check("a minute on, but no command since: refused", [tier(), /suggestion to follow first/.test(lastHyp())], ["entranced", true]);
say("Missy, you cannot move");
say("Missy, sink deeper");
check("after a landed command: Deep", tier(), "deep");
check("  earned still 25: the Deep-tier features stay shut", [depth.currentDepthEarned(), depth.depthAllows("triggerControl")], [25, false]);
later();
say("Missy, you cannot move");
say("Missy, sink deeper");
check("and on to Blank", tier(), "blank");
later();
say("Missy, you cannot move");
say("Missy, sink deeper");
check("Blank is the bottom", [tier(), /as deep as they let themselves go/.test(lastHyp())], ["blank", true]);

// A refused command does not count. Failure: a refusal opens the next deepening.
reset();
storage.setDeepestTier("blank");
under(25);
say("Missy, sink deeper");
later();
storage.setFeature("postureControl", false);
say("Missy, kneel");
say("Missy, sink deeper");
check("a refused command does not count", /suggestion to follow first/.test(lastHyp()), true);
storage.setFeature("postureControl", true);

// --- her ceiling --------------------------------------------------------------------------------------
// Failure: deepened past what she allowed.
reset();
storage.setDeepestTier("entranced");
under(45); // already Entranced
say("Missy, sink deeper");
check("at her ceiling: not deeper, and said", [tier(), /as deep as they let themselves go/.test(lastHyp())], ["entranced", true]);
storage.setDeepestTier("never");
reset();
under(5);
say("Missy, sink deeper");
check("'Never deeper': refused, and said", [tier(), /do not let themselves be taken deeper/.test(lastHyp())], ["drifting", true]);

storage.setDeepestTier("entranced");

// --- a miss ----------------------------------------------------------------------------------------------
// Failure: a miss that still deepens, or says nothing.
reset();
under(25);
Math.random = () => 0.99;
say("Missy, sink deeper");
check("a miss: same tier, hypnotist told", [tier(), /does not take hold/.test(lastHyp())], ["yielding", true]);
check("  nothing for the room", room.length, 0);

// --- the chance ------------------------------------------------------------------------------------------
// Owner: access 65. Failure: a term missing, the tier penalty wrong, or the clamp off.
reset();
storage.setRelationshipOverride(HYP, "owner");
under(25);
check("owner, no time, entering Yielding", session.deepenChance(HYP, "yielding"), 65);
check("  Entranced -10", session.deepenChance(HYP, "entranced"), 55);
check("  Deep -20", session.deepenChance(HYP, "deep"), 45);
check("  Blank -30", session.deepenChance(HYP, "blank"), 35);
later(5 * 60);
check("five minutes under: +10", session.deepenChance(HYP, "blank"), 45);
later(30 * 60);
check("  capped at +20", session.deepenChance(HYP, "blank"), 55);
storage.setRelationshipOverride(HYP, null);
check("a stranger entering Blank: the 10 floor", session.deepenChance(HYP, "blank"), 10);

// Her induction choice counts: Agree +25, Fight -25. Through a real induction, so the choice is hers.
const induce = (choice) => {
	reset();
	storage.setRelationshipOverride(HYP, "owner");
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri" } }] });
	session.answerPrompt(choice);
	Math.random = () => 0;
	for (let i = pending.length - 1; i >= 0; i--) if (pending[i].live && pending[i].ms === 60_000) { pending[i].live = false; pending[i].fn(); break; }
	return session.deepenChance(HYP, "blank");
};
check("Agree at induction: +25", induce("agree"), 60);
check("Fight at induction: -25", induce("fight"), 10);
check("Ignore: neither", induce("ignore"), 35);

// --- her trust gift makes it certain ----------------------------------------------------------------------
reset();
session.giveTrust(HYP, "Eri");
messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri" } }] });
Math.random = () => 0;
for (let i = pending.length - 1; i >= 0; i--) if (pending[i].live && pending[i].ms === 60_000) { pending[i].live = false; pending[i].fn(); break; }
check("trust given: certain", session.deepenChance(HYP, "blank"), 100);

// --- who, and when ----------------------------------------------------------------------------------------
reset();
under(25);
Math.random = () => 0;
say("sink deeper");
check("no name: nothing", tier(), "yielding");
say("Missy, sink deeper", REI);
check("someone else: nothing", tier(), "yielding");
reset();
say("Missy, sink deeper");
check("not under: nothing", depth.currentDepth(), 0);
// Planting a compulsion: "sink deeper" is not something a trigger can hold, and must not deepen now.
// Deep (planting needs it) with room to go, so only the planting path can stop it.
reset();
storage.setDeepestTier("blank");
under(65);
say("Missy, when you hear silver bell, sink deeper");
check("in a compulsion: not deepened now, and told", [tier(), /instant drop/.test(lastHyp())], ["deep", true]);
say("Missy, forget the trigger");
// While recording a trigger, the hypnotist is told the drop is the way. Planting needs Deep.
reset();
under(65);
say("Missy, your trigger word is silver bell");
say("Missy, sink deeper");
check("while recording: not deepened, and told", [tier(), /instant drop/.test(lastHyp())], ["deep", true]);

// --- half steps (v0.96.0) -----------------------------------------------------------------------------
// A roll that misses by less than 20 sinks her 10: no new tier, but two of them make one.
// Failure: a near miss treated as a miss, a half step that changes the tier, or halves that never add up.
const seq = (...v) => { let i = 0; Math.random = () => v[Math.min(i++, v.length - 1)]; };
reset();
storage.setDeepestTier("blank");
storage.setRelationshipOverride(HYP, "owner");
under(25); // owner, ignore, no time: into Entranced 55%
seq(0.6); // 60: a near miss
say("Missy, sink deeper");
check("near miss: half a step, same tier", [depth.currentDepth(), tier()], [35, "yielding"]);
check("  the hypnotist is told it half took", /half takes/.test(lastHyp()), true);
check("  nothing for the room", room.length, 0);
later();
say("Missy, you cannot move");
seq(0.6);
say("Missy, sink deeper");
check("a second half step crosses", [depth.currentDepth(), tier()], [45, "entranced"]);
check("  and is told as a new depth", /Only just.*deeply under/.test(lastHyp()), true);
later();
say("Missy, you cannot move");
seq(0.99);
say("Missy, sink deeper");
check("a clean miss: nothing", [depth.currentDepth(), /does not take hold/.test(lastHyp())], [45, true]);

// --- fighting back up (v0.96.0) -------------------------------------------------------------------------
// Failure: fighting cannot be chosen mid-trance, a miss never surfaces her, she surfaces without
// fighting, or from Drifting she is not woken.
reset();
storage.setDeepestTier("blank");
under(25); // a stranger: into Entranced 10% at best
session.answerPrompt("fight");
check("/hypno fight while under: she is fighting", /choice=fight/.test(session.describeSession()), true);
check("  she is told, privately", said.some((s) => /start fighting/.test(s)) || /start fighting/.test(JSON.stringify(said)), true);
check("  /hypno chance shows the odds", session.describeChances(HYP).some((l) => /fighting back up if it misses: \d+%/.test(l)), true);
seq(0.99, 0); // misses outright, then the push back up lands
say("Missy, sink deeper");
check("fighting, a miss: up a tier", [tier(), depth.currentDepth()], ["drifting", 10]);
check("  the hypnotist is told", /push back up/.test(lastHyp()), true);
check("  the room sees her stir", room.length, 1);
later();
say("Missy, you will not notice being undressed"); // a Drifting suggestion, so it lands
seq(0.99, 0);
say("Missy, sink deeper");
check("from Drifting, fighting up wakes her", [session.isHypnotized(), depth.currentDepth()], [false, 0]);
check("  the hypnotist is told she is awake", /They are awake/.test(lastHyp()), true);
// Her near miss (v0.96.2): a push back that misses by under 20 still brings her up 10.
// Failure: no half step up, a half step that changes the tier, or one past the surface not waking her.
reset();
storage.setDeepestTier("blank");
under(55); // Entranced; a stranger's surface chance there is 25 less a tenth of trust
session.answerPrompt("fight");
const sc = session.surfaceChance(HYP);
seq(0.99, (sc + 10) / 100); // deepening misses outright; push back misses by 10
say("Missy, sink deeper");
check("fighting, a near miss: up 10, same tier", [depth.currentDepth(), tier()], [45, "entranced"]);
check("  the hypnotist is told", /claw back a little/.test(lastHyp()), true);
check("  private", room.length, 0);
later();
say("Missy, you will not notice being undressed");
seq(0.99, (sc + 10) / 100);
say("Missy, sink deeper");
check("a second one crosses up a tier", [depth.currentDepth(), tier()], [35, "yielding"]);
check("  and is told as coming up", /claw their way up/.test(lastHyp()), true);
later();
say("Missy, you will not notice being undressed");
seq(0.99, 0.99);
say("Missy, sink deeper");
check("a push back that misses by more: nothing", depth.currentDepth(), 35);
reset();
under(8);
session.answerPrompt("fight");
seq(0.99, (session.surfaceChance(HYP) + 10) / 100);
say("Missy, sink deeper");
check("near the surface, a half step up wakes her", session.isHypnotized(), false);

// Not fighting: a clean miss never brings her up, whatever the second roll.
reset();
under(25);
seq(0.99, 0);
say("Missy, sink deeper");
check("not fighting: a miss leaves her where she was", tier(), "yielding");
// Deeper is harder to climb out of; trust in them holds her down a little.
reset();
under(25);
session.answerPrompt("fight");
const access = () => session.effectiveAccess(HYP);
check("Yielding: 35 less a tenth of her trust", session.surfaceChance(HYP), 35 - access() * 0.1);
storage.setRelationshipOverride(HYP, "owner");
check("  trusted like an owner: 28.5", session.surfaceChance(HYP), 35 - 65 * 0.1);
reset();
storage.setRelationshipOverride(HYP, "owner");
under(85);
session.answerPrompt("fight");
check("Blank, an owner: the 3 floor", session.surfaceChance(HYP), 3);
storage.setRelationshipOverride(HYP, null);
reset();
under(5);
session.answerPrompt("fight");
check("Drifting: 45 less a tenth of her trust", session.surfaceChance(HYP), 45 - access() * 0.1);
// Their skill takes it down. Honoured skill rides in on a real attempt.
reset();
storage.setSkillHonour("capped");
messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri", skill: 100 } }] });
session.answerPrompt("fight");
seq(0);
for (let i = pending.length - 1; i >= 0; i--) if (pending[i].live && pending[i].ms === 60_000) { pending[i].live = false; pending[i].fn(); break; }
const skilled = session.surfaceChance(HYP);
const SURFACE_NO_SKILL = () => Math.max(3, ({drifting:45,yielding:35,entranced:25,deep:15,blank:8})[tier()] - access() * 0.1);
check("a skilled hypnotist: up to 20 harder to fight up", skilled < SURFACE_NO_SKILL() && skilled >= SURFACE_NO_SKILL() - 20, true);

// --- the safeword --------------------------------------------------------------------------------------------
session.safeword();
check("the safeword: depth back to nothing", depth.currentDepth(), 0);

console.log(`deepen: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
