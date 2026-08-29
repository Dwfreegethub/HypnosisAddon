// Exercises the real pattern library from src/voice.ts against a phrase list.
// Each case is [phrase, expectedSuggestionId | null].
const { matchSuggestion, mentionsAnyName } = await import("./voice-bundle.mjs");

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
	// --- movement: release ---
	["You can move again.", "movement-release"],
	["you may move", "movement-release"],
	["You are free to move.", "movement-release"],
	["You are no longer frozen.", "movement-release"],
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
