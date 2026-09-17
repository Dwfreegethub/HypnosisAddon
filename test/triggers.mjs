// Triggers: phrase parsing, recording, gates, and firing.
const HYP = 246108, OTHER = 999;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
// Trigger setup feedback goes to the HYPNOTIST over the hidden channel, so capture it
// rather than only watching what the subject sees.
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

// A controllable clock. A fired trigger's actions are now PACED (v0.72.5) — the first lands at
// once, the rest drain through timers.ts on a short jittered delay — and the auto-release runs
// through timers.ts too. So capture setTimeout and fire the sub-minute paced steps by hand with
// drainPaced(), leaving the minutes-long release timers pending. timers.ts reads the global
// setTimeout at scheduling time, so this has to be in place before the first fire.
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
/** Fire all pending SHORT timers (the paced drain), repeatedly since each step schedules the next.
 * Leaves the long auto-release timers alone, which is what every assertion here depends on. */
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};

const { depth, voice, storage, triggers, timers, build } = await import("./harness-bundle.mjs");
// Depth is the gate now, not trust. Planting a trigger, carrying a suggestion and the
// clothing illusion all need a Deep trance by default, measured against the EARNED depth —
// so these suites have to say how deep the subject is, the way a real induction would. Set
// once here: every case below assumes a trance deep enough to work in, and the ones that
// test the gate itself lower it explicitly.
depth.setCurrentDepths(80, 80);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- parsing (pure) ---
const p = (t) => voice.parseTriggerControl(t);
check("start, name after phrase", p("Missy, your trigger word is sleepy time"), { kind: "start", phrase: "sleepy time" });
check("name stripped from tail", p("your trigger word is sleepy Missy"), { kind: "start", phrase: "sleepy" });
check("phrase variant", p("Missy, the trigger phrase is deep blue"), { kind: "start", phrase: "deep blue" });
check("when-i-say form", p("Missy, when i say butterfly"), { kind: "start", phrase: "butterfly" });
check("commit", p("Missy, remember trigger"), { kind: "commit" });
check("cancel", p("Missy, forget the trigger"), { kind: "cancel" });
check("ordinary line", p("Missy, you cannot move"), null);
check("self-referential ignored", p("i will set a trigger"), null);

// --- gates ---
for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction", "postureControl"]) storage.setFeature(k, true);
storage.setFeature("triggerControl", false);
storage.setTrustValue(HYP, "GameBot", 70);
// Refusals must name the actual problem — atmospheric text here left DW guessing why a
// trigger wouldn't plant, so the assertions check for the specific cause.
triggers.beginRecording(HYP, "GameBot", "sleepy");
check("refused without permission", /not enabled "Triggers"/.test(lastToHypnotist()), true);
check("  nothing recorded", triggers.isRecording(), false);

storage.setFeature("triggerControl", true);
// DEPTH is the gate as of v0.50.0, not trust. Trust decided how deep this induction could
// go; planting asks only whether they got there.
storage.setTrustValue(HYP, "GameBot", 90);
depth.setCurrentDepths(30, 30); // Yielding — nowhere near the Deep that planting needs
triggers.beginRecording(HYP, "GameBot", "sleepy");
check("refused above the tier's floor", /needs Deep/.test(lastToHypnotist()), true);
check("  nothing recorded", triggers.isRecording(), false);
check("  and high trust does not buy it", /trust/.test(lastToHypnotist()), false);

// Deep enough in the FULL sense but not the earned one: arousal got them there, and arousal
// may never write something that outlives the session. The rule the two depths exist for.
depth.setCurrentDepths(80, 30);
triggers.beginRecording(HYP, "GameBot", "sleepy");
check("arousal cannot buy a trigger", triggers.isRecording(), false);
check("  and says why", /arousal does not count/.test(lastToHypnotist()), true);

// --- record and commit ---
depth.setCurrentDepths(80, 80);
storage.setTrustValue(HYP, "GameBot", 70);
triggers.beginRecording(HYP, "GameBot", "sleepy time");
check("recording started", triggers.isRecording(), true);
triggers.recordAction("movement-block");
triggers.recordAction("speech-block");
triggers.commitRecording();
check("recording cleared", triggers.isRecording(), false);
const stored = storage.listTriggers();
check("one trigger stored", stored.length, 1);
check("  phrase", stored[0].phrase, "sleepy time");
check("  actions", stored[0].actions, ["movement-block", "speech-block"]);

// --- matching ---
check("matches installer", triggers.triggersFiredBy(HYP, "sleepy time now missy").length, 1);
check("ignores other speaker", triggers.triggersFiredBy(OTHER, "sleepy time").length, 0);
check("ignores unrelated line", triggers.triggersFiredBy(HYP, "hello there").length, 0);

// --- firing, with NO session (the whole point) ---
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
drainPaced(); // let the paced steps past the first land before counting
check("fires outside a session", said.length >= 2, true);

