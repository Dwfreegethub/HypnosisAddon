// What happens when an induction MISSES — on all three screens, and from the chat commands.
//
// The hole this closes: before v0.75.1 a failed attempt produced one private line on the
// subject's screen and nothing anywhere else. The room, which had just watched the induction
// begin and would have watched it land, saw nothing in between. The hypnotist saw it only on
// the subject's Information Sheet panel, and with that panel closed — which is most of the
// time — an attempt produced NO OUTPUT AT ALL on their screen. A userscript that produces
// nothing is indistinguishable from a userscript that is broken. That is rule 5 ("a silent
// success is indistinguishable from a silent failure") one screen removed from where it is
// usually applied, and DW's ask on 2026-09-17: make it clear the add-on worked and the
// induction didn't.
//
// The constraint that shapes every line of it, and most of this suite: THE MISS MUST NOT
// REVEAL THE SUBJECT'S CHOICE. Agree, ignore and fight are private to the subject's own
// client (design invariant; announceInductionBegin is choice-agnostic for the same reason),
// and a miss is exactly where that would leak, because the intuitive flavour for a failed
// induction is resistance flavour. Agreeing and rolling badly has to read identically to
// fighting it off. So the pools are checked for that directly, by word and by set equality
// across the three choices, rather than by having written them carefully.
//
// Four things it protects:
//
//   1. All three audiences get something, and the room's half stays behind the room-voice
//      consent setting like every other public line.
//   2. No miss line, on any of the three screens, describes effort, refusal or cooperation.
//   3. The hypnotist's line fires on the TRANSITION into a miss — not on every session-update
//      that repeats the phase, and never on a refusal, which is not a miss.
//   4. /hypno induce and /hypno retry put the same messages on the wire as the panel button,
//      including the attempt-vs-continue split that desyncs the two clients when it is wrong.
const HYP = 246108;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	GetPronouns: () => "SheHer",
};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};

let local = [], room = [];
globalThis.ChatRoomSendLocal = (m) => local.push(m);
// The same model of BC R131's emote pipeline notify.mjs uses: ChatRoomSendEmote strips one
// wrapping "*", and the display processor PREPENDS the sender's name unless the text still
// begins with "*". So `room` holds what a viewer actually sees, not what we handed the API.
globalThis.ChatRoomSendEmote = (msg) => {
	const sent = msg.replace(/^\*/, "").replace(/\*$/, "").trim();
	if (sent === "" || sent === "*") return;
	const name = String(Player?.Nickname || Player?.Name || "Someone");
	if (sent.indexOf("*") === 0) room.push(sent.substring(1));
	else room.push(name + (sent[0] === "'" || sent[0] === "," ? "" : " ") + sent);
};

const sent = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) sent.push(message);
};

// A controllable clock — the induction roll only happens when the 60-second window timer
// fires, so without this the suite could not reach a miss at all, and a suite that never
// rolls cannot tell a working miss path from a missing one (rule 6). Copied from
// attempts.mjs, including the "the window timer is always the last one registered" rule.
const pending = [];
globalThis.setTimeout = (fn) => pending.push({ fn });
globalThis.clearTimeout = (id) => {
	if (typeof id === "number" && pending[id - 1]) pending[id - 1].fn = null;
};
const runRoll = () => {
	for (let i = pending.length - 1; i >= 0; i--) {
		if (pending[i].fn) {
			const fn = pending[i].fn;
			pending[i].fn = null;
			fn();
			return;
		}
	}
	throw new Error("nothing scheduled — the induction window was never opened");
};

// Math.random drives two different things here and they need opposite treatment: the roll
// wants to be pinned to a guaranteed miss, and the flavour pools want to be swept so every
// line in them is seen. `nextRandom` is a function so a section can swap in either.
let nextRandom = () => 0.99; // 0.99 * 100 = 99, over the chance ceiling of 95: always a miss
Math.random = () => nextRandom();

const { session, messaging, storage, notify, flavor, commands } = await import("./harness-bundle.mjs");
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

/** Every distinct line a pool can produce, by sweeping the pick() index across its range.
 * `pick` is `options[floor(random * length)]`, so stepping random through [0,1) in enough
 * slices visits every entry whatever the pool's length. */
const drain = (produce) => {
	const seen = new Set();
	const saved = nextRandom;
	for (let i = 0; i < 200; i++) {
		nextRandom = () => i / 200;
		const line = produce();
		if (line != null) seen.add(line);
	}
	nextRandom = saved;
	return [...seen];
};

storage.setFeature("hypnoEnabled", true);

