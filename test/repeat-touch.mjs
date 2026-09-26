// Touching more than once, and actions on the start line, v0.92.0 (DW, 2026-09-26).
//
// DW, live: "I tried to make Missy touch herself 3 times… that does not work." Two findings:
// "three times" was only understood for words to say, so a touch happened once; and
// "when you hear ember glow, touch your breasts three times" planted the WHOLE line as the trigger
// word. Now a touch repeats up to five times — live and in a trigger — with the count inside the one
// action ("act:Caress:breasts*3", one of the eight slots), and a start line splits at a PAUSE before
// any recordable action. A phrase with no pause keeps its old meaning.
//
// BC's activity calls are stubbed as in activity.mjs: ActivityAllowedForGroup says what is
// permitted, ActivityRun is counted. Every check states what failure looks like.
const HYP = 246108;
let ALLOWED = { ItemBreast: ["Caress"], ItemVulva: ["MasturbateHand"], ItemArms: ["Caress"] };
let runCalls = [];
globalThis.ActivityAllowedForGroup = (_c, g) => (ALLOWED[g] || []).map((name) => ({ Activity: { Name: name }, Group: g }));
globalThis.AssetGroupGet = (_f, g) => ({ Name: g });
globalThis.ActivityRun = (_a, _b, group, act) => runCalls.push(`${act.Activity.Name}@${group.Name}`);
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [], Effect: [], ArousalSettings: { Active: "Hybrid", Progress: 0 },
	IsPlayer: () => true, HasEffect(e) { return this.Effect.includes(e); },
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomSendEmote = () => {};
globalThis.CharacterSetActivePose = () => {};
let toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };
// Paced steps drain by hand; minutes-long release timers are left alone.
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = () => 0;
const drain = () => {
	for (let g = 0; g < 1000; g++) {
		const i = pending.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pending[i].live = false;
		pending[i].fn();
	}
};

const { voice, storage, session, depth, timers } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line, who = HYP) => voice.handleSpokenLine(who, line);

// --- the count, pure -------------------------------------------------------------------------------
// Failure: the count missed, not capped, or invented.
const m = (t) => voice.matchActivityCommand(t);
check("three times", m("Missy, touch your breasts three times"), { kind: "part", activity: "Caress", word: "breasts", times: 3 });
check("3 times (digits survive)", m("Missy, touch your breasts 3 times")?.times, 3);
check("twice", m("Missy, finger yourself twice"), { kind: "genital", times: 2 });
check("capped at five", m("Missy, touch your breasts 9 times")?.times, 5);
check("no count: no times at all (old shape kept)", m("Missy, touch your breasts"), { kind: "part", activity: "Caress", word: "breasts" });
check("action id carries the count", voice.parseActId("act:Caress:breasts*3"), { base: "act:Caress:breasts", times: 3 });
check("an id planted before v0.92.0 reads as once", voice.parseActId("act:Caress:breasts"), { base: "act:Caress:breasts", times: 1 });
check("detail wording", voice.describeAction("act:Caress:breasts*3"), "you caress your breasts 3 times");
check("  and for a bare touch", voice.describeAction("act:vague*2"), "you touch yourself somewhere 2 times");

// --- setup ------------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "triggerControl", "compelActivity", "postureControl", "movementRestriction"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.forgetAllTriggers();
const under = () => { depth.setCurrentDepths(80, 80); session.forceTrance(HYP, 80, 80); };
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);

// --- live: three touches, paced ------------------------------------------------------------------
// Failure: one touch, or three at once (not paced).
under();
runCalls = [];
say("Missy, touch your breasts three times");
check("live: the first touch lands at once", runCalls, ["Caress@ItemBreast"]);
drain();
check("  and the other two on the paced clock", runCalls, ["Caress@ItemBreast", "Caress@ItemBreast", "Caress@ItemBreast"]);
// A safeword stops what is still to come. Failure: touches after she said stop.
runCalls = [];
say("Missy, touch your breasts five times");
session.safeword();
drain();
check("the safeword stops the rest", runCalls, ["Caress@ItemBreast"]);
// "Made to act" revoked mid-way stops it too.
under();
runCalls = [];
say("Missy, touch your breasts three times");
storage.setFeature("compelActivity", false);
drain();
check("permission revoked mid-way: no more touches", runCalls, ["Caress@ItemBreast"]);
storage.setFeature("compelActivity", true);
session.safeword();

// --- in a trigger: one slot, three touches ----------------------------------------------------------
// Failure: three actions stored, or one touch when it fires.
under();
say("Missy, your trigger word is ember glow");
say("Missy, touch your breasts three times");
say("Missy, remember trigger");
check("trigger: one action slot for three touches", find("ember glow")?.actions, ["act:Caress:breasts*3"]);
session.safeword();
runCalls = [];
say("ember glow");
drain();
check("  and firing it touches three times", runCalls, ["Caress@ItemBreast", "Caress@ItemBreast", "Caress@ItemBreast"]);
timers.clearAllTimers();
storage.forgetAllTriggers();

// --- the start line splits at a pause ---------------------------------------------------------------
// Failure (DW's report): the whole line becomes the trigger word.
under();
say("Missy, when you hear ember glow, touch your breasts three times");
say("Missy, remember trigger");
check("start line + touch: the word is just 'ember glow'", !!find("ember glow"), true);
check("  and the touch (with its count) is recorded", find("ember glow")?.actions, ["act:Caress:breasts*3"]);
storage.forgetAllTriggers();
say("Missy, your trigger word is velvet dark - kneel");
say("Missy, remember trigger");
check("a dash is a pause too; a pose is an action", find("velvet dark")?.actions, ["kneel"]);
storage.forgetAllTriggers();
say("Missy, when you hear amber light and you cannot move");
say("Missy, remember trigger");
check("'and' is a pause; a restriction is an action", find("amber light")?.actions, ["movement-block"]);
storage.forgetAllTriggers();
// No pause, or no action after it: the old meaning. Failure: a phrase cut in two.
say("Missy, your trigger word is time to kneel");
say("Missy, you cannot move");
say("Missy, remember trigger");
check("no pause: the whole phrase is still the word", !!find("time to kneel"), true);
storage.forgetAllTriggers();
say("Missy, your trigger word is hello, world");
say("Missy, you cannot move");
say("Missy, remember trigger");
check("a pause with no action after it: kept whole", !!find("hello world"), true);
storage.forgetAllTriggers();
// The re-read of the rest must not fire a trigger whose word is in it. Planted by SOMEONE ELSE with
// scope "everyone", so neither the installer's-session rule nor the scope would stop it — only the
// re-read guard can. Failure: the other trigger fires (and freezes her) while this one is planted.
storage.setTriggerScope("everyone");
storage.saveTrigger({ phrase: "stone still", actions: ["movement-block"], installedBy: 777, installedByName: "Rei", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
under();
say("Missy, your trigger word is new word, stone still, touch your breasts");
check("recording the rest does not fire a trigger named in it", voice.isTriggerInEffect(find("stone still")), false);
say("Missy, remember trigger");
check("  and the touch is still recorded", find("new word")?.actions, ["act:Caress:breasts"]);
storage.setTriggerScope("hypnotist");
session.safeword();

console.log(`repeat-touch: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
