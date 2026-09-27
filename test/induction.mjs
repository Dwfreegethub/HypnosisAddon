// The v0.97.0 induction overhaul (trust.md §12, DW 2026-09-27).
//
// DW: "Right now I think the Roll makes to much of a difference." The roll now only decides whether
// an induction lands. How deep comes from trust x0.5 + the relationship's depth floor x0.5 + skill
// x0.2 + arousal x0.15 + her stance (Agree +20, Fight -20), with a 2d10 - 11 spread, never under
// max(relationship floor, trust x0.5) unless she fights. Earned depth is the same without skill and
// arousal. A landing at 0 or less slips away and counts as a miss. Beside it: auto-stance, the
// "when I'm away" rule, and toy mode. Every block states what failure looks like.
const HYP = 246108, REI = 999;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "Eri" }, { MemberNumber: REI, Name: "Rei" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
/** Every hidden message this client sends, as JSON, so nothing about her stance can hide in one. */
let wire = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat" && data?.Type === "Hidden") wire.push(JSON.stringify(data)); };
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.CharacterSetActivePose = () => {};

let clock = 1_000_000;
Date.now = () => clock;
const pending = [];
globalThis.setTimeout = (fn, ms) => pending.push({ fn, ms });
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) {
		if (pending[i].fn && pending[i].ms === 60_000) { const fn = pending[i].fn; pending[i].fn = null; fn(); return; }
	}
	throw new Error("no induction window open");
};

const { session, messaging, storage, depth, away } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

storage.setFeature("hypnoEnabled", true);
storage.setFeature("tranceCannotMove", false);
const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const attempt = (from = HYP, skill) => incoming(from, { type: "session-attempt", hypnotistName: from === HYP ? "Eri" : "Rei", ...(skill ? { skill } : {}) });
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const choice = () => (session.describeSession().match(/choice=(\w+)/) ?? [])[1] ?? null;
const attempts = () => (session.describeSession().match(/attempts=(\d+)/) ?? [])[1] ?? "0";
const boxUp = () => session.getPendingPrompt() !== null;
const seq = (...v) => { let i = 0; Math.random = () => v[Math.min(i++, v.length - 1)]; };
const LOWEST = () => seq(0, 0, 0); // the roll lands, and 2d10 is 2: a spread of -9
const HIGHEST = () => seq(0, 0.99, 0.99); // lands, and 2d10 is 20: +9
const reset = ({ trust = 0, relation = null } = {}) => {
	session.safeword();
	clock += 20 * 60_000;
	away.noteActivity();
	said = [];
	wire = [];
	storage.setTrustValue(HYP, "Eri", trust);
	storage.setTrustValue(REI, "Rei", 0);
	storage.setExperienceValue(0);
	storage.setRelationshipOverride(HYP, relation);
	storage.setRelationshipOverride(REI, null);
	Player.ArousalSettings.Progress = 0;
};
/** A real induction: attempt, answer, roll. */
const induce = (stance, rolls, opts) => {
	reset(opts);
	attempt();
	session.answerPrompt(stance);
	rolls();
	runRoll();
};

// --- the depth sums ------------------------------------------------------------------------------------
// Failure: a weight wrong, the relationship not halved into the base, or the floor not cleared by Fight.
reset();
check("stranger, Agree: 20, no floor", session.depthBases(HYP, "agree"), { full: 20, earned: 20, floor: 0 });
check("  Ignore: 0", session.depthBases(HYP, "ignore"), { full: 0, earned: 0, floor: 0 });
check("  Fight: -20", session.depthBases(HYP, "fight"), { full: -20, earned: -20, floor: 0 });
reset({ trust: 50 });
check("trust 50, Agree: 25 + 20, floor 25", session.depthBases(HYP, "agree"), { full: 45, earned: 45, floor: 25 });
check("  Fight: 25 - 20, and no floor", session.depthBases(HYP, "fight"), { full: 5, earned: 5, floor: 0 });
reset({ relation: "lover" });
check("a lover: 40 x 0.5 in the base, 40 under it", session.depthBases(HYP, "ignore"), { full: 20, earned: 20, floor: 40 });
reset({ relation: "owner" });
check("an owner, Agree: 30 + 20, 60 under it", session.depthBases(HYP, "agree"), { full: 50, earned: 50, floor: 60 });
reset();
Player.ArousalSettings.Progress = 100;
check("a full meter: +15 to full, nothing to earned", session.depthBases(HYP, "agree"), { full: 35, earned: 20, floor: 0 });
Player.ArousalSettings.Active = "Manual";
check("  the meter off: nothing", session.depthBases(HYP, "agree").full, 20);
Player.ArousalSettings.Active = "Hybrid";

