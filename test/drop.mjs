// Instant drop triggers, v0.90.0 (design.md, "Trigger Overhaul", Build 4, decision 10).
//
// A trigger may carry a drop: said, it puts the subject straight into trance, with no prompt and
// no roll. The subject's setting is Off (default) / One time / Unlimited and is the ceiling; a
// drop trigger is one-time unless its installer said "every time". Who may drop her is the
// induction attempt's own gate. The speaker becomes the hypnotist; the depth is the trigger's
// strength, with the earned half 0 for a chemically seeded trigger (rule 4).
//
// Every block states what failure looks like.
const HYP = 246108, OTHER = 999, AWAY = 777;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: OTHER, Name: "Rei" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toSpeaker = [];
globalThis.ServerSend = (type, data) => {
	if (type === "ChatRoomChat" && data?.Type === "Hidden") {
		const m = data?.Dictionary?.[0]?.message;
		if (m?.type === "trigger-status") toSpeaker.push({ to: data.Target, text: m.text });
	}
};
const lastTo = (who) => [...toSpeaker].reverse().find((m) => m.to === who)?.text ?? "";
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(typeof m === "string" ? m : String(m?.textContent ?? m));
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};

const { depth, voice, storage, triggers, session } = await import("./harness-bundle.mjs");
const lz = (await import("lz-string")).default;

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- parsing -------------------------------------------------------------------------------------
// Failure: a drop line is missed, or kneel / an everyday line is read as a drop.
const p = (t) => voice.parseTriggerControl(t);
for (const line of [
	"Missy, you will drop into trance",
	"Missy, you'll sink deep into trance",
	"Missy, you will fall straight under",
	"Missy, you drop right back into a deep trance",
	"Missy, it will put you straight under",
	"Missy, the words take you deep into trance",
]) check(`drop: "${line}"`, p(line), { kind: "drop" });
for (const line of [
	"Missy, drop on your knees",
	"Missy, you will drop your arms",
	"Missy, you go under the table",
	"Missy, you will sink",
	"Missy, you cannot move",
]) check(`not a drop: "${line}"`, p(line)?.kind === "drop", false);
check("start line with its own drop clause", p("Missy, when you hear ember glow, you will drop into trance"), { kind: "start", phrase: "ember glow", drop: true });
check("  joined with 'and'", p("Missy, your trigger word is ember glow and you will sink into trance"), { kind: "start", phrase: "ember glow", drop: true });
check("  a plain start is unchanged", p("Missy, your trigger word is ember glow"), { kind: "start", phrase: "ember glow" });
check("the detail view names it", voice.describeAction(triggers.DROP_ACTION), "you drop straight into trance");

// --- the setting -----------------------------------------------------------------------------------
check("off by default", storage.getDropMode(), "off");
check("an invalid mode reads as off", storage.setDropMode("sometimes"), "off");
{
	const blob = { version: "0.89.0", trust: [], experience: 0, triggers: [], triggerScope: "hypnotist", triggerDurationMinutes: 5, decayRate: "never", triggerDecayRate: "never", depthGates: {}, chemicalScope: "arousal", relationshipOverride: {}, features: { hypnoEnabled: true }, dropTriggers: "always" };
	storage.importSettings(lz.compressToBase64(JSON.stringify(blob)));
	check("an invalid stored mode loads as off", storage.getDropMode(), "off");
}

// --- setup -----------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "movementRestriction", "triggerControl", "tranceCannotMove"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.forgetAllTriggers();
depth.setCurrentDepths(80, 80);
const find = (phrase) => storage.listTriggers().find((t) => t.phrase === phrase);
/** Plant through the recorder, as a spoken plant would. Returns the stored trigger or undefined. */
const plant = (phrase, { every = false, actions = [] } = {}) => {
	depth.setCurrentDepths(80, 80); // a safeword zeroes depth, and planting needs Deep
	triggers.beginRecording(HYP, "GameBot", phrase);
	triggers.recordAction(triggers.DROP_ACTION);
	for (const a of actions) triggers.recordAction(a);
	if (every) triggers.applyRecordingOption({ kind: "once", value: false });
	triggers.commitRecording();
	return find(phrase);
};
const idle = () => { session.safeword(); storage.forgetAllTriggers(); toSpeaker = []; said = []; };

// --- planting: refused while off ---------------------------------------------------------------------
// Failure: a drop is recorded into her while she has said no, or the hypnotist is not told.
storage.setDropMode("off");
triggers.beginRecording(HYP, "GameBot", "ember glow");
check("off: recordAction refuses the drop", typeof triggers.recordAction(triggers.DROP_ACTION), "string");
check("  and the hypnotist is told the setting", /not allowed "Drop triggers"/.test(lastTo(HYP)), true);
check("  nothing recorded", /0 action/.test(triggers.describeRecording()) || /none yet/.test(triggers.describeRecording()), true);
triggers.cancelRecording();

// --- planting: one-time by default, her ceiling wins -----------------------------------------------
// Failure: an unspecified drop is unlimited, or "every time" beats her "one time".
storage.setDropMode("unlimited");
check("unlimited, nothing said: one-time", plant("ember glow").oneShot, true);
check("unlimited, 'every time': unlimited", plant("velvet dark", { every: true }).oneShot, undefined);
storage.setDropMode("once");
toSpeaker = [];
check("once, 'every time': still one-time", plant("amber light", { every: true }).oneShot, true);
check("  and the hypnotist is told why", /drop trigger work only once/.test(lastTo(HYP)), true);
triggers.beginRecording(HYP, "GameBot", "twice over");
triggers.recordAction(triggers.DROP_ACTION);
toSpeaker = [];
triggers.recordAction(triggers.DROP_ACTION);
check("a second drop in one trigger is refused", /Already recorded/.test(lastTo(HYP)), true);
triggers.cancelRecording();
idle();

