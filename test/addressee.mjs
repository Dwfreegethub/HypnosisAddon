// Two subjects, one line: the command multiplexing collision.
//
// Before this suite existed, "Missy, you cannot move. Ella, you cannot speak." reached BOTH
// clients whole. Each saw its own name somewhere in the line, each handed the WHOLE line to
// the matcher, and the matcher returns the first entry in SUGGESTIONS that hits — so both
// subjects were frozen and the speech command was lost outright. (DW, 2026-09-21.)
//
// Two halves, deliberately:
//   1. scopeToAddressee as a pure decision table, driven from both subjects' points of view.
//      Every case asserts what MISSY gets AND what ELLA gets, because "they both got the same
//      thing" is precisely the bug and a one-sided check cannot see it.
//   2. The live pipeline through handleSpokenLine, so what is asserted is the state a real
//      session would be in, not what a helper returned.
const HYP = 246108, ELLA = 777;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [
	Player,
	{ MemberNumber: HYP, Name: "GameBot" },
	{ MemberNumber: ELLA, Name: "Ella" },
];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.ServerSend = () => {};

const { voice, storage, session, effects, suppression } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- 1. the pure decision table -------------------------------------------------------
// What each subject's own client cuts the line down to. `null` means "not mine"; a string is
// matched through matchSuggestion so the assertion is the SUGGESTION each side ends up with,
// which is the thing that was actually wrong.
const asMissy = (line) => voice.scopeToAddressee(line, ["Missy"], ["Ella", "GameBot"]);
const asElla = (line) => voice.scopeToAddressee(line, ["Ella"], ["Missy", "GameBot"]);
const idFor = (scope) => (scope.ambiguous ? "AMBIGUOUS" : scope.text === null ? null : voice.matchSuggestion(scope.text));

/** The falsifiable shape: both sides at once, so an identical pair cannot pass unnoticed. */
const both = (label, line, wantMissy, wantElla) => {
	check(`${label} — Missy`, idFor(asMissy(line)), wantMissy);
	check(`${label} — Ella`, idFor(asElla(line)), wantElla);
};

// The reported bug, in its two reported shapes: one command overwriting the other, and one
// command applying identically to both. Before the fix BOTH rows of each pair read the same.
both("two commands, comma", "Missy, you cannot move. Ella, you cannot speak.", "movement-block", "speech-block");
both("two commands, 'and'", "Missy kneel and Ella stand", "kneel", "stand");
both("reversed order", "Ella, you cannot speak; Missy, kneel", "kneel", "speech-block");
both("filler before the name", "Ok Missy, come for me. Ella, kneel.", "orgasm-force", "kneel");

// Addressing both at once is a real thing to type and must still reach both.
both("one command, both named", "Missy and Ella, you cannot move", "movement-block", "movement-block");

// A line for the other person alone is not ours, and says nothing.
both("their line only", "Ella, you cannot move", null, "movement-block");

// Two clauses for one of us in the same line still reach that one of us.
check("two clauses, one subject", asMissy("Missy, kneel. Ella, stand.").text.includes("kneel"), true);

// --- DW's live transcripts, 2026-09-21 ------------------------------------------------
// v0.79.0 shipped and still got these wrong in play, so they are pinned here verbatim rather
// than paraphrased. Both were ONE chat message with a line break in it, which is the obvious
// way to type a combo command and was not a clause boundary — so the two orders stayed welded
// together, the second name never reached a vocative position, and the line fell through
// unscoped. Nova spoke; Missy and Natalia were both under.
//
// What actually happened: on the first line Missy came instead of kneeling and Natalia did
// nothing; on the second Natalia came instead of standing and Missy did nothing. Both are
// `orgasm-force` winning the whole-line match at table index 7.
const dwMissy = (line) => idFor(voice.scopeToAddressee(line, ["Missy"], ["Natalia", "Nova"]));
const dwNatalia = (line) => idFor(voice.scopeToAddressee(line, ["Natalia"], ["Missy", "Nova"]));
const transcript = (label, line, wantMissy, wantNatalia) => {
	check(`${label} — Missy`, dwMissy(line), wantMissy);
	check(`${label} — Natalia`, dwNatalia(line), wantNatalia);
};

// Exactly as typed, newline and all.
transcript("DW 1: line break", "Missy, kneel\nNatalia, cum for me", "kneel", "orgasm-force");
transcript("DW 2: line break", "Natalia, stand\nMissy cum for me", "orgasm-force", "stand");

// The same two written out on one line. The second is the harder shape — there is no
// punctuation at all between "stand" and "Missy", so the split has to come off the name.
transcript("DW 1: one line, comma", "Missy, kneel Natalia, cum for me", "kneel", "orgasm-force");
transcript("DW 2: one line, no punctuation", "Natalia, stand Missy cum for me", "orgasm-force", "stand");

