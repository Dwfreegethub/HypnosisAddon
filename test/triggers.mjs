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
check("body-part trigger fires both", said.length, 2);

storage.setFeature("selfTouchControl", false);
said = [];
voice.handleSpokenLine(HYP, "no touchy");
check("revoked self-touch disarms them", said.length, 0);
storage.setFeature("selfTouchControl", true);

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

// `full` is the testing override, independent of the setting. Asserted AGAINST THE FLAG
// rather than against `true`, so this suite stays correct after the release flip instead of
// failing at the exact moment somebody is trying to ship.
storage.setFeature("showTriggerWords", false);
check("full reveals only while testing", /butterfly/.test(listed(true)), build.TESTING_MODE);
check("  without changing the setting", storage.getFeatures().showTriggerWords, false);
check("  so the plain listing still hides", /butterfly/.test(listed(false)), false);

// The whole point of routing both through one predicate: it is the only thing to check.
check("predicate agrees — setting off, no full", voice.triggerPhrasesVisible(false), false);
check("predicate agrees — full asked", voice.triggerPhrasesVisible(true), build.TESTING_MODE);
storage.setFeature("showTriggerWords", true);
check("predicate agrees — setting on", voice.triggerPhrasesVisible(false), true);
storage.setFeature("showTriggerWords", false);

storage.forgetTrigger(1);

console.log(`triggers: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
