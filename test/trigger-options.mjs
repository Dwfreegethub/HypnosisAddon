// Per-trigger options, v0.87.0 (design.md, "Trigger Overhaul", Build 1): spoken options while
// planting, one-shot, hard expiry and the lifespan ceiling, whole-word matching, per-trigger
// scope capped by the subject's own, and the `key` back-fill.
//
// Every block states what failure looks like. Verified by mutation when written: making markSpent
// a no-op, ignoring strict, not capping scope, ignoring expiresAt, and ignoring the ceiling each
// turned their own checks red (2-5 failures apiece). Against v0.86.1 the suite dies at the first
// check, since parseTriggerOption does not exist there.
const HYP = 246108, OTHER = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: OTHER, Name: "Rei" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let sentToHypnotist = [];
globalThis.ServerSend = (type, data) => {
	if (type === "ChatRoomChat" && data?.Type === "Hidden") {
		const m = data?.Dictionary?.[0]?.message;
		if (m?.type === "trigger-status") sentToHypnotist.push(m.text);
	}
};
const lastToHypnotist = () => sentToHypnotist[sentToHypnotist.length - 1] ?? "";
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);
// Same controllable clock as triggers.mjs: paced steps are drained by hand, release timers left.
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};

const { depth, voice, storage, triggers, timers } = await import("./harness-bundle.mjs");
const lz = (await import("lz-string")).default;
depth.setCurrentDepths(80, 80);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const HOUR = 3_600_000, MIN = 60_000, DAY = 86_400_000;

// --- parsing: what each natural line means ---------------------------------------------------
// Failure: a line reads as the wrong option, or as none.
const o = (t) => voice.parseTriggerOption(t);
const once = { kind: "once", value: true };
const every = { kind: "once", value: false };
const strict = { kind: "strict", value: true };
const scope = (s) => ({ kind: "scope", scope: s });
const life = (ms) => ({ kind: "lifespan", ms });
for (const [line, want] of [
	["Missy, this trigger works only once", once],
	["Missy, it only works once", once],
	["Missy, you will only obey it once", once],
	["Missy, you'll respond to this one time", once],
	["Missy, it's a one time thing", once],
	["Missy, once and then it's gone", once],
	["Missy, it works every time", every],
	["Missy, you will obey it every single time", every],
	["Missy, this trigger lasts 2 hours", life(2 * HOUR)],
	["Missy, it will last for the next 30 minutes", life(30 * MIN)],
	["Missy, it lasts an hour", life(HOUR)],
	["Missy, it will last half an hour", life(30 * MIN)],
	["Missy, the trigger fades in three days", life(3 * DAY)],
	["Missy, it wears off after 45 mins", life(45 * MIN)],
	["Missy, you will obey it for the next two hours", life(2 * HOUR)],
	["Missy, it lasts forever", life(0)],
	["Missy, this trigger will never fade", life(0)],
	["Missy, anyone can use it", scope("everyone")],
	["Missy, whoever says the words", scope("everyone")],
	["Missy, no matter who says it", scope("everyone")],
	["Missy, your owner can use it too", scope("owner")],
	["Missy, your lovers may also use it", scope("lovers")],
	["Missy, only I can use it", scope("hypnotist")],
	["Missy, it only works for me", scope("hypnotist")],
	["Missy, only when I say it", scope("hypnotist")],
	["Missy, only when you hear it exactly", strict],
	["Missy, only when I say it exactly", strict],
	["Missy, only the exact words", strict],
	["Missy, the word has to be said on its own", strict],
	["Missy, not as part of another word", strict],
]) check(`option: "${line}"`, o(line), want);

// --- parsing: what must NOT read as an option -------------------------------------------------
// A recording is open when these are heard, and a line that is not an option is recorded as a
// suggestion. Failure: an ordinary suggestion is swallowed as a trigger setting.
for (const line of [
	"Missy, you cannot move",
	"Missy, for the next hour you cannot move",
	"Missy, just this once, kneel",
	"Missy, you will stay still for 2 hours",
	"Missy, kneel every time I tell you",
	"Missy, only I can see you",
	"Missy, anyone can see you",
	"Missy, you will obey",
]) check(`not an option: "${line}"`, o(line), null);