// permission revoked disarms that action
storage.setFeature("speechRestriction", false);
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
check("revoked permission skips its action", said.length, 1);

// master switch disarms everything
storage.setFeature("hypnoEnabled", false);
said = [];
voice.handleSpokenLine(HYP, "sleepy time");
check("hypnoEnabled off disarms all", said.length, 0);

// --- future-tense phrasing records the same actions ---
// "when I say X, you will not be able to move" reads better while building a trigger than
// repeating the immediate wording, and maps to the same action.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("speechRestriction", true);
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "deep blue");
const rec = (t) => {
	const id = voice.matchSuggestion(t);
	if (id) triggers.recordAction(id);
	return id;
};
check("future: unable to move", rec("you will not be able to move"), "movement-block");
check("future: unable to speak", rec("you will be unable to speak"), "speech-block");
check("future: will not move", voice.matchSuggestion("you will not move"), "movement-block");
check("future: clothes", voice.matchSuggestion("you will not be able to change your clothes"), "clothing-block");
triggers.commitRecording();
check("future phrasing stored", storage.listTriggers()[0].actions, ["movement-block", "speech-block"]);

// --- bare "wake" ---
check("bare wake", voice.isWakeLine("Missy wake"), true);
check("wake up still works", voice.isWakeLine("Missy wake up"), true);
check("first-person wake ignored", voice.isWakeLine("i wake early"), false);


// --- body-part commands: future phrasing, and recordable into a trigger ---
// Driven through the parser and recorder directly rather than handleSpokenLine, because
// the body-part path requires a live trance and standing one up here would mean waiting
// out a real induction window.
check(
	"future: unable to touch part",
	voice.matchBodyPartCommand("you will not be able to touch your breasts")?.word,
	"breasts",
);
check("plain: will not touch part", voice.matchBodyPartCommand("you will not touch your pussy")?.word, "pussy");
check(
	"future: unable to touch self",
	voice.matchBodyPartCommand("you will not be able to touch yourself")?.all,
	true,
);

storage.setFeature("selfTouchControl", true);
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "no touchy");
triggers.recordAction("touch:breasts");
triggers.recordAction("touch:pussy");
triggers.commitRecording();
check("body parts stored as parameterised ids", storage.listTriggers()[0].actions, ["touch:breasts", "touch:pussy"]);

// --- firing a body-part trigger ---
said = [];
voice.handleSpokenLine(HYP, "no touchy");
drainPaced(); // both parts, one paced step at a time
check("body-part trigger fires both", said.length, 2);

storage.setFeature("selfTouchControl", false);
said = [];
voice.handleSpokenLine(HYP, "no touchy");
check("revoked self-touch disarms them", said.length, 0);
storage.setFeature("selfTouchControl", true);

// --- pacing: a multi-action trigger lands one step at a time (v0.72.5) --------------------------
// DW: a trigger used to do everything in one tick, so the body did them all at once. Now the first
// action lands immediately and the rest drain on a short delay — one at a time, more watchable.
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "one by one");
triggers.recordAction("touch:breasts");
triggers.recordAction("touch:pussy");
triggers.recordAction("touch:ass");
triggers.commitRecording();
said = [];
voice.handleSpokenLine(HYP, "one by one");
check("only the first action lands at once", said.length, 1);
drainPaced();
check("the rest arrive on the paced clock", said.length, 3);

// --- a compel action does not put the trigger into "holding" (v0.72.4/.5) -----------------------
// A compel is a one-shot event, not a grip. It must not mark the trigger active, or the list would
// show ** HOLDING YOU NOW ** and /hypno forgettrigger would refuse — for something holding nothing.
storage.setFeature("compelActivity", true);
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "act now");
triggers.recordAction("act:Caress:breasts");
triggers.commitRecording();
voice.handleSpokenLine(HYP, "act now");
drainPaced();
check("a compel-only trigger is not 'holding' the subject", voice.isTriggerInEffect(storage.listTriggers()[0]), false);
storage.forgetAllTriggers();

// --- the phrase never reaches the subject ---
// The subject sees atmosphere; the hypnotist gets the phrase. A subject who can read their
// own trigger word can simply decide not to react to it.
sentToHypnotist = [];
const subjectLine = triggers.beginRecording(HYP, "GameBot", "secret word");
check("subject line hides the phrase", /secret word/.test(subjectLine), false);
check("hypnotist line has the phrase", /secret word/.test(lastToHypnotist()), true);
triggers.cancelRecording();

// --- releasing a trigger by name, out of trance ---
// General release wording deliberately does NOT work outside a session; only the targeted
// "you are released from <trigger>" does, so ordinary hypnosis phrasing never operates on
// someone who isn't under.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("movementRestriction", true);
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "frozen");
triggers.recordAction("movement-block");
triggers.commitRecording();
said = [];
voice.handleSpokenLine(HYP, "frozen");
check("trigger fires out of trance", said.length, 1);