// --- firing: it drops her -----------------------------------------------------------------------------
// Failure: not under, the wrong hypnotist, the wrong depth, or the speaker not told.
storage.setDropMode("unlimited");
plant("ember glow", { every: true });
voice.handleSpokenLine(HYP, "ember glow");
check("the drop puts her under", session.isHypnotized(), true);
check("  with the speaker as her hypnotist", session.currentHypnotistId(), HYP);
check("  at the trigger's strength", [depth.currentDepth(), depth.currentDepthEarned()], [80, 80]);
check("  the speaker is told", /drop straight into trance/.test(lastTo(HYP)), true);
check("  she is told", said.some((s) => /drop straight under/.test(s)), true);
check("unlimited: the trigger is still there", !!find("ember glow"), true);
// Already under: refused, and said. Failure: a second drop re-rolls the depth or says nothing.
toSpeaker = [];
voice.handleSpokenLine(HYP, "ember glow"); // suppressed: installer already has a session
check("the installer's own live session suppresses the trigger", toSpeaker.length, 0);
idle();

// Someone else speaks it (scope widened): they become the hypnotist.
storage.setTriggerScope("everyone");
plant("ember glow", { every: true });
voice.handleSpokenLine(OTHER, "ember glow");
check("a permitted other speaker drops her", [session.isHypnotized(), session.currentHypnotistId()], [true, OTHER]);
toSpeaker = [];
voice.handleSpokenLine(HYP, "ember glow");
check("in someone else's trance: refused", session.currentHypnotistId(), OTHER);
check("  and the speaker is told", /already in a trance/.test(lastTo(HYP)), true);
storage.setTriggerScope("hypnotist");
idle();

// --- one-time: gone after the drop ------------------------------------------------------------------
// Failure: fires again.
plant("ember glow");
voice.handleSpokenLine(HYP, "ember glow");
check("one-time: she drops", session.isHypnotized(), true);
check("  and the trigger is gone", find("ember glow"), undefined);
idle();
// Planted while unlimited, fired after she lowered it to once: used up by that drop.
plant("ember glow", { every: true });
storage.setDropMode("once");
voice.handleSpokenLine(HYP, "ember glow");
check("lowered to once after planting: used up by the drop", [session.isHypnotized(), find("ember glow")], [true, undefined]);
idle();

// --- firing refused -------------------------------------------------------------------------------
// Off at firing time. Failure: she drops, or nobody is told.
storage.setDropMode("unlimited");
plant("ember glow", { every: true });
storage.setDropMode("off");
voice.handleSpokenLine(HYP, "ember glow");
check("off at firing: no trance", session.isHypnotized(), false);
check("  the speaker is told", /not allowed drop triggers/.test(lastTo(HYP)), true);
check("  she feels it pass", said.some((s) => /lets go/.test(s)), true);
check("  and the trigger is kept (it did not drop her)", !!find("ember glow"), true);
storage.setDropMode("unlimited");
// Hypnosis unticked: triggers are disarmed outright. Failure: a drop through the floor.
storage.setFeature("hypnoEnabled", false);
voice.handleSpokenLine(HYP, "ember glow");
check("hypnosis unticked: no trance", session.isHypnotized(), false);
storage.setFeature("hypnoEnabled", true);
// Her own voice. Failure: she is her own hypnotist.
storage.setFeature("selfTrigger", true);
voice.handleSpokenLine(Player.MemberNumber, "ember glow");
check("her own voice: no trance", session.isHypnotized(), false);
storage.setFeature("selfTrigger", false);
// A speaker not in the room. Failure: a drop from nobody there.
storage.setTriggerScope("everyone");
check("the gate refuses someone not in the room", session.dropIntoTrance(AWAY, 60, 60), "you aren't in the room with them");
check("  and nothing started", session.isHypnotized(), false);
storage.setTriggerScope("hypnotist");
idle();

// --- chemical seeding earns nothing ---------------------------------------------------------------
// Failure: the earned half equals the full depth, laundering arousal into earned depth.
storage.setDropMode("unlimited");
storage.saveTrigger({ phrase: "warm haze", actions: [triggers.DROP_ACTION], installedBy: HYP, installedByName: "GameBot", installedAt: Date.now(), plantedDepth: 70, plantedChemical: true, reinforcedAt: Date.now(), firings: 0, oneShot: false });
voice.handleSpokenLine(HYP, "warm haze");
check("a chemically seeded drop: full depth only", [depth.currentDepth(), depth.currentDepthEarned()], [70, 0]);
idle();

// --- a drop with other actions ------------------------------------------------------------------------
// The drop lands first; the rest land on someone already under.
plant("ember glow", { every: true, actions: ["movement-block"] });
voice.handleSpokenLine(HYP, "ember glow");
check("drop plus an action: she is under", session.isHypnotized(), true);
check("  and the trigger holds her too", voice.isTriggerInEffect(find("ember glow")), true);
idle();

console.log(`drop: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
