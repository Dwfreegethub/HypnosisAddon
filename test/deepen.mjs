// "Sink deeper", v0.95.0 (DW, 2026-09-26, from job.md), as reworked by v0.97.0 (trust.md §12).
//
// The hypnotist takes her deeper mid-trance, never past HER "deepest I go" setting (default
// Entranced); FULL depth only, so earned depth and the Deep-tier features it gates do not move; her
// spent trust gift makes it certain; 60 seconds AND a landed suggestion between tries; the
// hypnotist sees bands, never the tier. v0.97.0: the chance is 40 + trust x0.3 + skill x0.25 +
// arousal x0.15 + stance + time + experience x0.15 on Agree - depth x0.3, 10-95; a hit is 15-25
// below 40, 10-15 at 40-69, 5-10 from 70, +5 past trust 60; no half steps. Fighting, she may come
// up 20-30 / 10-15 / 5-10, from a missed deepening or her own /hypno fight, once a minute.
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
// Trust back to 0 too: a landed induction adds some, and every term below reads it (v0.97.0).
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); clock += 20 * 60_000; storage.setRelationshipOverride(HYP, null); storage.setTrustValue(HYP, "Eri", 0); };
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


const seq = (...v) => { let i = 0; Math.random = () => v[Math.min(i++, v.length - 1)]; };
const expCount = () => storage.experienceValue();

// --- a success: full depth only, bands to the hypnotist ------------------------------------------------
// A random of 0 hits, and takes the least of the step. Failure: the step outside 15-25 below 40,
// earned depth moving, no experience for her, or the tier name leaking to the hypnotist.
reset();
storage.setExperienceValue(0);
under(25); // Yielding
Math.random = () => 0;
say("Missy, sink deeper");
check("a hit below 40 is at least 15: 25 → 40", depth.currentDepth(), 40);
check("  Yielding → Entranced", tier(), "entranced");
check("  earned depth untouched", depth.currentDepthEarned(), 25);
check("  she gains experience from it", expCount() > 0, true);
check("  the hypnotist is told, in a band", /\[deepen\] It takes\. They are deeply under\./.test(lastHyp()), true);
check("  never the tier name", /entranced/i.test(lastHyp()), false);
check("  she feels it", said.length > 0, true);
check("  the room sees a tell", room.length, 1);
reset();
under(25);
seq(0, 0.99); // hits, and takes the most of the step
say("Missy, sink deeper");
check("  and at most 25: 25 → 50", depth.currentDepth(), 50);

// --- the pace: 60 seconds AND a suggestion that landed -----------------------------------------------
// Failure: back-to-back deepening, or the command rule not enforced.
reset();
storage.setDeepestTier("blank");
under(25);
Math.random = () => 0;
say("Missy, sink deeper");
say("Missy, sink deeper");
check("straight away: still settling", [depth.currentDepth(), /still settling/.test(lastHyp())], [40, true]);
later();
say("Missy, sink deeper");
check("a minute on, but no command since: refused", [depth.currentDepth(), /suggestion to follow first/.test(lastHyp())], [40, true]);
say("Missy, you cannot move");
say("Missy, sink deeper");
check("after a landed command: 10-15 at 40-69, so 40 → 50", depth.currentDepth(), 50);
check("  earned still 25: the Deep-tier features stay shut", [depth.currentDepthEarned(), depth.depthAllows("triggerControl")], [25, false]);
reset();
storage.setDeepestTier("blank");
under(75);
seq(0, 0.99);
say("Missy, sink deeper");
check("from 70 a hit is 5-10: 75 → 85", depth.currentDepth(), 85);
reset();
storage.setDeepestTier("blank");
under(100);
say("Missy, sink deeper");
check("Blank's bottom is the bottom", [depth.currentDepth(), /as deep as they let themselves go/.test(lastHyp())], [100, true]);

// Trusted past 60 (an owner's 65), a hit goes 5 further. Failure: no bonus, or one for a stranger.
reset();
storage.setRelationshipOverride(HYP, "owner");
under(25);
Math.random = () => 0;
say("Missy, sink deeper");
check("an owner's hit: 15 + 5, 25 → 45", depth.currentDepth(), 45);

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
under(50);
seq(0, 0.99); // 50 + 15 would be 65
say("Missy, sink deeper");
check("inside her ceiling tier, a hit stops at its last point: 50 → 59", [depth.currentDepth(), tier()], [59, "entranced"]);
later();
say("Missy, you cannot move");
say("Missy, sink deeper");
check("at her ceiling: not deeper, and said", [depth.currentDepth(), /as deep as they let themselves go/.test(lastHyp())], [59, true]);
storage.setDeepestTier("never");
reset();
under(5);
say("Missy, sink deeper");
check("'Never deeper': refused, and said", [tier(), /do not let themselves be taken deeper/.test(lastHyp())], ["drifting", true]);