said = [];
voice.handleSpokenLine(HYP, "Missy you can move again");
check("general release does NOT work out of trance", said.length, 0);
said = [];
voice.handleSpokenLine(HYP, "Missy you cannot move");
check("restriction does NOT work out of trance", said.length, 0);

said = [];
voice.handleSpokenLine(HYP, "Missy you are released from frozen");
check("named release works out of trance", said.length, 1);
said = [];
voice.handleSpokenLine(OTHER, "Missy you are released from frozen");
check("only the installer can release it", said.length, 0);

// --- a second trigger does not overwrite the first ---
triggers.beginRecording(HYP, "GameBot", "no touchy");
triggers.recordAction("touch:breasts");
triggers.commitRecording();
check("two triggers coexist", storage.listTriggers().length, 2);
triggers.beginRecording(HYP, "GameBot", "frozen");
triggers.recordAction("speech-block");
triggers.commitRecording();
check("same phrase replaces, not duplicates", storage.listTriggers().length, 2);
check("  replaced actions", storage.listTriggers().find(t => t.phrase === "frozen").actions, ["speech-block"]);

// --- per-suggestion trust threshold, re-checked at FIRING time ---
// Planting and firing are separate checks on purpose. A trigger planted while trusted has
// to go quiet again if that trust later falls — through decay, or through the subject
// simply setting it lower — rather than outliving the trust that authorised it.
//
// Deliberately expressed as "above the gate" and "below it" rather than with literal
// numbers: planting, carrying and the illusion all sit at 65 today, and the point of the
// assertion survives any of those moving.
storage.setFeature("illusionControl", true);
storage.forgetAllTriggers();
storage.setTrustValue(HYP, "GameBot", 80);
triggers.beginRecording(HYP, "GameBot", "look away");
check("plants while trusted", triggers.isRecording(), true);
triggers.recordAction("illusion-block");
triggers.commitRecording();
said = [];
voice.handleSpokenLine(HYP, "look away");
check("and fires while still trusted", said.length, 1);

// A trigger already planted keeps firing whatever the depth is now — the whole point of one
// is that it works outside a trance, where there is no depth at all. Firing is gated by the
// trigger's own scope and by each action's permission, not by how deep you are today.
depth.setCurrentDepths(0, 0);
said = [];
voice.handleSpokenLine(HYP, "look away");
check("a planted trigger fires with no trance at all", said.length, 1);

// But planting a NEW one down here is refused, so a trigger cannot be created by somebody
// who is not deep enough to be planting anything.
storage.forgetAllTriggers();
triggers.beginRecording(HYP, "GameBot", "look back");
check("  though nothing new can be planted", triggers.isRecording(), false);
depth.setCurrentDepths(80, 80);
storage.setTrustValue(HYP, "GameBot", 70);

// --- "is it holding me right now" ------------------------------------------------------
// What /hypno forgettrigger refuses on. Tracked separately from the auto-release timer
// because a duration of 0 means no timer and still very much in force — which is exactly
// the case where a subject would most want to delete their way out.
storage.setTriggerScope("hypnotist");
storage.setFeature("movementRestriction", true);
storage.forgetAllTriggers();
storage.setTriggerDuration(0); // no clock at all
triggers.beginRecording(HYP, "GameBot", "hold me");
triggers.recordAction("movement-block");
triggers.commitRecording();
const held = () => storage.listTriggers()[0];
check("not in effect before it fires", voice.isTriggerInEffect(held()), false);
voice.handleSpokenLine(HYP, "hold me");
check("in effect after firing, with no timer running", voice.isTriggerInEffect(held()), true);
voice.handleSpokenLine(HYP, "Missy you are released from hold me");
check("released clears the marker", voice.isTriggerInEffect(held()), false);

// Firing again then wiping everything — the marker must not outlive the effects, or a
// subject would be told something is holding them when nothing is.
voice.handleSpokenLine(HYP, "hold me");
check("held again", voice.isTriggerInEffect(held()), true);
timers.clearAllTimers();
check("a full clear drops the marker too", voice.isTriggerInEffect(held()), false);
storage.setTriggerDuration(5);

// --- auto-release after the configured duration ---
// setTimeout is stubbed so the clock can be driven rather than waited on.
storage.setTriggerScope("hypnotist");
storage.setFeature("movementRestriction", true);
storage.forgetAllTriggers();
storage.setTriggerDuration(5);
check("duration stored", storage.getTriggerDuration(), 5);
check("duration clamps negatives", storage.setTriggerDuration(-3), 0);
check("duration clamps absurd", storage.setTriggerDuration(99999), 1440);
storage.setTriggerDuration(5);