// --- landing through a real induction ------------------------------------------------------------------
// Failure: depth from the roll again, the spread outside -9..+9, earned above full, or the floor ignored.
induce("agree", LOWEST, { trust: 50 });
check("trust 50, Agree, the lowest spread: 45 - 9 = 36", [phase(), depth.currentDepth(), depth.currentDepthEarned()], ["Hypnotized", 36, 36]);
induce("agree", HIGHEST, { trust: 50 });
check("  the highest: 45 + 9 = 54", depth.currentDepth(), 54);
induce("ignore", LOWEST, { trust: 50 });
check("Ignore at the lowest spread is held up by trust: floor 25", depth.currentDepth(), 25);
induce("agree", LOWEST, { relation: "owner" });
check("an owner never lands under 60", depth.currentDepth(), 60);
reset({ trust: 50 });
Player.ArousalSettings.Progress = 100;
attempt();
session.answerPrompt("agree");
LOWEST();
runRoll();
check("aroused: full 36 + 15, earned stays 36", [depth.currentDepth(), depth.currentDepthEarned()], [51, 36]);
reset({ trust: 50 });
storage.setSkillHonour("capped");
attempt(HYP, 100);
session.answerPrompt("agree");
LOWEST();
runRoll();
check("skilled (30 honoured): full +6, earned stays 36", [depth.currentDepth(), depth.currentDepthEarned()], [42, 36]);
storage.setSkillHonour("floored");

// --- it slips away -------------------------------------------------------------------------------------
// Failure: a landing at 0 or less leaves her "under" at nothing, is not told, or does not count.
induce("fight", LOWEST, { trust: 50 });
check("trust 50, Fight, the lowest spread: 5 - 9 slips away", phase(), "AttemptFailed");
check("  she is told it slipped away", said.some((s) => /slips away/.test(s)), true);
check("  and it counts as an attempt", attempts(), "1");
check("  the hypnotist sees an ordinary miss", wire.some((w) => /AttemptFailed/.test(w)), true);
induce("fight", HIGHEST, { trust: 50 });
check("  the highest spread lands at 14", [phase(), depth.currentDepth()], ["Hypnotized", 14]);
induce("fight", HIGHEST);
check("a stranger's Fight always slips away (-20 + 9)", phase(), "AttemptFailed");

// --- the landing chance ----------------------------------------------------------------------------------
// Failure: arousal not added, experience at the old 0.25, or the Fight invariant broken.
reset();
check("a stranger, Agree: 25", session.inductionChance(HYP, "agree"), 25);
storage.setExperienceValue(50);
check("  experience 50, Agree: + 10", session.inductionChance(HYP, "agree"), 35);
check("  Fight is never above Ignore", session.inductionChance(HYP, "fight") <= session.inductionChance(HYP, "ignore"), true);
storage.setExperienceValue(0);
Player.ArousalSettings.Progress = 100;
check("a full meter adds a quarter: Ignore 25", session.inductionChance(HYP, "ignore"), 25);
storage.setChemicalScope("neither");
check("  not when chemicals do not count", session.inductionChance(HYP, "ignore"), 5);
storage.setChemicalScope("arousal");
Player.ArousalSettings.Progress = 0;
reset({ relation: "owner" });
check("an owner's trust floor still counts for landing: Ignore 65", session.inductionChance(HYP, "ignore"), 65);

// --- /hypno chance --------------------------------------------------------------------------------------
reset({ trust: 50 });
check("/hypno chance says where each answer would land", session.describeChances(HYP).some((l) => /agree .*lands 36–54 \(earned 36–54\)/.test(l)), true);
check("  and when it could slip away", session.describeChances(HYP).some((l) => /fight .*or slips away/.test(l)), true);

