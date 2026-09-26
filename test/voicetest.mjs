// Exercises the real pattern library from src/voice.ts against a phrase list.
// Each case is [phrase, expectedSuggestionId | null].
const { matchSuggestion, mentionsAnyName, suggestionHelp } = await import("./voice-bundle.mjs");

// --- the help screen's examples must be real -----------------------------------------
// The What to Say tab is generated from these, so an example that no longer matches its
// own patterns is worse than no help at all: it teaches a phrase that silently does
// nothing. This is the assertion that keeps the two honest.
let hp = 0; const hf = [];
for (const s of suggestionHelp()) {
	if (!s.examples.length) { hf.push([s.id, "at least one example", "none"]); continue; }
	for (const example of s.examples) {
		const got = matchSuggestion(example);
		got === s.id ? hp++ : hf.push([`${s.id}: ${JSON.stringify(example)}`, s.id, got]);
	}
}
console.log(`help examples: ${hp}/${hp + hf.length} match their own patterns`);
for (const [what, want, got] of hf) console.log(`  ${what}
    expected: ${want}
    got:      ${got}`);

// --- name gate ---
const NAMES = ["Missy"];
const NAME_CASES = [
	["Missy, kneel.", true],
	["missy kneel", true],
	["MISSY! Kneel.", true],
	["Kneel, Missy.", true],
	["Now Missy — on your knees.", true],
	["Kneel.", false],
	["You cannot move.", false],
	["Chrissy, kneel.", false], // must not substring-match inside another name
	["Missygirl, kneel.", false],
];
let namePass = 0;
const nameFailures = [];
for (const [phrase, expected] of NAME_CASES) {
	const got = mentionsAnyName(phrase, NAMES);
	if (got === expected) namePass++;
	else nameFailures.push({ phrase, expected, got });
}
console.log(`name gate: ${namePass}/${NAME_CASES.length} passed`);
for (const f of nameFailures) console.log(`  ${JSON.stringify(f.phrase)} expected ${f.expected} got ${f.got}`);