// --- who gets to see the trigger WORD ---------------------------------------------------
// The phrase is the one part of a trigger that is optional to show. Everything else — that
// it exists, who planted it, what it does — is always listed, so nothing is ever happening
// to the subject unseen. Two independent ways to reveal it, and they are different in kind:
// a setting the player chose, and a testing argument that stops existing at release.
storage.setFeature("triggerControl", true);
storage.setTrustValue(HYP, "GameBot", 70);
triggers.beginRecording(HYP, "GameBot", "butterfly");
triggers.recordAction("movement-block");
triggers.commitRecording();

const listed = (full) => voice.describeTriggerList(full).join(" | ");

storage.setFeature("showTriggerWords", false);
check("hidden by default", /phrase hidden/.test(listed(false)), true);
check("  and the word never leaks", /butterfly/.test(listed(false)), false);
// What IS always shown, hidden phrase or not — this is the line between private and secret.
check("  but the trigger is still listed", /movement-block/.test(listed(false)), true);
check("  with who planted it", /GameBot/.test(listed(false)), true);

check("the setting reveals it", /butterfly/.test((storage.setFeature("showTriggerWords", true), listed(false))), true);
check("  and says so plainly", /phrase hidden/.test(listed(false)), false);

// `full` is the testing override, independent of the setting. Asserted against isTestingMode()
// rather than `true`, so this stays correct in a shipped build where testing is room-gated and
// off by default — here the harness pins it on, so isTestingMode() is true.
storage.setFeature("showTriggerWords", false);
check("full reveals only while testing", /butterfly/.test(listed(true)), build.isTestingMode());
check("  without changing the setting", storage.getFeatures().showTriggerWords, false);
check("  so the plain listing still hides", /butterfly/.test(listed(false)), false);

// The whole point of routing both through one predicate: it is the only thing to check.
check("predicate agrees — setting off, no full", voice.triggerPhrasesVisible(false), false);
check("predicate agrees — full asked", voice.triggerPhrasesVisible(true), build.isTestingMode());
storage.setFeature("showTriggerWords", true);
check("predicate agrees — setting on", voice.triggerPhrasesVisible(false), true);
storage.setFeature("showTriggerWords", false);

storage.forgetTrigger(1);

// --- Reinforcement and decay (v0.60.0) ------------------------------------------------------
// The arithmetic, which is the part worth pinning: everything else about decay is wiring, but
// a wrong rate quietly eats somebody's triggers and nobody notices until they are gone.
const DAY = 86_400_000;
const plant = (phrase, depthAt, chemical = false, ago = 0) => {
	const t = {
		phrase,
		actions: ["movement-block"],
		installedBy: HYP,
		installedByName: "GameBot",
		installedAt: Date.now() - ago,
		plantedDepth: depthAt,
		plantedChemical: chemical,
		reinforcedAt: Date.now() - ago,
		firings: 0,
	};
	storage.saveTrigger(t);
	return t;
};

storage.forgetAllTriggers();
storage.setTriggerDecayRate("never");
const kept = plant("kept", 80, false, 30 * DAY);
check("never means never, even after a month", triggers.triggerStrength(kept), 80);

// RETUNED IN v0.62.0 and every number below moved. The rates went up roughly twentyfold and
// the curve stopped being a straight line, because "very fast" used to give a Blank planting
// three weeks. The expected values here are worked out by hand from the published constants —
// rate x days x (1 + days/14), then the tier discount — rather than read back off the
// implementation, which is the only way this suite could ever have caught the old tuning.

// Deeper holds longer. Same rate, same elapsed time, different planting depth — the doc's
// "harder to plant, harder to lose".
storage.setTriggerDecayRate("typical"); // 40/day before the tier discount
storage.forgetAllTriggers();
const HALF = 0.5 * DAY; // accel factor at half a day: 1 + 0.5/14 = 1.0357
const shallow = plant("shallow", 20, false, HALF); // yielding x0.8 -> 32/day -> 16.57 lost
const deep = plant("deep", 60, false, HALF); // deep x0.4 -> 16/day -> 8.29 lost
const blank = plant("blank", 80, false, HALF); // blank x0.25 -> 10/day -> 5.18 lost
check("a shallow planting fades fastest", triggers.triggerStrength(shallow), 3);
check("  a deep one slower", triggers.triggerStrength(deep), 52);
check("  and Blank slowest of all", triggers.triggerStrength(blank), 75);

// The whole point of the mechanic: a faded trigger reaches less far than it did.
check("a faded Deep trigger no longer reaches Deep", depth.depthAllows("triggerControl", 52, 52), false);
check("  but still reaches Yielding", depth.depthAllows("movementRestriction", 52, 52), true);