// --- auto-stance -------------------------------------------------------------------------------------------
// Failure: the box still shows, the wrong stance, the hypnotist told which, or no way to change it.
reset();
storage.setDefaultStance("agree");
attempt();
check("auto-Agree: no box, straight into the window", [boxUp(), phase(), choice()], [false, "InductionInProgress", "agree"]);
check("  she is told, privately", said.some((s) => /go along with it, as you set yourself to/.test(s)), true);
check("  the hypnotist is never told her answer", wire.some((w) => /agree|fight|ignore/i.test(w)), false);
session.answerPrompt("fight");
check("  she can change it before the roll", choice(), "fight");
reset();
storage.setDefaultStance("fight");
attempt();
check("auto-Fight", choice(), "fight");
storage.setDefaultStance("prompt");
reset();
attempt();
check("Ask me: the box, as before", [boxUp(), phase()], [true, "AttemptMade"]);

// --- when she is away ---------------------------------------------------------------------------------------
// Failure: an unattended subject answered for, the refusal not said to either side, or a setting ignored.
reset();
storage.setDefaultStance("agree");
clock += 10 * 60_000; // ten minutes, no key, click or touch
check("ten minutes idle is away", away.isAway(), true);
attempt();
check("away, and set to Refuse (the default): turned away", phase(), "Idle");
check("  the hypnotist is told why", wire.some((w) => /away from the keyboard/.test(w)), true);
check("  and she is told who tried", said.some((s) => /Eri tried to hypnotize you while you were away/.test(s)), true);
storage.setAwayStance("ignore");
attempt();
check("away, set to Ignore: it goes ahead as Ignore", [phase(), choice()], ["InductionInProgress", "ignore"]);
reset();
storage.setAwayStance("keep");
clock += 10 * 60_000;
attempt();
check("away, set to Keep: her own answer", choice(), "agree");
reset();
storage.setAwayStance("refuse");
storage.setDefaultStance("prompt");
clock += 10 * 60_000;
attempt();
check("Ask me while away: the box, as before (the away rule is for automatic answers)", boxUp(), true);
reset();
away.noteActivity();
check("any input and she is back", away.isAway(), false);

// --- toy mode -------------------------------------------------------------------------------------------------
// Failure: toy mode for someone outside her choice, a roll, a cooldown, earned depth held back,
// or a depth past her ceiling.
reset();
storage.setToyMode(true);
attempt();
check("toy mode is for lovers and up by default: a stranger gets the box", boxUp(), true);
reset({ relation: "lover" });
attempt();
check("a lover: straight under, no box", [phase(), boxUp()], ["Hypnotized", false]);
check("  to the top of her ceiling (Entranced), full and earned", [depth.currentDepth(), depth.currentDepthEarned()], [59, 59]);
check("  no attempt spent", attempts(), "0");
check("  she is told it was toy mode", said.some((s) => /toy mode/.test(s)), true);
storage.setDeepestTier("blank");
reset({ relation: "lover" });
attempt();
check("a Blank ceiling lands at 95, the landing cap", depth.currentDepth(), 95);
storage.setDeepestTier("never");
reset({ relation: "lover" });
Math.random = () => 0;
attempt();
check("'Never deeper': a sure Agree, 20 + 20 - 9, held at 40", depth.currentDepth(), 40);
storage.setDeepestTier("entranced");
// No cooldown: spend both tries with it off, then turn it on.
storage.setToyMode(false);
reset({ relation: "lover" });
Math.random = () => 0.99;
attempt();
session.answerPrompt("ignore");
runRoll();
incoming(HYP, { type: "session-continue" });
runRoll();
check("two misses: cooling down", phase(), "CooldownRequired");
storage.setToyMode(true);
attempt();
check("  toy mode ignores the cooldown", phase(), "Hypnotized");
storage.setToyScope("owner");
reset({ relation: "lover" });
attempt();
check("for my owner only: a lover gets the box", boxUp(), true);
storage.setToyScope("anyone");
reset();
attempt(REI);
check("for anyone: a stranger too", phase(), "Hypnotized");
check("/hypno chance says so", session.describeChances(REI).some((l) => /toy mode: on for anyone — they would put you straight under/.test(l)), true);
reset();
clock += 10 * 60_000;
attempt(REI);
check("away, set to Refuse: toy mode turns them away too", phase(), "Idle");
storage.setAwayStance("ignore");
attempt(REI);
check("away, set to Ignore: no toy mode, an ordinary Ignore", [phase(), choice()], ["InductionInProgress", "ignore"]);
storage.setAwayStance("refuse");
reset();
attempt(REI);
session.safeword();
check("the safeword ends a toy-mode trance", [session.isHypnotized(), depth.currentDepth()], [false, 0]);
storage.setToyMode(false);
storage.setToyScope("lover");

console.log(`induction: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