// The control parser: options come before the start patterns. Failure: "only when I say it
// exactly" starts recording a trigger called "it exactly".
const p = (t) => voice.parseTriggerControl(t);
check("option wins over TRIGGER_START's 'when I say'", p("Missy, only when I say it exactly"), { kind: "option", option: strict });
check("  and 'only when I say it' is scope, not a start", p("Missy, only when I say it").kind, "option");
check("start still parses", p("Missy, your trigger word is sleepy time"), { kind: "start", phrase: "sleepy time" });
check("commit still parses", p("Missy, remember trigger"), { kind: "commit" });

// --- setup -----------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction", "triggerControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(5);
storage.forgetAllTriggers();

const plant = (phrase, options = [], actions = ["movement-block"]) => {
	triggers.beginRecording(HYP, "GameBot", phrase);
	for (const a of actions) triggers.recordAction(a);
	for (const opt of options) triggers.applyRecordingOption(opt);
	triggers.commitRecording();
	return storage.listTriggers().find((t) => t.phrase === phrase);
};
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);

// --- options outside a recording fall through ------------------------------------------------
// Failure: an option said with no recording open is claimed (returns non-null) and eaten.
check("no recording: option is not applied", triggers.applyRecordingOption(once), null);

// --- key -------------------------------------------------------------------------------------
// Failure: a planted trigger has no key, so forgetTrigger(key) removes nothing.
const k = plant("sleepy time");
check("a planted trigger's key is its phrase", k.key, "sleepy time");
check("forgetTrigger removes by key", storage.forgetTrigger("sleepy time"), 1);
// A key-less save (older callers, fixtures) must not wipe other key-less records.
storage.forgetAllTriggers();
storage.saveTrigger({ phrase: "alpha one", actions: ["movement-block"], installedBy: HYP, installedByName: "GameBot", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
storage.saveTrigger({ phrase: "bravo two", actions: ["movement-block"], installedBy: HYP, installedByName: "GameBot", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
check("two key-less saves keep both records", storage.listTriggers().length, 2);
storage.forgetAllTriggers();

// --- the hypnotist hears each option noted ---------------------------------------------------
// Rule 5. Failure: the option is applied with nothing said to him.
triggers.beginRecording(HYP, "GameBot", "noted words");
triggers.recordAction("movement-block");
sentToHypnotist = [];
check("subject gets a line for an option", typeof triggers.applyRecordingOption(once), "string");
check("  and the hypnotist is told what was noted", /Noted .*work once/.test(lastToHypnotist()), true);
triggers.cancelRecording();

// --- one-shot, holding nothing: gone at once -------------------------------------------------
// movementRestriction off means the only action is skipped, so nothing holds her.
// Failure: the trigger is still in storage after firing.
storage.setFeature("movementRestriction", false);
plant("single spark", [once]);
check("one-shot saved with oneShot", find("single spark").oneShot, true);
voice.handleSpokenLine(HYP, "single spark");
check("one-shot holding nothing is removed on firing", find("single spark"), undefined);
storage.setFeature("movementRestriction", true);

// --- one-shot, holding: kept until it lets go ------------------------------------------------
// Failure (a): deleted while still holding her, stranding the Freeze. Failure (b): fires twice.
// Failure (c): lingers after release.
plant("gripping word", [once]);
voice.handleSpokenLine(HYP, "gripping word");
drainPaced();
const g = find("gripping word");
check("one-shot still stored while it holds", !!g, true);
check("  marked spent", g?.spent, true);
check("  and in effect", voice.isTriggerInEffect(g), true);
check("a spent one-shot cannot fire again", triggers.triggersFiredBy(HYP, "gripping word").length, 0);
voice.handleSpokenLine(HYP, "Missy you are released from gripping word");
check("released: the spent one-shot is gone", find("gripping word"), undefined);
// A list read while it was spent and holding must spare it — the prune rule.
plant("second grip", [once]);
voice.handleSpokenLine(HYP, "second grip");
drainPaced();
triggers.pruneFadedTriggers(voice.isTriggerInEffect);
check("prune spares a spent one-shot that is holding", !!find("second grip"), true);
timers.clearAllTimers(); // what a safeword does to the marker
triggers.pruneFadedTriggers(voice.isTriggerInEffect);
check("prune removes it once nothing holds", find("second grip"), undefined);

// A single line with the phrase twice fires it once. This guards triggersFiredBy returning each
// trigger once per line, which one-shot relies on; it passes without one-shot too, by design.
// Failure: said.length doubles.
storage.setFeature("movementRestriction", false);
storage.setFeature("speechRestriction", true);
plant("double tap", [once], ["speech-block"]);
said = [];
voice.handleSpokenLine(HYP, "double tap double tap");
drainPaced();
check("phrase twice in one line fires once", said.length, 1);
timers.clearAllTimers();
storage.setFeature("movementRestriction", true);
storage.forgetAllTriggers();

// --- unlimited is the default ----------------------------------------------------------------
// Failure: an ordinary trigger is removed after firing.
plant("every day");
voice.handleSpokenLine(HYP, "every day");
drainPaced();
timers.clearAllTimers();
voice.handleSpokenLine(HYP, "every day");
check("a trigger with no options survives firing twice", !!find("every day"), true);
check("  and has no oneShot", find("every day").oneShot, undefined);
timers.clearAllTimers();
storage.forgetAllTriggers();

// --- hard expiry -----------------------------------------------------------------------------
// Failure: expiresAt not set, or an expired trigger still fires, or is not pruned.
const before = Date.now();
const ex = plant("short lived", [life(2 * HOUR)]);
check("asked lifespan sets expiresAt", ex.expiresAt >= before + 2 * HOUR && ex.expiresAt <= Date.now() + 2 * HOUR, true);
check("fires before it expires", triggers.triggersFiredBy(HYP, "short lived").length, 1);
ex.expiresAt = Date.now() - 1;
check("an expired trigger does not fire", triggers.triggersFiredBy(HYP, "short lived").length, 0);
check("  reads as strength 0", triggers.triggerStrength(ex), 0);
check("  and says expired", triggers.describeStrength(ex), "expired");
triggers.pruneFadedTriggers(() => false);
check("  and is pruned", find("short lived"), undefined);
// "lasts forever" after a lifespan clears it. Failure: expiresAt survives.
check("'forever' clears an earlier lifespan", plant("long lived", [life(HOUR), life(0)]).expiresAt, undefined);
// An absurd ask lands at the 30-day cap. Failure: expiresAt 99999 days out.
const huge = plant("huge ask", [life(99999 * DAY)]);
check("an absurd lifespan is capped at 30 days", Math.round((huge.expiresAt - huge.installedAt) / DAY), 30);
storage.forgetAllTriggers();

// --- lifespan ceiling ------------------------------------------------------------------------
// Failure: a longer ask is not clamped, or a trigger with no ask gets no expiry, or he is not told.
check("ceiling defaults to no limit", storage.getTriggerLifespan(), 0);
check("an invalid ceiling reads as no limit", storage.setTriggerLifespan(7), 0);
storage.setTriggerLifespan(60);
sentToHypnotist = [];
const capped = plant("capped ask", [life(2 * HOUR)]);
check("a longer ask is clamped to the ceiling", capped.expiresAt - capped.installedAt, HOUR);
check("  and the hypnotist is told", /at most 60 minutes/.test(lastToHypnotist()), true);
const unasked = plant("no ask at all");
check("no ask still gets the ceiling", unasked.expiresAt - unasked.installedAt, HOUR);
sentToHypnotist = [];
const shorter = plant("shorter ask", [life(30 * MIN)]);
check("a shorter ask is kept", shorter.expiresAt - shorter.installedAt, 30 * MIN);
check("  with no clamp note", /at most/.test(lastToHypnotist()), false);
storage.setTriggerLifespan(0);
check("no ceiling, no ask: no expiry", plant("free again").expiresAt, undefined);
storage.forgetAllTriggers();

// --- whole-word matching ---------------------------------------------------------------------
// Failure: a strict trigger fires inside a longer word, or the master toggle does nothing.
plant("sleepy", [strict]);
check("strict: fires on the word", triggers.triggersFiredBy(HYP, "so sleepy now").length, 1);
check("strict: fires at start and end", triggers.triggersFiredBy(HYP, "sleepy").length, 1);
check("strict: not inside a longer word", triggers.triggersFiredBy(HYP, "hey sleepyhead").length, 0);
storage.forgetAllTriggers();
plant("sleepy");
check("default: fires inside a longer word (unchanged)", triggers.triggersFiredBy(HYP, "hey sleepyhead").length, 1);
storage.setFeature("strictTriggerMatch", true);
check("master toggle: not inside a longer word", triggers.triggersFiredBy(HYP, "hey sleepyhead").length, 0);
check("master toggle: still fires on the word", triggers.triggersFiredBy(HYP, "hey sleepy").length, 1);
sentToHypnotist = [];
plant("drowsy time");
check("master toggle: the hypnotist is told at planting", /whole words only/.test(lastToHypnotist()), true);
storage.setFeature("strictTriggerMatch", false);
storage.forgetAllTriggers();

// --- per-trigger scope, capped by hers -------------------------------------------------------
// Failure (a): he widens past her setting. Failure (b): he cannot narrow within it.
storage.setTriggerScope("hypnotist");
sentToHypnotist = [];
const wide = plant("open door", [scope("everyone")]);
check("asked scope is stored", wide.scope, "everyone");
check("  but her tighter setting wins at fire time", triggers.effectiveScope(wide), "hypnotist");
check("  so another player cannot fire it", triggers.triggersFiredBy(OTHER, "open door").length, 0);
check("  and the hypnotist is told", /only allow "Hypnotist only"/.test(lastToHypnotist()), true);
storage.setTriggerScope("everyone");
check("her wider setting: his ask applies", triggers.effectiveScope(wide), "everyone");
check("  another player can fire it", triggers.triggersFiredBy(OTHER, "open door").length, 1);
const narrow = plant("closed door", [scope("hypnotist")]);
check("he can narrow within hers", triggers.effectiveScope(narrow), "hypnotist");
check("  so another player cannot fire it", triggers.triggersFiredBy(OTHER, "closed door").length, 0);
check("  but he still can", triggers.triggersFiredBy(HYP, "closed door").length, 1);
check("no ask: follows hers", triggers.effectiveScope(plant("plain door")), "everyone");
check("the scope key list matches the labelled one", storage.TRIGGER_SCOPE_KEYS, triggers.TRIGGER_SCOPES.map((s) => s.key));
storage.setTriggerScope("hypnotist");
storage.forgetAllTriggers();

// --- normalise: old records load unchanged, bad values are dropped ----------------------------
// Failure: an old record has no key after a reload, or a junk option survives it.
const blob = {
	version: "0.86.1", trust: [], experience: 0, triggerScope: "hypnotist",
	triggerDurationMinutes: 5, decayRate: "never", triggerDecayRate: "never",
	depthGates: {}, chemicalScope: "arousal", relationshipOverride: {},
	features: { hypnoEnabled: true },
	triggers: [
		{ phrase: "old word", actions: ["movement-block"], installedBy: HYP, installedByName: "GameBot", installedAt: 1, plantedDepth: 60, plantedChemical: false, reinforcedAt: 1, firings: 0 },
		{ phrase: "junk word", key: "junk word", actions: [], installedBy: HYP, installedByName: "GameBot", installedAt: 1, plantedDepth: 60, plantedChemical: false, reinforcedAt: 1, firings: 0, scope: "nobody", expiresAt: "soon", oneShot: "yes", strict: 1 },
	],
	triggerLifespanMinutes: 45,
};
check("import accepted", storage.importSettings(lz.compressToBase64(JSON.stringify(blob))).ok, true);
const old = find("old word"), junk = find("junk word");
check("old record gets key = phrase", old?.key, "old word");
check("  and no options", [old?.scope, old?.expiresAt, old?.oneShot, old?.strict], [undefined, undefined, undefined, undefined]);
check("junk options are dropped", [junk?.scope, junk?.expiresAt, junk?.oneShot, junk?.strict], [undefined, undefined, undefined, undefined]);
check("an invalid stored ceiling reads as no limit", storage.getTriggerLifespan(), 0);

console.log(`trigger-options: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