// NEGLECT COMPOUNDS — the v0.62.0 curve, and the one property a straight line cannot have.
// Deep at typical is 16/day: one day costs 16 x 1 x (1+1/14) = 17.1, two days cost
// 16 x 2 x (1+2/14) = 36.6. More than double the loss for double the time.
storage.forgetAllTriggers();
const oneDay = plant("oneday", 60, false, 1 * DAY);
const twoDay = plant("twoday", 60, false, 2 * DAY);
check("one day of neglect", triggers.triggerStrength(oneDay), 43);
check("  two days costs MORE than twice as much", triggers.triggerStrength(twoDay), 23);
check("  which is what makes it a deadline rather than a slope",
	60 - triggers.triggerStrength(twoDay) > 2 * (60 - triggers.triggerStrength(oneDay)), true);

// Firing slows the clock without resetting it. The credit is a fraction of the trigger's OWN
// lifetime now, not a flat number of days — at these rates a flat quarter-day would be
// immortality at one end of the dial and a rounding error at the other. A Deep planting at
// typical lives 3.07 days, so each firing buys 6% of that and the cap is half of it.
storage.forgetAllTriggers();
const used = plant("used", 60, false, 2 * DAY);
const unused = plant("unused", 60, false, 2 * DAY);
used.firings = 4; // 24% of 3.07 = 0.74 days credited, so 1.26 days of loss not 2
check("firing buys back some of the clock", triggers.triggerStrength(used), 38);
check("  but never all of it — it is still below full", triggers.triggerStrength(used) < used.plantedDepth, true);
used.firings = 400; // capped at half a lifetime, 1.54 days
check("  and the credit is capped", triggers.triggerStrength(used), 52);
check("  while an unused one keeps fading", triggers.triggerStrength(unused), 23);

// Only a re-induction resets it.
triggers.reinforceTriggersBy(HYP);
check("reinforcement restores full strength", triggers.triggerStrength(unused), 60);
check("  and clears the firing credit", unused.firings, 0);

// Chemically seeded triggers pay a fixed price that the setting cannot lower: 150/day with no
// tier discount at all, against 1.25/day for the same planting earned at the slowest setting.
storage.forgetAllTriggers();
storage.setTriggerDecayRate("veryslow");
const QUARTER = 0.25 * DAY;
const earned = plant("earned", 80, false, QUARTER); // blank x0.25 -> 1.25/day -> 0.32 lost
const chem = plant("chem", 80, true, QUARTER); // flat 150/day -> 38.17 lost
check("a slow setting protects an earned trigger", triggers.triggerStrength(earned), 80);
check("  but not a chemically seeded one", triggers.triggerStrength(chem), 42);
storage.setTriggerDecayRate("never");
check("even 'never' does not protect it", triggers.triggerStrength(chem), 42);

// Far enough gone is a feeling and nothing more, and then it is gone.
storage.setTriggerDecayRate("veryfast"); // 300/day
storage.forgetAllTriggers();
const ghost = plant("ghost", 20, false, 0.07 * DAY); // yielding x0.8 -> 240/day -> 16.9 lost
check("a nearly-dead trigger is a ghost", triggers.triggerStrength(ghost) < triggers.TRIGGER_GHOST_THRESHOLD, true);
const dead = plant("dead", 20, false, 0.2 * DAY);
check("  and eventually nothing", triggers.triggerStrength(dead), 0);

// The dial says what it costs, in time. This is the assertion that would have failed loudest
// against the old tuning, where "Very fast" quietly meant twenty-one days.
check("very fast means hours, not weeks", /\b\d+ hours\b/.test(triggers.describeDecayPace("veryfast")), true);
check("  very slow means days", /\b[\d.]+ days\b/.test(triggers.describeDecayPace("veryslow")), true);
check("  and never says so plainly", triggers.describeDecayPace("never").startsWith("never"), true);
check("pruning sweeps the dead one", triggers.pruneFadedTriggers(() => false), 1);
check("  and leaves the ghost, which still does something", storage.listTriggers().length, 1);

// A trigger that is currently HOLDING the subject is never swept — dropping it would strand
// the grip with nothing left to release it, which is a bug this codebase has fixed twice.
storage.forgetAllTriggers();
plant("holding", 20, false, 10 * DAY);
check("a held trigger survives the sweep", triggers.pruneFadedTriggers(() => true), 0);
check("  and is still there", storage.listTriggers().length, 1);
// --- TESTING-ONLY aging (v0.63.0) ---------------------------------------------------------
// The affordance the live decay scenario is blocked on. Everything above is arithmetic proved
// against hand-worked numbers; this is the only way any of it gets looked at by a person, since
// the second reading of a real trigger is a day away.
//
// Asserted AGAINST THE FLAG, like `full` further up, so this suite stays correct after the
// release flip instead of failing on the day somebody is trying to ship.
storage.forgetAllTriggers();
storage.setTriggerDecayRate("typical"); // Deep x0.4 -> 16/day, the same row as the checks above
const young = plant("young", 60, false, 0);
check("a fresh planting is at full strength", triggers.triggerStrength(young), 60);

