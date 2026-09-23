// Out-of-character asides must not reach any add-on logic.
//
// Parentheses are BC's own OOC convention and the add-on ignored that completely until
// v0.43.0: normalize() turns punctuation into spaces, so "(ooc: brb, you cannot move)" was
// read exactly as if it had been said in character. Stepping out of a scene could freeze
// you, build trust, or set off a trigger.
const { stripOOC, matchSuggestion } = await import("./voice-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- whole-line asides vanish -----------------------------------------------------------
for (const line of [
	"(brb)",
	"(ooc: back in five)",
	"  (just going afk a moment)  ",
	"(Missy, you cannot move)",          // the case that matters: a real suggestion, OOC
	"(Missy you cannot see what you are wearing)",
]) {
	check(`entirely OOC: ${JSON.stringify(line)}`, stripOOC(line), null);
}

// --- in-character text survives ----------------------------------------------------------
check("plain line untouched", stripOOC("Missy, you cannot move"), "Missy, you cannot move");
check("keeps the IC half", stripOOC("Missy, you cannot move (back in 5)"), "Missy, you cannot move");
check("  aside first", stripOOC("(sorry, lag) Missy, you cannot move"), "Missy, you cannot move");
check("  aside in the middle", stripOOC("Missy, (one sec) you cannot move"), "Missy, you cannot move");
check("two asides are two spans, not one", stripOOC("(a) Missy you cannot move (b)"), "Missy you cannot move");

// An unclosed paren is an aside that ran to the end of the line — people do not close them.
check("unclosed aside is still an aside", stripOOC("Missy, you cannot move (brb"), "Missy, you cannot move");
check("  and can swallow the line", stripOOC("(brb everyone"), null);

// --- the end-to-end claim -----------------------------------------------------------------
// What the parser would have made of these before the filter existed.
check("OOC suggestion would have matched raw", matchSuggestion("(Missy, you cannot move)"), "movement-block");
check("  but is null once stripped", stripOOC("(Missy, you cannot move)"), null);
check("real one still matches", matchSuggestion(stripOOC("Missy, you cannot move (brb)")), "movement-block");

// --- the speech-block lifeline (v0.74.6) --------------------------------------------------
// While silenced, main.ts lets a message through when `!blockOOC && stripOOC(msg) === null`.
// That predicate IS what these assert: an entirely-OOC line reads as null (so it passes as the
// subject's practical lifeline), while any in-character content left keeps it non-null (blocked,
// so real speech cannot be smuggled past behind parentheses). blockOOC=true bypasses this and
// silences everything; that branch is a single flag with nothing to compute.
const passesWhileSilenced = (msg) => stripOOC(msg) === null;
check("silenced: pure OOC is a lifeline", passesWhileSilenced("(brb, dog needs out)"), true);
check("silenced: OOC with a colon too", passesWhileSilenced("(ooc: back in 5)"), true);
check("silenced: real speech stays blocked", passesWhileSilenced("let me go"), false);
check("silenced: IC + aside stays blocked", passesWhileSilenced("let me go (sorry, lag)"), false);

// --- doubled and nested asides (v0.82.3) --------------------------------------------------
// The flat "(...)" pattern stopped at the first ")", so "((brb))" left a lone ")" behind. That
// read as in-character text: the speech gate blocked a player's OOC lifeline while silenced.
for (const line of ["((brb))", "((ooc: back in 5))", "(( dog needs out ))", "(brb (dog needs out))", "((brb)"]) {
	check(`doubled/nested is entirely OOC: ${JSON.stringify(line)}`, stripOOC(line), null);
	check(`  and passes while silenced: ${JSON.stringify(line)}`, passesWhileSilenced(line), true);
}
check("doubled aside after IC text leaves no stray paren", stripOOC("Missy you cannot move ((brb))"), "Missy you cannot move");
check("doubled aside before IC text", stripOOC("((sorry, lag)) Missy, you cannot move"), "Missy, you cannot move");
check("doubled OOC suggestion does not match", matchSuggestion(stripOOC("((Missy, you cannot move))") ?? ""), null);
// A ")" with nothing to close is not an aside, so a smiley is still speech.
check("a lone smiley is still speech", stripOOC(":)"), ":)");
check("  and stays blocked while silenced", passesWhileSilenced(":)"), false);
check("IC line ending in a smiley is untouched", stripOOC("Missy you cannot move :)"), "Missy you cannot move :)");

// Nothing to trip over.
check("empty string", stripOOC(""), null);
check("only spaces", stripOOC("   "), null);
check("bare parens", stripOOC("()"), null);
check("null-ish input", stripOOC(undefined), null);

console.log(`ooc: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