storage.setDeepestTier("entranced");

// --- a miss, and no half steps (v0.97.0) ---------------------------------------------------------------
// Failure: a miss that still deepens, a near miss that moves her, or saying nothing.
reset();
under(25); // a stranger at 25: 40 - 7.5 = 32.5%
seq(0.4); // misses by 7.5, which used to be a half step
say("Missy, sink deeper");
check("a near miss: nothing now", [depth.currentDepth(), /does not take hold/.test(lastHyp())], [25, true]);
check("  nothing for the room", room.length, 0);

// --- the chance ------------------------------------------------------------------------------------------
// Owner: trust 65. Failure: a term missing or mis-weighted, or the clamps off.
reset();
storage.setExperienceValue(0);
storage.setRelationshipOverride(HYP, "owner");
under(25);
check("owner at 25, no time: 40 + 19.5 - 7.5 = 52", session.deepenChance(HYP), 52);
later(5 * 60);
check("five minutes under: +10", session.deepenChance(HYP), 62);
later(30 * 60);
check("  capped at +20", session.deepenChance(HYP), 72);
reset();
storage.setRelationshipOverride(HYP, "owner");
under(85);
check("owner at 85: 40 + 19.5 - 25.5 = 34", session.deepenChance(HYP), 34);
storage.setRelationshipOverride(HYP, null);
check("a stranger at 85: 14.5", session.deepenChance(HYP), 14.5);
reset();
under(100);
check("  and at 100, the 10 floor", session.deepenChance(HYP), 10);
// Her stance: Agree +20, Fight -25. Fighting also struggles, so hold her there (a random of 0.99).
reset();
storage.setRelationshipOverride(HYP, "owner");
under(25);
session.answerPrompt("agree");
check("going along: +20", session.deepenChance(HYP), 72);
Math.random = () => 0.99;
session.answerPrompt("fight");
check("fighting: -25", session.deepenChance(HYP), 27);
session.answerPrompt("ignore");
check("neither", session.deepenChance(HYP), 52);
// Her experience helps only when she goes along. Failure: it helps Ignore or Fight too.
storage.setExperienceValue(40);
check("experience 40, ignoring: nothing", session.deepenChance(HYP), 52);
session.answerPrompt("agree");
check("  going along: +6", session.deepenChance(HYP), 78);
storage.setExperienceValue(0);
// Arousal. Failure: arousal ignored, or counted with the meter off.
session.answerPrompt("ignore");
Player.ArousalSettings.Progress = 100;
check("a full meter: +15", session.deepenChance(HYP), 67);
Player.ArousalSettings.Active = "Manual";
check("  the meter off: nothing", session.deepenChance(HYP), 52);
Player.ArousalSettings.Active = "Hybrid";
Player.ArousalSettings.Progress = 0;

// --- her trust gift makes it certain ----------------------------------------------------------------------
reset();
storage.setRelationshipOverride(HYP, "owner"); // so the induction lands even at the lowest spread
session.giveTrust(HYP, "Eri");
messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri" } }] });
Math.random = () => 0;
for (let i = pending.length - 1; i >= 0; i--) if (pending[i].live && pending[i].ms === 60_000) { pending[i].live = false; pending[i].fn(); break; }
check("trust given: under", session.isHypnotized(), true);
check("  and deepening is certain", session.deepenChance(HYP), 100);

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

// --- fighting back up, from a missed deepening -------------------------------------------------------------
// Failure: fighting cannot be chosen mid-trance, a miss never surfaces her, the drop outside its
// band, she surfaces without fighting, or coming up past the surface does not wake her.
reset();
storage.setDeepestTier("blank");
storage.setExperienceValue(0);
under(25);
Math.random = () => 0.99; // her first push, on choosing to fight, holds
session.answerPrompt("fight");
check("/hypno fight while under: she is fighting", /choice=fight/.test(session.describeSession()), true);
check("  she is told, privately", said.some((s) => /start fighting/.test(s)), true);
check("  /hypno chance shows the odds", session.describeChances(HYP).some((l) => /fighting back up: \d+%/.test(l)), true);
later();
seq(0.99, 0, 0); // the deepening misses, her push lands, and takes the least of 20-30
say("Missy, sink deeper");
check("fighting, a miss: up 20, 25 → 5", [tier(), depth.currentDepth()], ["drifting", 5]);
check("  the hypnotist is told", /push back up\. They are lightly under/.test(lastHyp()), true);
check("  the room sees her stir", room.length, 1);
later();
say("Missy, you will not notice being undressed"); // a Drifting suggestion, so it lands
seq(0.99, 0, 0);
say("Missy, sink deeper");
check("past the surface: she wakes", [session.isHypnotized(), depth.currentDepth()], [false, 0]);
check("  the hypnotist is told she is awake", /They are awake/.test(lastHyp()), true);
// Inside a tier: private to her, and the hypnotist is told it was a little.
reset();
storage.setDeepestTier("blank");
under(55);
Math.random = () => 0.99;
session.answerPrompt("fight");
later();
seq(0.99, 0, 0); // 40-59 drops 10-15
say("Missy, sink deeper");
check("40-59: up 10, 55 → 45, same tier", [depth.currentDepth(), tier()], [45, "entranced"]);
check("  the hypnotist is told it was a little", /push back up a little/.test(lastHyp()), true);
check("  the room sees nothing", room.length, 0);
check("  she feels it", said.length > 0, true);
reset();
storage.setDeepestTier("blank");
under(75);
Math.random = () => 0.99;
session.answerPrompt("fight");
later();
seq(0.99, 0, 0.99); // 60 and deeper drops 5-10: the most
say("Missy, sink deeper");
check("60 and deeper: up at most 10, 75 → 65", depth.currentDepth(), 65);