const CASES = [
	// --- movement: block ---
	["You cannot move.", "movement-block"],
	["you can't move", "movement-block"],
	["You can’t move a muscle.", "movement-block"],
	["You are unable to move.", "movement-block"],
	["you're frozen", "movement-block"],
	["You are completely frozen.", "movement-block"],
	["Don't move.", "movement-block"],
	["Do not move!", "movement-block"],
	["Stay still.", "movement-block"],
	["hold still", "movement-block"],
	["Stay where you are.", "movement-block"],
	["Your body will not obey you.", "movement-block"],
	["you are rooted to the spot", "movement-block"],
	// v0.92.6: the future tense. Failure: unmatched, or the negatives below read as a freeze.
	["You will be frozen.", "movement-block"],
	["you'll be frozen in place", "movement-block"],
	["You will soon be completely frozen.", "movement-block"],
	["you will be stuck where you stand", "movement-block"],
	["You will not be frozen.", null],
	["you will never be frozen again", null],
	["you will no longer be frozen", null],
	// --- movement: release ---
	["You can move again.", "movement-release"],
	["you may move", "movement-release"],
	["You are free to move.", "movement-release"],
	["You are no longer frozen.", "movement-release"],
	// --- follow / leash: block ---
	["Follow me.", "follow-block"],
	["you will follow me", "follow-block"],
	["You must follow.", "follow-block"],
	["you follow wherever I go", "follow-block"],
	["Stay close to me.", "follow-block"],
	["stay near me", "follow-block"],
	["Stay by my side.", "follow-block"],
	["stay at my heel", "follow-block"],
	["You cannot leave my side.", "follow-block"],
	["you can't walk away from me", "follow-block"],
	["You belong at my heel.", "follow-block"],
	["Heel.", "follow-block"],
	// --- follow / leash: release ---
	["You can leave.", "follow-release"],
	["you may go now", "follow-release"],
	["You are free to go.", "follow-release"],
	["you don't have to follow me", "follow-release"],
	["You can walk away.", "follow-release"],
	["Stay wherever you like.", "follow-release"],
	// follow must not swallow the movement family, nor the reverse — different restrictions
	["Stay still.", "movement-block"],
	["Stay where you are.", "movement-block"],
	// --- clothing: block ---
	["You cannot change your clothes.", "clothing-block"],
	["you can't change your clothing", "clothing-block"],
	["You are unable to remove your clothes.", "clothing-block"],
	["Your clothes stay on.", "clothing-block"],
	["Don't touch your clothes.", "clothing-block"],
	["Leave your outfit alone.", "clothing-block"],
	["you cannot undress", "clothing-block"],
	["You have forgotten how to undress.", "clothing-block"],
	// --- clothing: release ---
	["You can change your clothes again.", "clothing-release"],
	["You may remove your clothing.", "clothing-release"],
	["You are free to dress.", "clothing-release"],
	// --- posture ---
	["Kneel.", "kneel"],
	["kneel down", "kneel"],
	["Get on your knees.", "kneel"],
	["Drop to your knees.", "kneel"],
	["Now, on your knees.", "kneel"],
	["I want you to kneel.", "kneel"],
	["stand up", "stand"],
	["You may stand.", "stand"],
	["Get up.", "stand"],
	["Rise to your feet.", "stand"],
	// --- should NOT match (false-positive probes) ---
	["I cannot move this chair.", null],
	["I can't stand it.", null],
	["She kneeled by the fire.", null],
	["Let's move on to something else.", null],
	["Nice clothes.", null],
	["How are you?", null],
	["The clothes are on the floor.", null],
	["I need to get up early tomorrow.", null],
	// --- clothing illusion ---
	// Listed before the awareness entries in the table; these two phrasings overlap and the
	// more specific reading has to win.
	["You cannot tell what you are wearing.", "illusion-block"],
	["You don't notice what you are wearing.", "illusion-block"],
	["You do not notice your clothes.", "illusion-block"],
	["Your clothes look the same to you.", "illusion-block"],
	["Nothing about you has changed.", "illusion-block"],
	["You will not be able to tell how you are dressed.", "illusion-block"],
	["You can see yourself again.", "illusion-release"],
	// These four matched NOTHING before v0.38.2 — "again" was mandatory on one pattern and a
	// qualifier on another, which ruled out the most natural ways to say it.
	["Look at yourself.", "illusion-release"],
	["Look down at yourself.", "illusion-release"],
	["You notice your clothes.", "illusion-release"],
	["You notice you are naked.", "illusion-release"],
	["You realise you are naked.", "illusion-release"],
	["You notice what is missing.", "illusion-release"],
	// ...without swallowing the awareness wording, which is a different feature.
	["You notice what happens to you.", "awareness-release"],
	["I look at myself.", null],
	["You can tell what you are wearing.", "illusion-release"],
	["You notice your clothes again.", "illusion-release"],
	// The awareness entries must still win their own wording.
	["You notice nothing.", "awareness-block"],
	["You do not notice.", "awareness-block"],
	["You notice everything again.", "awareness-release"],
	// And the clothing block is a different thing from the clothing illusion.
	["You cannot change your clothes.", "clothing-block"],
	["I kneel beside you.", null],
	["We should get up soon.", null],
	["I have to move my car.", null],
	["You are completely frozen.", "movement-block"],
	["You cannot even move.", "movement-block"],
];

let pass = 0;
const failures = [];
for (const [phrase, expected] of CASES) {
	const got = matchSuggestion(phrase);
	if (got === expected) pass++;
	else failures.push({ phrase, expected, got });
}

console.log(`${pass}/${CASES.length} passed`);
if (failures.length) {
	console.log("\nMISMATCHES:");
	for (const f of failures) console.log(`  ${JSON.stringify(f.phrase)}\n    expected: ${f.expected}\n    got:      ${f.got}`);
}
