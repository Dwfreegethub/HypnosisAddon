// A trance that runs out on its own — on all three screens. DW's tracker: "Silent Trance
// Expirations — when a 30-minute trance naturally times out, neither the hypnotist nor the
// subject receives notification or feedback."
//
// What it actually did before v0.82.2: the subject got one bracketed line, "You come out of
// trance. (session timed out)", which reads as a status code rather than as the trance ending.
// The hypnotist got nothing in their chat at all; the subject's panel flipped to idle, and with
// the panel closed a trance simply stopped. The room, which had watched the subject go under,
// never saw them come back. Same three screens as a missed induction (test/miss.mjs), and the
// same constraint: THE LINES MUST NOT REVEAL THE SUBJECT'S CHOICE.
//
// Five things it protects:
//
//   1. The timeout, fired for real off the session timer, reaches the subject, the room (behind
//      "Others see your reactions") and the hypnotist.
//   2. No pool describes resisting, giving in or cooperating, and the message that reaches the
//      hypnotist is byte-identical whichever way the subject chose.
//   3. The hypnotist's line fires only on the timeout — not on a self-wake, a wake they sent
//      themselves, the safeword, a re-query or a refusal.
//   4. A trance that ran out while the subject was logged out says so on reconnect, and no
//      longer follows that with "you are still under".
//   5. Nothing is left running: every section ends with the safeword.
const HYP = 246108;
const KEY = "HypnosisAddon_Session_1";
const THIRTY = 30 * 60_000;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	GetPronouns: () => "SheHer",
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
const store = {};
globalThis.localStorage = {
	getItem(k) { return store[k] ?? null; },
	setItem(k, v) { store[k] = v; },
	removeItem(k) { delete store[k]; },
};
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};

let local = [], room = [];
globalThis.ChatRoomSendLocal = (m) => local.push(m);
// The model of BC R131's emote pipeline notify.mjs and miss.mjs use, so `room` holds what a
// viewer actually sees.
globalThis.ChatRoomSendEmote = (msg) => {
	const sent = msg.replace(/^\*/, "").replace(/\*$/, "").trim();
	if (sent === "" || sent === "*") return;
	const name = String(Player?.Nickname || Player?.Name || "Someone");
	if (sent.indexOf("*") === 0) room.push(sent.substring(1));
	else room.push(name + (sent[0] === "'" || sent[0] === "," ? "" : " ") + sent);
};
let wire = [];
globalThis.ServerSend = (_type, data) => {
	const message = data?.Dictionary?.[0]?.message;
	if (message) wire.push(message);
};

// A controllable clock and held timers, as in relog.mjs. The timeout has to be FIRED, off the
// timer the trance armed, or the suite would only be calling the prose and could not tell a
// working expiry from one nothing ever reaches (rule 6).
let now = Date.parse("2026-09-22T20:00:00Z");
Date.now = () => now;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = (fn, ms = 0) => { pending.push({ fn, ms, live: true, every: true }); return pending.length; };
globalThis.clearInterval = globalThis.clearTimeout;
/** Fire the trance's own timeout — the one live thirty-minute one-shot. Throws if there is none,
 * so a trance that never armed its clock fails loudly instead of passing quietly. */
const runTimeout = (ms = THIRTY) => {
	const t = pending.filter((t) => t.live && !t.every && t.ms === ms);
	if (t.length !== 1) throw new Error(`expected one live ${ms}ms timer, found ${t.length}`);
	now += ms;
	t[0].live = false;
	t[0].fn();
};
const heartbeat = () => pending.filter((t) => t.live && t.every).forEach((t) => t.fn());
const killPage = () => pending.forEach((t) => (t.live = false));

let nextRandom = () => 0;
Math.random = () => nextRandom();

const one = await import("./harness-bundle.mjs");
const { session, messaging, storage, notify, flavor } = one;
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
const updates = () => wire.filter((m) => m.type === "session-update");
const unbracket = (l) => (l ?? "").replace(/^\[|\]$/g, "");

/** Every distinct line a pool can produce — see the same helper in miss.mjs. */
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
notify.setRoomVoice(() => true);