// --- the three pools, and the words none of them may contain --------------------------------
// The leak this guards against is subtle enough to be worth spelling out: "you fought it off"
// is a perfectly natural line for a failed induction, and it tells the hypnotist — who can see
// the room half — that the subject chose to fight. So can "you let it in and it slipped away",
// the other direction. The pools must describe the visible non-event and nothing else.
const subjectLines = drain(() => flavor.inductionMissLine());
const spentLines = drain(() => flavor.inductionSpentLine());
const hypnotistLines = drain(() => flavor.hypnotistMissFlavor("Missy"));
// The same pool with the name the hypnotist-side section will actually see, since the line
// is built from the SUBJECT's name and on that client the subject is the other character.
const hypnotistLinesFor = (who) => drain(() => flavor.hypnotistMissFlavor(who));
const roomLines = drain(() => {
	room = [];
	flavor.announceInductionMiss();
	return room[0] ?? null;
});

check("the subject's miss pool has several lines", subjectLines.length >= 3, true);
check("the spent-attempt pool has several lines", spentLines.length >= 3, true);
check("the room's miss pool has several lines", roomLines.length >= 3, true);
check("the hypnotist's pool has several lines", hypnotistLines.length >= 3, true);

// One word list, all four pools. Cooperation words leak as surely as resistance words do.
const CHOICE_WORDS = /\bresist|\bfight|\bfought|refus|struggl|\bobey|\bagree|willing|cooperat|surrender|\bdefy|\bdefie|\bgave in\b|\bgive in\b/i;
for (const [label, lines] of [
	["subject", subjectLines], ["spent", spentLines], ["room", roomLines], ["hypnotist", hypnotistLines],
]) {
	const leaky = lines.filter((l) => CHOICE_WORDS.test(l));
	check(`the ${label} pool names no choice`, leaky, []);
}

// The room pool goes through fillTokens; the v0.72.9 trigger-ghost bug shipped a literal
// "{they}" to a public room because {they} is not one of the four tokens it fills.
check("every room line is fully filled", roomLines.filter((l) => /\{\w+\}/.test(l)), []);
check("  and names the character", roomLines.filter((l) => !/Missy/.test(l)), []);
// The hypnotist's line does NOT go through fillTokens and must not, because fillTokens fills
// from Player — on that client, the hypnotist themselves. A {name} here would print the
// hypnotist's own name where the subject's belongs. So it may not contain a token at all.
check("the hypnotist's lines carry no token", hypnotistLines.filter((l) => /\{\w+\}/.test(l)), []);
check("  and name the subject they were given", hypnotistLines.filter((l) => !/Missy/.test(l)), []);

// --- a real miss, on the subject's client ----------------------------------------------------
// Driven through the actual roll rather than by calling the flavour functions, because the
// bug was never in the prose — it was that nothing called it.
const attempt = (choice) => {
	incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
	session.answerPrompt(choice);
};

notify.setRoomVoice(() => true);
storage.setMaxAttempts(3);
session.safeword();
local = []; room = [];
attempt("ignore");
const beganWith = room.length; // the induction-begin line, which already existed
room = []; local = [];
runRoll();
check("a miss is not the end of it", phase(), "AttemptFailed");
check("  the subject is told", local.length, 1);
check("  the room sees exactly one line", room.length, 1);
check("  which is from the miss pool", roomLines.includes(room[0]), true);
check("  (and the induction beginning was already visible)", beganWith, 1);

// The last attempt: a different private line for the subject, because "not yet" and "not
// again for a while" are different facts about their own state — but the SAME room pool, so
// onlookers cannot tell a spent attempt from a first one and count the hypnotist's tries.
storage.setMaxAttempts(2);
session.safeword();
attempt("ignore");
runRoll();
// The continue re-opens the window and re-announces the beginning, so the reset goes AFTER
// it — otherwise this would read that line as the miss and pass while testing nothing.
incoming(HYP, { type: "session-continue" });
local = []; room = [];
runRoll();
check("the last attempt closes it", phase(), "CooldownRequired");
check("  the subject gets the spent line", spentLines.includes((local[0] ?? "").replace(/^\[|\]$/g, "")), true);
check("  the room sees one line", room.length, 1);
check("  from the same pool as an ordinary miss", roomLines.includes(room[0]), true);

// The room half is public text and rides the same consent setting as every other public
// line. Checked rather than assumed, because it is the one property here a player can lose.
notify.setRoomVoice(() => false);
storage.setMaxAttempts(3);
session.safeword();
attempt("ignore");
local = []; room = [];
runRoll();
check("with reactions off, the room is told nothing", room.length, 0);
check("  but the subject still is", local.length, 1);
notify.setRoomVoice(() => true);