const firstAge = triggers.ageTriggers(1);
check("aging works only while testing", firstAge.refusal === null, build.isTestingMode());
if (build.isTestingMode()) {
	check("  and says what it moved", firstAge.aged, 1);
	// The point of the whole thing: a day of clock is a day of decay, identical to a day of
	// waiting. If these two ever disagree the tool is measuring itself rather than the model.
	check("  a day of clock equals a day elapsed", triggers.triggerStrength(young), 43);
	// RELATIVE, so two calls compound — which is how the acceleration is observed from two
	// readings rather than from a total worked out by hand.
	triggers.ageTriggers(1);
	check("  aging again compounds rather than replacing", triggers.triggerStrength(young), 23);
	check("  so the second day costs more than the first", 60 - 23 > 2 * (60 - 43), true);

	// It moves the clock and NOTHING else. Zeroing the firing credit here would quietly make
	// "firing slows decay but never resets it" unfalsifiable — the live step would pass against
	// an implementation that had the rule backwards.
	young.firings = 4;
	triggers.ageTriggers(0.5);
	check("  the firing credit survives aging", young.firings, 4);

	// Negative winds it forward, for a run that overshot. Capped at now, because a trigger
	// reinforced in the future is not a state the rest of the model has an answer for.
	triggers.ageTriggers(-500);
	check("  a negative number winds the clock forward", triggers.triggerStrength(young), 60);
	check("  and cannot push it past now", young.reinforcedAt <= Date.now(), true);

	// By NUMBER, not phrase — the phrase is hidden from the subject by setting, and a testing
	// command must not be the way round that. One number, one trigger.
	storage.forgetAllTriggers();
	young.firings = 0;
	const first = plant("first", 60, false, 0);
	const second = plant("second", 60, false, 0);
	triggers.ageTriggers(1, 2);
	check("  a number ages that one only", triggers.triggerStrength(first), 60);
	check("  and it is the one it named", triggers.triggerStrength(second), 43);
	check("  no phrase leaks into the report", /first|second/.test(triggers.ageTriggers(1, 1).lines.join(" ")), false);

	// Refusals, because a silent no-op reads exactly like a working command against a build
	// where nothing happens to be planted.
	check("  an out-of-range number is refused", triggers.ageTriggers(1, 9).refusal !== null, true);
	check("  and nothing moved with it", triggers.triggerStrength(second), 43);
	check("  zero days is refused rather than silently doing nothing", triggers.ageTriggers(0).refusal !== null, true);
	storage.forgetAllTriggers();
	check("  with nothing planted it says so", triggers.ageTriggers(1).refusal, "no triggers planted");

	// It does not prune: a trigger aged past zero reads "faded away" and goes on the next list
	// read, which is where pruning belongs and is itself what the live step checks.
	const doomed = plant("doomed", 20, false, 0);
	triggers.ageTriggers(30);
	check("  aging past zero leaves it dead but present", triggers.triggerStrength(doomed), 0);
	check("  and listed until something reads the list", storage.listTriggers().length, 1);
	check("  which sweeps it", (voice.describeTriggerList(false), storage.listTriggers().length), 0);
}

storage.forgetAllTriggers();
storage.setTriggerDecayRate("never");

// --- born-ghost guard (v0.72.6) -----------------------------------------------------------------
// DW planted "funtime" at Drifting (depth 0) and it fired nothing but flavour. Two fixes:
//   1. triggerStrength of a depth-0 trigger is 0, not NaN. lifeDays(0) is Infinity and the
//      first-fire firing credit is 0, so `0 * Infinity` used to make it NaN — and
//      `NaN < GHOST_THRESHOLD` is false, so the ghost guard was skipped that once and the
//      trigger fired its ungated (compel) actions from a husk. Hence "spanked once, then inert".
const bornZero = plant("bornzero", 0, false, 0);
check("a depth-0 trigger is strength 0, never NaN", triggers.triggerStrength(bornZero), 0);
check("  so it reads as a ghost, not a one-time flicker", triggers.triggerStrength(bornZero) < triggers.TRIGGER_GHOST_THRESHOLD, true);
storage.forgetAllTriggers();

//   2. Planting is refused below the ghost threshold, so a born-dead trigger cannot be saved.
//      Only reachable when the triggerControl gate is lowered enough to plant at Drifting.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("triggerControl", true);
storage.setDepthOverride("triggerControl", "drifting"); // let planting reach shallow depths at all
depth.setCurrentDepths(5, 5); // below the ghost threshold (10)
sentToHypnotist = [];
triggers.beginRecording(HYP, "GameBot", "dead on arrival");
check("planting below the ghost line is refused", triggers.isRecording(), false);
check("  and the hypnotist is told it would be a ghost", /ghost|faint/i.test(lastToHypnotist()), true);
// Just above the threshold it plants — shallow, but able to fire.
depth.setCurrentDepths(15, 15);
triggers.beginRecording(HYP, "GameBot", "faint but alive");
check("just above the ghost line plants", triggers.isRecording(), true);
triggers.cancelRecording();
storage.setDepthOverride("triggerControl", "deep"); // restore the default gate
depth.setCurrentDepths(80, 80);
storage.forgetAllTriggers();