// --- 1. the pools ------------------------------------------------------------------------------
const subjectLines = drain(() => flavor.tranceExpiryLine());
const hypnotistLines = drain(() => flavor.hypnotistExpiryFlavor("Missy"));
const roomLines = drain(() => {
	room = [];
	flavor.announceTranceExpiry();
	return room[0] ?? null;
});
check("the subject's expiry pool has several lines", subjectLines.length >= 3, true);
check("the room's expiry pool has several lines", roomLines.length >= 3, true);
check("the hypnotist's expiry pool has several lines", hypnotistLines.length >= 3, true);

// The same word list miss.mjs holds its pools to. A trance wearing off is where "you held out"
// or "you let it go willingly" would be the natural thing to write, and both leak.
const CHOICE_WORDS = /\bresist|\bfight|\bfought|refus|struggl|\bobey|\bagree|willing|cooperat|surrender|\bdefy|\bdefie|\bgave in\b|\bgive in\b|\bheld out\b|\bbroke free\b/i;
for (const [label, lines] of [["subject", subjectLines], ["room", roomLines], ["hypnotist", hypnotistLines]]) {
	check(`the ${label} expiry pool names no choice`, lines.filter((l) => CHOICE_WORDS.test(l)), []);
}
check("every room line is fully filled", roomLines.filter((l) => /\{\w+\}/.test(l)), []);
check("  and names the character", roomLines.filter((l) => !/Missy/.test(l)), []);
// On the hypnotist's client fillTokens would fill from the hypnotist — so no tokens at all.
check("the hypnotist's lines carry no token", hypnotistLines.filter((l) => /\{\w+\}/.test(l)), []);
check("  and name the subject they were given", hypnotistLines.filter((l) => !/Missy/.test(l)), []);
// Nor a guessed pronoun for someone else's character: that client does not know it.
check("  and guess no pronoun for them", hypnotistLines.filter((l) => /\b(her|his|him|she|he)\b/i.test(l)), []);

// --- 2. a real induction, run out, for each choice ------------------------------------------------
// Driven through the real roll, not forceTrance, so the choice actually exists on the session.
// Math.random at 0 makes the roll 0, under even Fight's 5% floor: always a success.
const induceAndExpire = (choice) => {
	session.safeword();
	incoming(HYP, { type: "session-attempt", hypnotistName: "GameBot" });
	session.answerPrompt(choice);
	pending.filter((t) => t.live && !t.every && t.ms === 60_000).forEach((t) => { t.live = false; t.fn(); });
	if (phase() !== "Hypnotized") throw new Error(`the ${choice} induction did not land (${phase()})`);
	local = []; room = []; wire = [];
	runTimeout();
	return { local: [...local], room: [...room], ended: updates().at(-1) };
};

const byChoice = {};
for (const choice of ["agree", "ignore", "fight"]) byChoice[choice] = induceAndExpire(choice);
const agreed = byChoice.agree;
check("the timeout ends the trance", phase(), "Idle");
check("  the subject is told exactly once", agreed.local.length, 1);
check("  from the expiry pool", subjectLines.some((l) => unbracket(agreed.local[0]).startsWith(l)), true);
check("  and that it was the time limit", /30 minutes/.test(agreed.local[0] ?? ""), true);
check("  not the old status-code line", /session timed out/.test(agreed.local[0] ?? ""), false);
check("the room sees exactly one line", agreed.room.length, 1);
check("  from the expiry pool", roomLines.includes(agreed.room[0]), true);
check("the hypnotist is sent the ending", agreed.ended?.phase, "Idle");
check("  marked as the timeout", agreed.ended?.ended, "timeout");
// The core invariant, checked on the wire rather than on the prose: the one thing that reaches
// the hypnotist's client must not differ by a byte between the three choices.
check("  identical whichever way the subject chose",
	[JSON.stringify(byChoice.ignore.ended), JSON.stringify(byChoice.fight.ended)],
	[JSON.stringify(agreed.ended), JSON.stringify(agreed.ended)]);
check("  and every choice gets the same room pool", ["ignore", "fight"].every((c) => roomLines.includes(byChoice[c].room[0])), true);

// The room half is public text behind the consent setting, like every other public line.
notify.setRoomVoice(() => false);
const quietRoom = induceAndExpire("ignore");
check("with reactions off, the room is told nothing", quietRoom.room.length, 0);
check("  but the subject still is", quietRoom.local.length, 1);
check("  and so is the hypnotist", quietRoom.ended?.ended, "timeout");
notify.setRoomVoice(() => true);

