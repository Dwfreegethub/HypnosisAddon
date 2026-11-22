// A hypnotist who is hypnotized mid-induction (v1.16.6, DW 2026-11-22: "If the hypnotist is still in
// the process of hypnotizing someone and a hypno request comes in for them the 1st person should
// fail"; a trance already under way carries on).
//
// Two halves, one client playing each:
//   - As the hypnotist: an induction request we take up ends every induction we have under way, by
//     sending the existing session-wake flagged inductionOnly. Not for a subject already under,
//     and not when we refuse the request.
//   - As the subject: an inductionOnly wake ends an induction as a lapse, and never a trance.
const HYP = 246108, BEA = 300, CASS = 400;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: BEA, Name: "Bea" }, { MemberNumber: CASS, Name: "Cass" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};

let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendEmote = () => {};

const sent = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) sent.push({ to: data.Target, message });
};

let clock = 1_000_000;
Date.now = () => clock;
const pending = [];
globalThis.setTimeout = (fn, ms) => pending.push({ fn, ms });
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null; };
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) {
		if (pending[i].fn) {
			const fn = pending[i].fn;
			pending[i].fn = null;
			fn();
			return true;
		}
	}
	return false;
};

const { session, messaging, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const reset = () => { session.safeword(); said = []; sent.length = 0; };
const wakesTo = (who) => sent.filter((s) => s.to === who && s.message.type === "session-wake");
/** Our view of Bea, as her client would report it. */
const beaIs = (p) => incoming(BEA, { type: "session-update", phase: p, attempts: 0, maxAttempts: 3 });

storage.setFeature("hypnoEnabled", true);
storage.setTrustValue(HYP, "GameBot", 30);
Math.random = () => 0; // every roll lands

// --- as the subject ------------------------------------------------------------------------------
reset();
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
session.answerPrompt("ignore");
check("an induction is under way", phase(), "InductionInProgress");
incoming(HYP, { type: "session-wake", inductionOnly: true });
check("their induction lapses", phase(), "Idle");
check("  and she is told why", said.some((l) => /being hypnotized themselves/.test(l)), true);

reset();
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
check("the prompt is up", phase(), "AttemptMade");
incoming(HYP, { type: "session-wake", inductionOnly: true });
check("an unanswered prompt lapses too", phase(), "Idle");

reset();
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
session.answerPrompt("agree");
runRoll();
check("control: she is under", phase(), "Hypnotized");
incoming(HYP, { type: "session-wake", inductionOnly: true });
check("an inductionOnly wake never ends a trance", phase(), "Hypnotized");
incoming(HYP, { type: "session-wake" });
check("control: a plain wake still does", phase() !== "Hypnotized", true);

reset();
incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
session.answerPrompt("ignore");
incoming(CASS, { type: "session-wake", inductionOnly: true });
check("only her own hypnotist's wake counts", phase(), "InductionInProgress");

// --- as the hypnotist ----------------------------------------------------------------------------
reset();
beaIs("InductionInProgress");
incoming(CASS, { type: "session-attempt", hypnotistName: "Cass" });
check("Cass reaches for us: our induction on Bea is dropped", wakesTo(BEA).map((s) => s.message), [{ type: "session-wake", inductionOnly: true }]);
check("  and we are told", said.some((l) => /Cass is reaching for you, so your induction on Bea ends/.test(l)), true);
check("  and Cass's request goes ahead", phase(), "AttemptMade");

reset();
beaIs("AttemptMade");
incoming(CASS, { type: "session-attempt", hypnotistName: "Cass" });
check("Bea's prompt still up: dropped too", wakesTo(BEA).length, 1);

reset();
beaIs("Hypnotized");
incoming(CASS, { type: "session-attempt", hypnotistName: "Cass" });
check("Bea already under: left alone", wakesTo(BEA).length, 0);

reset();
beaIs("AttemptFailed");
incoming(CASS, { type: "session-attempt", hypnotistName: "Cass" });
check("Bea between tries: left alone", wakesTo(BEA).length, 0);

reset();
beaIs("InductionInProgress");
storage.setFeature("hypnoEnabled", false);
incoming(CASS, { type: "session-attempt", hypnotistName: "Cass" });
check("a request we refuse changes nothing", wakesTo(BEA).length, 0);
storage.setFeature("hypnoEnabled", true);

session.safeword();
console.log(`hypnotist-interrupted: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