// --- Phrase uniqueness and override (v0.74.0) --------------------------------------------
// A phrase is unique per subject. design.md "Trigger Phrase Uniqueness and Override" is the
// spec; these pin the settled rules and, as much as the wording, the DISCLOSURE shape — a
// refusal must not hand a probing hypnotist someone else's hidden trigger phrase or its depth.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("triggerControl", true);
// Lower the depth gate so planting is allowed at shallow depths — isolates the uniqueness
// rules from the separate depth gate, the same trick the born-ghost block uses.
storage.setDepthOverride("triggerControl", "drifting");
storage.forgetAllTriggers();

const plantBy = (phrase, by, byName, depthAt) => {
	storage.saveTrigger({
		phrase, actions: ["movement-block"], installedBy: by, installedByName: byName,
		installedAt: Date.now(), plantedDepth: depthAt, plantedChemical: false,
		reinforcedAt: Date.now(), firings: 0,
	});
};
const holds = (phrase) => (t) => t.phrase === phrase; // stand-in for isTriggerInEffect

// MIN length is now 6, on the plant path only.
depth.setCurrentDepths(80, 80);
sentToHypnotist = [];
triggers.beginRecording(HYP, "GameBot", "cat");
check("phrase under 6 chars is refused", triggers.isRecording(), false);
check("  and told the minimum", /at least 6/.test(lastToHypnotist()), true);

// Grandfathering: a stored short phrase (planted before the floor rose — here forced past the
// plant check) still fires. normalise never purges it; only re-planting is blocked.
plantBy("cat", HYP, "GameBot", 80);
check("a grandfathered short phrase still fires", triggers.triggersFiredBy(HYP, "cat").length, 1);
storage.forgetAllTriggers();

// Exact + same installer → override, even at a SHALLOWER depth than the original.
plantBy("ownword", HYP, "GameBot", 80);
depth.setCurrentDepths(20, 20); // shallower than the 80 it was planted at
triggers.beginRecording(HYP, "GameBot", "ownword", holds("nothing"));
check("own exact re-plant is allowed even shallower", triggers.isRecording(), true);
triggers.recordAction("speech-block");
triggers.commitRecording(holds("nothing"));
check("  it replaced rather than duplicated", storage.listTriggers().length, 1);
check("  with the new actions", storage.listTriggers()[0].actions, ["speech-block"]);
check("  and the new, shallower planted depth", storage.listTriggers()[0].plantedDepth, 20);
storage.forgetAllTriggers();

// Exact + different installer → gated on earned depth vs the stored plantedDepth.
plantBy("theirword", OTHER, "Someone", 40);
depth.setCurrentDepths(30, 30); // earned 30 <= their 40
sentToHypnotist = [];
triggers.beginRecording(HYP, "GameBot", "theirword", holds("nothing"));
check("cannot take a deeper-planted word", triggers.isRecording(), false);
check("  told 'not deep enough'", /not deep enough/.test(lastToHypnotist()), true);
check("  WITHOUT leaking their planting depth (no number)", /\d/.test(lastToHypnotist()), false);

depth.setCurrentDepths(60, 60); // earned 60 > their 40
triggers.beginRecording(HYP, "GameBot", "theirword", holds("nothing"));
check("can take it when deep enough", triggers.isRecording(), true);
triggers.recordAction("movement-block");
const displaced = triggers.commitRecording(holds("nothing"));
check("  override replaces the record", storage.listTriggers().length, 1);
check("  now attributed to the taker", storage.listTriggers()[0].installedBy, HYP);
check("  and she gets a displacement line", /comes loose/.test(displaced), true);
storage.forgetAllTriggers();

// A subject's OWN re-plant is maintenance, not displacement — the ordinary line.
plantBy("mineword", HYP, "GameBot", 60);
depth.setCurrentDepths(60, 60);
triggers.beginRecording(HYP, "GameBot", "mineword", holds("nothing"));
triggers.recordAction("movement-block");
const ownLine = triggers.commitRecording(holds("nothing"));
check("own re-plant gets the ordinary line, not displacement", /comes loose/.test(ownLine), false);
storage.forgetAllTriggers();

