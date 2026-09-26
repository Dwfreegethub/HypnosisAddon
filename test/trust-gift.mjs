// "I trust you, Eri", v0.94.0 (DW, 2026-09-26).
//
// The subject gives a hypnotist her trust. Their next induction within 5 minutes skips the
// Agree / Ignore / Fight box and goes ahead as Agree, and for that one induction (and the trance
// it leads to) her trust in them counts as at least 65. DW's choices: the name is required; it
// reaches session and arousal only (so the EARNED depth, which gates triggers, carry-forward and
// the illusion, must not move); a floor of 65; used up by one induction. Every block states what
// failure looks like.
const HYP = 246108, REI = 999;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "Eri" }, { MemberNumber: REI, Name: "Rei", Nickname: "Reiko" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.CharacterSetActivePose = () => {};

let clock = 1_000_000;
Date.now = () => clock;
// Timers are held, never run on their own. The induction roll is the last one opened.
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

const { session, messaging, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

storage.setFeature("hypnoEnabled", true);
const incoming = (from, message) =>
	messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const attempt = (from = HYP) => incoming(from, { type: "session-attempt", hypnotistName: from === HYP ? "Eri" : "Rei" });
const phase = () => (session.describeSession().match(/session: (\w+)/) ?? [])[1];
const choice = () => (session.describeSession().match(/choice=(\w+)/) ?? [])[1] ?? null;
const boxUp = () => session.getPendingPrompt() !== null;
const floor = (who = HYP) => session.trustGiftFloor(who);
const reset = () => { session.safeword(); clock += 10 * 60_000; said = []; };
const fresh = () => { reset(); Math.random = () => 0.99; };

// --- the wordings -----------------------------------------------------------------------------------
// Failure: a gift from a line that is not one, or none from a line that is.
for (const [line, want, whisper] of [
	["I trust you, Eri", HYP],
	["Eri, I trust you", HYP],
	["I really trust you Eri", HYP],
	["i trust you, Reiko", REI], // the nickname
	["I trust you", HYP, HYP], // whispered to Eri, which names her
	["Do I trust you, Eri?", null],
	["I don't trust you, Eri", null],
	["I trust you, Eri and Rei", null], // two people: nobody
	["I trust you", null], // said to the room, no name
	["I trusted you, Eri", null],
	["Erin, I trust you", null], // a name that only starts with hers
]) {
	fresh();
	session.noticeTrustLine(line, whisper);
	check(`"${line}"${whisper ? " (whispered)" : ""}`, floor(HYP) ? HYP : floor(REI) ? REI : null, want);
}
// Rule 5: a trust line that named no one says why nothing happened; ordinary chat says nothing.
fresh();
check("no name: she is told how", /say their name with it/.test(session.noticeTrustLine("I trust you") ?? ""), true);
check("two names: she is told why", /more than one person/.test(session.noticeTrustLine("I trust you, Eri and Rei") ?? ""), true);
check("a question: nothing said", session.noticeTrustLine("Do I trust you, Eri?"), null);
check("ordinary chat: nothing said", session.noticeTrustLine("hello Eri"), null);

// --- given, then an induction: no box, Agree, and the floor ------------------------------------------
// Failure: the box still comes up, the choice is not Agree, or trust does not move.
fresh();
const before = session.inductionChance(HYP, "agree");
const earnedBefore = session.inductionChance(HYP, "agree", true);
check("before: no floor", floor(), 0);
session.noticeTrustLine("I trust you, Eri");
check("given: the floor is lent while it waits", floor(), 65);
attempt();
check("the induction: no box", boxUp(), false);
check("  it goes straight ahead", phase(), "InductionInProgress");
check("  as Agree", choice(), "agree");
check("  she is told why", said.some((s) => /you let them/.test(s)), true);
check("the chance rises", session.inductionChance(HYP, "agree") > before, true);
// The line DW drew: session and arousal only. Failure: the earned depth moves, so a 5-minute
// gift could reach triggers, carry-forward or the illusion.
check("the earned chance does not move", session.inductionChance(HYP, "agree", true), earnedBefore);
check("/hypno chance shows it", session.describeChances(HYP).some((l) => /your trust, given/.test(l)), true);

// --- it lasts the trance it led to, then it is used up ----------------------------------------------
// Failure: gone mid-trance, or still there for the next induction.
Math.random = () => 0;
runRoll();
check("under", phase(), "Hypnotized");
clock += 20 * 60_000; // long past the 5 minutes: the trance keeps it
check("still lent, deep into the trance", floor(), 65);
// Said again while under: nothing left to change, and she is not told she sank further.
// Failure: a lie about her own state, or a fresh gift that outlives this trance.
check("said again under: told plainly", /already under/.test(session.noticeTrustLine("I trust you, Eri") ?? ""), true);
incoming(HYP, { type: "session-wake" });
check("woken: used up", floor(), 0);
said = [];
attempt();
check("the next induction asks again", boxUp(), true);

// --- a miss, then a retry: the same induction --------------------------------------------------------
fresh();
session.noticeTrustLine("I trust you, Eri");
attempt();
runRoll(); // misses (random 0.99)
check("missed: still this induction's", [phase(), floor()], ["AttemptFailed", 65]);
incoming(HYP, { type: "session-continue" });
check("  the retry goes ahead as Agree, no box", [phase(), choice(), boxUp()], ["InductionInProgress", "agree", false]);

// --- unused, it lapses after 5 minutes ---------------------------------------------------------------
fresh();
session.noticeTrustLine("I trust you, Eri");
clock += 5 * 60_000 + 1;
check("5 minutes on: gone", floor(), 0);
attempt();
check("  and the box asks", boxUp(), true);

// --- only for the one she named ------------------------------------------------------------------------
fresh();
session.noticeTrustLine("I trust you, Eri");
attempt(REI);
check("Rei's induction: the box asks", boxUp(), true);
check("  and Rei gets no floor", floor(REI), 0);

// --- said while the box is already up: that is the answer -------------------------------------------
fresh();
attempt();
check("box up", boxUp(), true);
session.noticeTrustLine("I trust you, Eri");
check("  answered as Agree", [boxUp(), phase(), choice()], [false, "InductionInProgress", "agree"]);

// --- the safeword, and hypnosis off --------------------------------------------------------------------
// Failure: the gift outlives the safeword (rule 2), or is given while hypnosis is off.
fresh();
session.noticeTrustLine("I trust you, Eri");
session.safeword();
check("the safeword clears it", floor(), 0);
fresh();
storage.setFeature("hypnoEnabled", false);
check("hypnosis off: refused, and said", /switched off/.test(session.giveTrust(HYP, "Eri")), true);
check("  no gift", floor(), 0);
storage.setFeature("hypnoEnabled", true);

// --- the command -----------------------------------------------------------------------------------------
fresh();
session.giveTrust(HYP, "Eri");
check("/hypno trust: the same gift", floor(), 65);

console.log(`trust-gift: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