// --- the hypnotist's own screen --------------------------------------------------------------
// The half DW actually asked for. These feed session-update messages the way a subject's
// client sends them, and read the hypnotist's chat log back.
const update = (extra) => {
	local = [];
	incoming(HYP, { type: "session-update", ...extra });
	return local;
};

session.safeword();
let out = update({ phase: "AttemptFailed", attempts: 1, maxAttempts: 2, progressBand: "more relaxed" });
check("a miss reaches the hypnotist's log", out.length, 1);
check("  saying an attempt happened and failed", hypnotistLinesFor("GameBot").some((l) => (out[0] ?? "").includes(l)), true);
check("  and how many tries are left", /Attempt 1 of 2/.test(out[0] ?? ""), true);
// The band ("they seem more relaxed") is on the panel and stays there. DW: say the induction
// didn't work, don't say why. How close it came is why.
check("  but not how close it came", /relaxed|unchanged|band/i.test(out[0] ?? ""), false);
check("  nor which way they chose", CHOICE_WORDS.test(out[0] ?? ""), false);

// pushUpdate re-sends the same phase for several reasons — a re-query, a permission change,
// a refusal aimed at us. Keying on the phase alone would reprint the line every time.
check("the same phase again says nothing", update({ phase: "AttemptFailed", attempts: 1, maxAttempts: 2 }).length, 0);
check("a second real miss does", update({ phase: "CooldownRequired", attempts: 2, maxAttempts: 2 }).length, 1);
check("  and says they are out of reach", /out of reach/.test(local[0] ?? ""), true);
check("  with the count", /attempt 2 of 2/i.test(local[0] ?? ""), true);

// A refusal is not a miss. refuse() carries our real phase, so a refusal arriving while
// already in AttemptFailed would otherwise read as a fresh failed roll.
session.safeword();
update({ phase: "Idle", attempts: 0 });
check("a refusal is not reported as a miss", update({ phase: "AttemptFailed", attempts: 1, maxAttempts: 2, refusedReason: "they have hypnosis turned off" }).length, 0);

// Walking up to someone who was already in a cooldown from someone else's attempts is not
// an attempt of ours, and a query answers with the phase they are in.
session.safeword();
update({ phase: "Idle", attempts: 0 });
check("someone else's cooldown is not our miss", update({ phase: "CooldownRequired", attempts: 0, maxAttempts: 2 }).length, 0);

// --- /hypno induce and /hypno retry ------------------------------------------------------------
// Registered through BC's CommandCombine, so the suite captures the table the same way BC
// receives it and runs the real Action.
let table = [];
globalThis.CommandCombine = (cmd) => { if (cmd.Subcommands) table = cmd.Subcommands; };
commands.installCommands();
const run = (tag, args = "") => {
	const cmd = table.find((c) => c.Tag === tag);
	if (!cmd) throw new Error(`no /hypno ${tag} registered`);
	sent.length = 0; local = [];
	cmd.Action(args);
};
const wire = () => sent.map((m) => m.type);

check("/hypno induce exists", table.some((c) => c.Tag === "induce"), true);
check("/hypno retry exists", table.some((c) => c.Tag === "retry"), true);

// Our view of them decides attempt-vs-continue, so clear it first: a fresh target is an
// attempt. (This client is the subject in every other section; here it acts as hypnotist.)
session.safeword();
update({ phase: "Idle", attempts: 0 });
run("induce", "GameBot");
check("induce on a fresh target sends an attempt", wire(), ["session-attempt"]);
check("  and says so, since a request is one-way", local.some((l) => /GameBot/.test(l)), true);

// After a miss the right message is session-continue — sending an attempt there is the
// desync this shares with the panel button, which is why both route through requestInduction.
update({ phase: "AttemptFailed", attempts: 1, maxAttempts: 2 });
run("induce", "GameBot");
check("induce after a miss continues instead", wire(), ["session-continue"]);
check("  and says it is a retry", local.some((l) => /again/i.test(l)), true);

// retry needs no name — that is the whole point of it.
update({ phase: "AttemptFailed", attempts: 1, maxAttempts: 2 });
run("retry");
check("retry needs no name", wire(), ["session-continue"]);

// A prefix resolves, an unknown name does not, and neither may silently do nothing.
run("induce", "Game");
check("a prefix resolves", wire(), ["session-continue"]);
run("induce", "Nobody");
check("an unknown name sends nothing", wire(), []);
check("  and says why", local.some((l) => /Nobody/.test(l)), true);

// Someone who has left the room cannot be retried at — the stored name is not trusted.
globalThis.ChatRoomCharacter = [Player];
run("retry");
check("retrying at someone who left sends nothing", wire(), []);
check("  and says they are gone", local.some((l) => /isn't in the room/i.test(l)), true);
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];

console.log(`miss: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