// Containment either way is a collision and NEVER overrides.
depth.setCurrentDepths(80, 80);
plantBy("sleepy time", OTHER, "Someone", 80);
sentToHypnotist = [];
triggers.beginRecording(HYP, "GameBot", "sleepy time now", holds("nothing")); // contains theirs
check("a phrase that CONTAINS an existing one is refused", triggers.isRecording(), false);
check("  vague refusal names no phrase", /sleepy/.test(lastToHypnotist()), false);
check("  and no number", /\d/.test(lastToHypnotist()), false);
// The other direction: their phrase contains ours.
plantBy("goodnight moon", OTHER, "Someone", 80);
triggers.beginRecording(HYP, "GameBot", "goodnight", holds("nothing")); // contained BY theirs
check("a phrase CONTAINED BY an existing one is refused", triggers.isRecording(), false);
storage.forgetAllTriggers();

// Own-overlap is the one chatty branch — his word, so naming it leaks nothing and helps.
plantBy("keyphrase", HYP, "GameBot", 80);
triggers.beginRecording(HYP, "GameBot", "keyphrase extra", holds("nothing"));
check("overlap with your OWN word names it", /keyphrase/.test(lastToHypnotist()), true);
storage.forgetAllTriggers();

// Holding: refuse an override while the conflicting trigger is in effect.
plantBy("holdword", HYP, "GameBot", 80);
triggers.beginRecording(HYP, "GameBot", "holdword", holds("holdword"));
check("own word refused while it is holding her", triggers.isRecording(), false);
check("  and says it is holding her", /holding/.test(lastToHypnotist()), true);
plantBy("graspword", OTHER, "Someone", 40);
depth.setCurrentDepths(60, 60); // entitled, but it is holding
triggers.beginRecording(HYP, "GameBot", "graspword", holds("graspword"));
check("an entitled take is still refused while it holds her", triggers.isRecording(), false);
storage.forgetAllTriggers();

// Rename-in-place: a start phrase mid-recording renames, keeping the recorded actions.
depth.setCurrentDepths(80, 80);
triggers.beginRecording(HYP, "GameBot", "firstname", holds("nothing"));
triggers.recordAction("movement-block");
triggers.recordAction("speech-block");
triggers.renameRecording(HYP, "secondname", holds("nothing"));
check("still recording after a rename", triggers.isRecording(), true);
triggers.commitRecording(holds("nothing"));
const renamed = storage.listTriggers();
check("renamed to the second phrase", renamed[0].phrase, "secondname");
check("  keeping the actions recorded before the rename", renamed[0].actions, ["movement-block", "speech-block"]);
storage.forgetAllTriggers();

// A rename to an invalid phrase is refused and keeps the recording (and its actions) intact.
triggers.beginRecording(HYP, "GameBot", "keepname", holds("nothing"));
triggers.recordAction("movement-block");
triggers.renameRecording(HYP, "no", holds("nothing")); // too short
check("rename to a too-short phrase is refused", /too short/.test(lastToHypnotist()), true);
triggers.commitRecording(holds("nothing"));
check("  the original recording survived it", storage.listTriggers()[0].phrase, "keepname");
check("  with its actions", storage.listTriggers()[0].actions, ["movement-block"]);
storage.forgetAllTriggers();

// Commit-time re-check: a phrase taken during the recording window holds the recording open.
triggers.beginRecording(HYP, "GameBot", "raceword", holds("nothing"));
triggers.recordAction("movement-block");
plantBy("raceword", OTHER, "Someone", 90); // planted mid-recording, deeper than we can take
depth.setCurrentDepths(30, 30);
sentToHypnotist = [];
const heldOpen = triggers.commitRecording(holds("nothing"));
check("a commit-time collision holds the recording open", triggers.isRecording(), true);
check("  nothing lost — no subject line", heldOpen, "");
check("  and the actions are kept for a rename", /suggestion\(s\) you recorded are kept/.test(lastToHypnotist()), true);
triggers.cancelRecording();
storage.forgetAllTriggers();

// Rate limit: once past the cap of characterised collision refusals, further ones go flat, so
// the yes/no oracle can't be bisected. The characterised forms (vague containment, not-deep)
// are asserted above while the counter was still under the cap; four have fired by now, so a
// short run of fresh collisions is over the cap and comes back flat.
depth.setCurrentDepths(80, 80);
plantBy("limitword", OTHER, "Someone", 90);
let lastRefusal = "";
for (let i = 0; i < 3; i++) {
	sentToHypnotist = [];
	triggers.beginRecording(HYP, "GameBot", "limitword tail", holds("nothing")); // foreign containment
	lastRefusal = lastToHypnotist();
}
check("collision refusals go flat once the cap is passed", /too many trigger attempts/.test(lastRefusal), true);
check("  and the flat form leaks nothing", /limitword|\d/.test(lastRefusal), false);
storage.forgetAllTriggers();
storage.setDepthOverride("triggerControl", "deep");
depth.setCurrentDepths(80, 80);

console.log(`triggers: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