// --- 3. only the timeout carries the marker ------------------------------------------------------
const endedBy = (end) => {
	session.safeword();
	session.forceTrance(HYP, 10, 10);
	wire = []; room = [];
	end();
	return { ended: updates().at(-1)?.ended ?? null, room: room.length };
};
check("a self-wake is not a timeout", endedBy(() => session.selfWake()), { ended: null, room: 0 });
check("the hypnotist's own wake is not a timeout", endedBy(() => incoming(HYP, { type: "session-wake" })), { ended: null, room: 0 });
check("the safeword is not a timeout", endedBy(() => session.safeword()), { ended: null, room: 0 });

// --- 4. the hypnotist's own screen ---------------------------------------------------------------
// This client acts as the hypnotist here: session-updates arrive the way a subject sends them.
const update = (extra) => {
	local = [];
	incoming(HYP, { type: "session-update", attempts: 0, maxAttempts: 2, ...extra });
	return [...local];
};
session.safeword();
update({ phase: "Hypnotized", depthBand: "deeply under" });
let out = update({ phase: "Idle", ended: "timeout" });
check("a timeout reaches the hypnotist's log", out.length, 1);
check("  naming the subject", /GameBot/.test(out[0] ?? ""), true);
check("  from the hypnotist's pool", drain(() => flavor.hypnotistExpiryFlavor("GameBot")).some((l) => unbracket(out[0]).startsWith(l)), true);
check("  saying it was the time limit", /30-minute limit/.test(out[0] ?? ""), true);
check("  and nothing about the choice", CHOICE_WORDS.test(out[0] ?? ""), false);
check("  nor how deep they were", /deep|light|under\b/i.test((out[0] ?? "").replace(/^.*?(The trance reached)/, "$1")), false);
check("a later re-query says nothing", update({ phase: "Idle" }).length, 0);
update({ phase: "Hypnotized", depthBand: "deeply under" });
check("any other ending says nothing here", update({ phase: "Idle" }).length, 0);
check("a refusal never reads as a timeout", update({ phase: "Idle", ended: "timeout", refusedReason: "no" }).length, 0);
check("a marker on a live phase is ignored", update({ phase: "Hypnotized", ended: "timeout" }).length, 0);

// --- 5. run out while logged out -----------------------------------------------------------------
// The trance is saved by its heartbeat at 28 minutes, the page dies, and the subject is back three
// minutes later: inside recovery's five-minute window, so recovery resumes — but past the timeout.
session.safeword();
session.forceTrance(HYP, 60, 60);
now += 28 * 60_000;
heartbeat();
const savedCopy = JSON.parse(store[KEY] ?? "null");
check("the trance was saved for a reconnect", savedCopy?.sessionLive, true);
killPage();
now += 3 * 60_000;
local = []; room = []; wire = [];
const two = await import("./harness-bundle.mjs?reload=1");
// installSession() is the real reconnect: it starts recovery, whose first tick runs at once
// because identity and a room are both already known.
two.session.installSession();
check("recovery ends the trance it found expired", (two.session.describeSession().match(/session: (\w+)/) ?? [])[1], "Idle");
check("  the subject is told it ran out while away", local.some((l) => /while you were away/.test(l) && subjectLines.some((s) => unbracket(l).startsWith(s))), true);
// Before this fix the expiry was followed straight away by the resume line, which contradicted it.
check("  and not that they are still under", local.some((l) => /still under/.test(l)), false);
check("  the room sees nothing — nothing happened in front of it", room.length, 0);
check("  the hypnotist is told", updates().at(-1)?.ended, "timeout");

// A reconnect inside the timeout is unaffected: still under, still says so, no marker.
two.session.safeword();
two.session.forceTrance(HYP, 60, 60);
now += 10 * 60_000;
heartbeat();
killPage();
now += 2 * 60_000;
local = []; wire = [];
const three = await import("./harness-bundle.mjs?reload=2");
three.session.installSession();
check("a trance with time left resumes", (three.session.describeSession().match(/session: (\w+)/) ?? [])[1], "Hypnotized");
check("  and says they are still under", local.some((l) => /still under/.test(l)), true);
check("  with no expiry line", local.some((l) => subjectLines.some((s) => unbracket(l).startsWith(s))), false);
check("  and no timeout sent", updates().some((m) => m.ended), false);

// Every copy's trance comes down, or node never exits.
three.session.safeword();
two.session.safeword();
session.safeword();
killPage();
console.log(`expiry: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
