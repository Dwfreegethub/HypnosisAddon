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

// Nothing to trip over.
check("empty string", stripOOC(""), null);
check("only spaces", stripOOC("   "), null);
check("bare parens", stripOOC("()"), null);
check("null-ish input", stripOOC(undefined), null);

console.log(`ooc: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