// A carriage return pair, since that is what some clients send.
transcript("DW 1: CRLF", "Missy, kneel\r\nNatalia, cum for me", "kneel", "orgasm-force");

// --- a name being TALKED ABOUT is not an address --------------------------------------
// The mid-clause split above is what makes "stand Missy cum for me" work, and it is also the
// thing most likely to cut a one-subject line in half. The guard is the word in front of the
// name: a preposition or a comparative means the name is the object of the sentence.
for (const line of [
	"Missy, look at Ella and you cannot move",
	"Missy, you are prettier than Ella, you cannot move",
	"Missy, stay with Ella, you cannot move",
	"Missy, you cannot move away from Ella",
]) check(`object, not addressee: ${line}`, idFor(asMissy(line)), "movement-block");

// And the reverse: a verb in front of the name does start a new order.
check("verb before the name splits", idFor(asMissy("Missy, kneel Ella, stand")), "kneel");
check("  and the second half is Ella's", idFor(asElla("Missy, kneel Ella, stand")), "stand");

// --- the single-subject line is untouched ---------------------------------------------
// This is the guarantee that makes the change safe to ship: when nobody else is named in
// vocative position the line is handed back byte-for-byte, so every existing phrasing
// behaves exactly as it did. Checked on identity, not on the matched id, because an id that
// happens to agree would hide a rewritten line.
for (const line of [
	"Missy, you cannot move",
	"you cannot move",
	"you cannot move, Missy",
	"Missy, you cannot move and you cannot speak",
	"Missy, your dress is rose coloured and you cannot move",
	// A line break with nobody else named still changes nothing about the text.
	"Missy, you cannot move\nyou cannot speak",
]) {
	const s = asMissy(line);
	check(`untouched: ${line}`, [s.text, s.scoped, s.ambiguous], [line, false, false]);
}

// A room-mate's name appearing mid-clause is NOT a vocative and must not cut the line.
check("a name mid-sentence is not an address", asMissy("Missy, look at Ella and you cannot move").scoped, false);

// --- ambiguity is refused, not guessed ------------------------------------------------
// A clause with no addressee while several people are named could belong to either of them.
// Guessing would land a command on the wrong person; the caller refuses and says so.
const floating = asMissy("you cannot speak. Missy, kneel. Ella, stand.");
check("floating clause is ambiguous", [floating.text, floating.ambiguous], [null, true]);
// Named but given nothing — the shape a room-mate whose name is an ordinary word produces.
const empty = voice.scopeToAddressee("Missy, May you cannot move", ["Missy"], ["May"]);
check("named with nothing left is ambiguous", [empty.text, empty.ambiguous], [null, true]);
// Not named at all alongside someone who is: simply not ours, and NOT ambiguous — nothing to
// refuse and nobody to tell.
const notMine = asMissy("Ella, kneel");
check("not named at all is silent, not ambiguous", [notMine.text, notMine.ambiguous], [null, false]);

// --- 2. the live pipeline -------------------------------------------------------------
// Everything above is text in, text out. This half proves the subject's actual state, which
// is what the bug was reported as: the wrong person frozen.
for (const k of ["hypnoEnabled", "movementRestriction", "speechRestriction", "postureControl"]) storage.setFeature(k, true);
check("forced under", session.forceTrance(HYP, 80, 80), null);
const say = (line) => voice.handleSpokenLine(HYP, line);
const frozen = () => effects.hasOwnEffect("Freeze");

// The trance defaults may freeze on entry; clear the slate first so what is asserted below is
// what THIS line did. If the release does not work the checks after it cannot pass, which is
// the point — a fixture that cannot fail is not a fixture.
say("Missy, you can move again.");
check("slate clear before the collision case", frozen(), false);

// Ella's command, Missy's client. Nothing must happen to Missy.
say("Ella, you cannot move.");
check("another subject's freeze does not reach us", frozen(), false);

// Our command in a line that also carries Ella's. Before the fix this froze both of us; now
// the freeze is ours because the clause naming us is the one that said it.
say("Ella, you cannot speak. Missy, you cannot move.");
check("our own clause still lands", frozen(), true);

say("Missy, you can move again. Ella, kneel.");
check("our release lands from a shared line too", frozen(), false);

// The reverse of the headline case: the clause that reaches us is OURS, not the first one in
// the table. Ella's is the movement command this time and ours is speech.
say("Missy, you can speak again.");
check("speech clear to start", effects.isSpeechBlocked(), false);
say("Ella, you cannot move. Missy, you cannot speak.");
check("we get the speech block", effects.isSpeechBlocked(), true);
check("  and NOT Ella's freeze", frozen(), false);

// Put the trance down before the suite ends. Left standing, the trance's own timers keep
// node's event loop alive and the suite never exits — which hangs `npm test` for every suite
// queued behind this one, not just this one.
session.safeword();
console.log(`addressee: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
