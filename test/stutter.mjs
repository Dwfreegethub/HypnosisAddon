// A hypnotist's arousal stutter must not hide what they said (v0.85.2).
//
// BC stutters on the sender's client, so "Missy, kneel" arrives as "M-Missy, k-kneel".
// normalize() turned each dash into a space and left a stray letter in front of the word:
// the name gate missed "m missy" and "k kneel" matched nothing.
//
// stutterLikeBC below is BC's own SpeechTransformStutter (Speech.js, R132), transcribed so
// this suite stutters exactly as the game does, at every intensity, rather than from our idea
// of what a stutter looks like. It is BC's code, not BCX's or LSCG's.
const { unstutter, stripOOC, matchSuggestion, mentionsAnyName, suggestionHelp } = await import("./voice-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

function stutterLikeBC(text, intensity) {
	let inWord = 1;
	let seed = text.length;
	for (let L = 0; L < text.length; L++) {
		const char = text.charAt(L).toLowerCase();
		// BC skips OOC ranges; none of the lines below have one, so that branch is left out.
		if (inWord >= 0 && char.match(/[[a-zа-яё]/i)) {
			let R = Math.sin(seed++) * 10000;
			R = R - Math.floor(R);
			R = Math.floor(R * 10) + intensity;
			if (inWord == 1 || R >= 10) {
				text = text.substring(0, L) + text.charAt(L) + "-" + text.substring(L, text.length);
				L += 2;
			}
			inWord = -1;
		}
		if (char === " ") inWord = 0;
	}
	return text;
}
// What main.ts now reads, and what it read before.
const heard = (raw) => stripOOC(unstutter(raw));
const heardBefore = (raw) => stripOOC(raw);

// --- the model stutters, or this suite proves nothing -------------------------------------
check("model: first word always stutters", stutterLikeBC("Missy, kneel.", 0), "M-Missy, kneel.");
check("model: intensity 10 stutters every word", stutterLikeBC("Missy, you cannot move", 10), "M-Missy, y-you c-cannot m-move");

// --- the bug, reproduced first (rule 6) ---------------------------------------------------
// A lone word survived by luck: "k-kneel" normalises to "k kneel", and \bkneel\b still finds
// it. A phrase does not, because the stray letter lands between its words.
const freeze = "M-Missy, y-you c-cannot m-move";
check("before: lone stuttered word survived", matchSuggestion(heardBefore("M-Missy, k-kneel.")), "kneel");
check("before: stuttered phrase matched nothing", matchSuggestion(heardBefore(freeze)), null);
check("before: stuttered phrase read as a different pose", matchSuggestion(heardBefore("k-kneel s-spread")), "kneel");

// --- and fixed ----------------------------------------------------------------------------
check("DW's example reads as typed", heard("M-Missy, y-you c-cannot move"), "Missy, you cannot move");
check("stuttered kneel matches", matchSuggestion(heard("M-Missy, k-kneel.")), "kneel");
check("stuttered name passes the gate", mentionsAnyName(heard(freeze), ["Missy"]), true);
check("stuttered freeze matches", matchSuggestion(heard(freeze)), "movement-block");
check("stuttered kneel-spread is not a plain kneel", matchSuggestion(heard("k-kneel s-spread")), "kneel-spread");

// --- the whole catalogue, at every arousal intensity ---------------------------------------
// Every example on the What to Say tab, bare and name-prefixed, stuttered by BC's own
// routine at intensities 0-10. Before the fix, most of these missed. After it, none may.
let total = 0, missedBefore = 0;
const missedAfter = [];
for (const s of suggestionHelp()) {
	for (const example of s.examples) {
		for (const line of [example, `Missy, ${example}`]) {
			if (matchSuggestion(line) !== s.id) continue; // voicetest owns the unstuttered wording
			for (let i = 0; i <= 10; i++) {
				const raw = stutterLikeBC(line, i);
				total++;
				if (matchSuggestion(heardBefore(raw) ?? "") !== s.id) missedBefore++;
				if (matchSuggestion(heard(raw) ?? "") !== s.id) missedAfter.push(`${raw} -> ${s.id}`);
			}
		}
	}
}
check("catalogue: the sweep ran", total > 500, true);
check("catalogue: stutter broke most lines before the fix", missedBefore > total / 2, true);
check("catalogue: no stuttered line missed after the fix", missedAfter.slice(0, 5), []);

// Every intensity BC can produce (0-10 from arousal, higher from a vibrating item) must decode
// back to exactly what was typed.
const LINES = [
	"Missy, you cannot move",
	"Missy, kneel.",
	"Missy, your elbows draw back behind you.",
	"Sleep now, Missy. Deeper and deeper.",
	"\"Missy\" - listen to my voice",
	"Мисси, на колени",
];
for (const line of LINES) {
	for (let i = 0; i <= 12; i++) {
		check(`round trip @${i}: ${line}`, unstutter(stutterLikeBC(line, i)), line);
	}
}

// --- stutters players type themselves -----------------------------------------------------
check("typed double stutter", unstutter("k-k-kneel"), "kneel");
check("typed triple stutter", unstutter("M-M-M-Missy"), "Missy");
check("typed stutter, mixed case", unstutter("m-Missy"), "Missy");

// --- ordinary hyphens are not stutters ----------------------------------------------------
for (const line of ["re-read it", "co-op", "T-shirt", "x-ray", "mid-sentence", "well-behaved", "Jo-Jo", "don't-don't", "1-1", "a - a", "Missy-chan"]) {
	check(`left alone: ${line}`, unstutter(line), line);
}

// --- out-of-character text is still an aside once unstuttered ------------------------------
check("stuttered OOC is still OOC", heard("(b-brb)"), null);
check("stuttered line with an aside keeps the IC half", heard("M-Missy, k-kneel (back in 5)"), "Missy, kneel");

// --- garbled speech stays garbled (DW, 2026-09-24: a gag still works as a gag) --------------
check("gag garble is not decoded", matchSuggestion(heard("Mmmphy, mmeel.")), null);

// Nothing to trip over.
check("empty string", unstutter(""), "");
check("null-ish input", unstutter(undefined), "");
check("a lone dash", unstutter("-"), "-");

console.log(`stutter: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