// --- fighting back up, on her own /hypno fight (v0.97.0) --------------------------------------------------
// Failure: no struggle on choosing to fight, more than one a minute, or the hypnotist told she is
// fighting when nothing moved.
reset();
storage.setDeepestTier("blank");
under(55);
toHyp = []; room = [];
Math.random = () => 0;
session.answerPrompt("fight");
check("choosing to fight struggles at once: 55 → 45", depth.currentDepth(), 45);
check("  the hypnotist is told she came up", /They push back up a little/.test(lastHyp()), true);
toHyp = []; said = [];
session.answerPrompt("fight");
check("again straight away: resting, nothing moves", [depth.currentDepth(), said.some((s) => /still gathering yourself/.test(s))], [45, true]);
check("  and the hypnotist hears nothing", toHyp.length, 0);
seq(0.99, 0, 0);
say("Missy, sink deeper");
check("a missed deepening inside that minute does not struggle either", [depth.currentDepth(), /does not take hold/.test(lastHyp())], [45, true]);
later();
toHyp = []; said = [];
Math.random = () => 0.99;
session.answerPrompt("fight");
check("a minute on, a push that fails: held, and only she hears it", [depth.currentDepth(), said.some((s) => /holds you where you are/.test(s)), toHyp.length], [45, true, 0]);

// Not fighting: a clean miss never brings her up, whatever the second roll.
reset();
under(25);
seq(0.99, 0);
say("Missy, sink deeper");
check("not fighting: a miss leaves her where she was", depth.currentDepth(), 25);

// --- her chance of coming up ----------------------------------------------------------------------------------
// base 55/40/28/18/10 + experience x0.35 - skill x0.25 - trust x0.15 - arousal x0.2, 3-75.
// Failure: a term missing or mis-weighted, or the clamps off.
reset();
storage.setExperienceValue(0);
under(25);
Math.random = () => 0.99;
session.answerPrompt("fight");
check("Yielding, a stranger: 40", session.surfaceChance(HYP), 40);
storage.setRelationshipOverride(HYP, "owner");
check("  trusted like an owner: 40 - 9.75", session.surfaceChance(HYP), 30.25);
storage.setExperienceValue(40);
check("  and practised at it: + 14", session.surfaceChance(HYP), 44.25);
storage.setExperienceValue(0);
Player.ArousalSettings.Progress = 100;
check("  and fully aroused: - 20", session.surfaceChance(HYP), 10.25);
Player.ArousalSettings.Progress = 0;
reset();
storage.setRelationshipOverride(HYP, "owner");
under(85);
session.answerPrompt("fight");
check("Blank, an owner: the 3 floor", session.surfaceChance(HYP), 3);
storage.setRelationshipOverride(HYP, null);
check("Blank, a stranger: 10", session.surfaceChance(HYP), 10);
reset();
under(5);
session.answerPrompt("fight");
check("Drifting, a stranger: 55", session.surfaceChance(HYP), 55);
// Their skill takes it down. Honoured skill rides in on a real attempt; an owner, so a Fight lands.
reset();
storage.setSkillHonour("capped");
storage.setRelationshipOverride(HYP, "owner");
messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "Eri", skill: 100 } }] });
session.answerPrompt("fight");
Math.random = () => 0;
for (let i = pending.length - 1; i >= 0; i--) if (pending[i].live && pending[i].ms === 60_000) { pending[i].live = false; pending[i].fn(); break; }
check("fighting an owner, it still lands: 30 - 20 + 6 - 9 = 7", depth.currentDepth(), 7);
// The induction itself was practice for her (+1.25 experience), which helps her fight.
check("a skilled hypnotist (30 honoured): 7.5 harder to fight up", session.surfaceChance(HYP), 55 + expCount() * 0.35 - 7.5 - 65 * 0.15);

// --- the safeword --------------------------------------------------------------------------------------------
session.safeword();
check("the safeword: depth back to nothing", depth.currentDepth(), 0);

console.log(`deepen: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
