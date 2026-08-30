// Arousal and orgasm: pattern matching, level mapping, and the BC-API sequencing.
//
// Two halves. The first drives the pure pattern library, same as voicetest. The second
// stubs BC's arousal functions and checks that arousal.ts calls them in the right order
// with the right values — which is the part that can't be verified by reading, because it
// depends on ActivityOrgasmPrepare's habit of silently declining.
const { matchSuggestion } = await import("./voice-bundle.mjs");

let pass = 0;
const failures = [];
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	if (ok) pass++;
	else failures.push({ phrase: label, expected: want, got });
};

// --- patterns ---
const CASES = [
	// levels
	["Missy, you are not aroused.", "arousal-none"],
	["you're no longer aroused", "arousal-none"],
	["You are no longer even slightly aroused.", "arousal-none"],
	["Your arousal drains away.", "arousal-none"],
	["your heat fades", "arousal-none"],
	["You feel no desire.", "arousal-none"],
	["You are lightly aroused.", "arousal-light"],
	["you are a little turned on", "arousal-light"],
	["You feel slightly warm.", "arousal-light"],
	["You are starting to get warm.", "arousal-light"],
	["You are very aroused.", "arousal-high"],
	["you're so turned on", "arousal-high"],
	["You are desperate.", "arousal-high"],
	["you feel absolutely desperate", "arousal-high"],
	["You need it badly.", "arousal-high"],
	["Your need builds.", "arousal-high"],
	["You are fully aroused.", "arousal-full"],
	["You are right on the edge.", "arousal-full"],
	["you are at the brink", "arousal-full"],
	["You are so close.", "arousal-full"],
	["You are about to come.", "arousal-full"],
	// orgasm — allow before deny before force, since the phrasings nest
	["You may come now.", "orgasm-allow"],
	["You can cum again.", "orgasm-allow"],
	["You are allowed to orgasm.", "orgasm-allow"],
	["I allow you to come.", "orgasm-allow"],
	["You cannot come.", "orgasm-deny"],
	["you can't cum", "orgasm-deny"],
	["You will not orgasm.", "orgasm-deny"],
	["You are forbidden to come.", "orgasm-deny"],
	["You will not be able to climax.", "orgasm-deny"],
	["You have forgotten how to come.", "orgasm-deny"],
	["Missy, come for me.", "orgasm-force"],
	["cum for me", "orgasm-force"],
	["Come now.", "orgasm-force"],
	["You will come now.", "orgasm-force"],
	["Go over the edge now.", "orgasm-force"],
	// The nesting itself: each of these contains a shorter phrase that means the opposite.
	["You cannot come now.", "orgasm-deny"], // contains "come now"
	["You may come now.", "orgasm-allow"], // contains "come now" AND "you may come"
	// Must NOT be swallowed by neighbouring entries in the table.
	["Missy, you are stuck at the edge.", "arousal-full"], // "stuck" belongs to movement-block
	["You cannot move.", "movement-block"], // the reverse still holds
	["You cannot speak.", "speech-block"],
	// Ordinary conversation stays inert.
	["I am so close to finishing this.", null],
	["We are almost there.", null],
	["Come out of the trance.", null], // wake handles this, not a suggestion
];
for (const [phrase, expected] of CASES) check(phrase, matchSuggestion(phrase), expected);

// --- the BC API sequencing ---
// Stubbed rather than mocked at the module boundary: arousal.ts calls BC's globals
// directly, so the globals are what gets stood up.
globalThis.CurrentTime = 1_000_000;
globalThis.Player = { ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 } };
globalThis.ServerPlayerIsInChatRoom = () => false;
globalThis.Asset = [];
let calls = [];
globalThis.ActivitySetArousal = (C, p) => {
	calls.push(`set:${p}`);
	C.ArousalSettings.Progress = p;
};
globalThis.ActivityExpression = (C, p) => calls.push(`expr:${p}`);
// Stands in for ActivityOrgasmPrepare, which declines by leaving OrgasmTimer alone.
let prepareDeclines = false;
globalThis.ActivityOrgasmPrepare = (C) => {
	calls.push("prepare");
	if (!prepareDeclines) C.ArousalSettings.OrgasmTimer = CurrentTime + 5000;
};
globalThis.ActivityOrgasmStart = () => calls.push("start");

const arousal = await import("./arousal-bundle.mjs");

check("levels map to BC's own bands", arousal.AROUSAL_LEVELS, { none: 0, light: 30, high: 70, full: 95 });

calls = [];
arousal.setArousalLevel("high");
check("setting a level also moves the face", calls, ["set:70", "expr:70"]);

// A player who turned expressions off keeps them off.
Player.ArousalSettings.AffectExpression = false;
calls = [];
arousal.setArousalLevel("light");
check("AffectExpression false skips the face", calls, ["set:30"]);
Player.ArousalSettings.AffectExpression = true;

// Arousal switched off entirely — nothing lands at all.
Player.ArousalSettings.Active = "Inactive";
calls = [];
check("Inactive refuses", arousal.setArousalLevel("full"), false);
check("  and calls nothing", calls, []);
check("  orgasm too", arousal.forceOrgasm(), "unavailable");
Player.ArousalSettings.Active = "Hybrid";

// Forced orgasm skips BC's 5-second resist window: prepare, then start immediately.
Player.ArousalSettings.OrgasmTimer = 0;
calls = [];
check("forced orgasm", arousal.forceOrgasm(), "orgasm");
check("  skips the resist window", calls, ["prepare", "start"]);

// Already running: don't restart it.
check("already orgasming", arousal.forceOrgasm(), "already");

// Denial (or a chastity item) makes Prepare decline, and Start must not run anyway.
Player.ArousalSettings.OrgasmTimer = 0;
prepareDeclines = true;
calls = [];
check("denied by BC", arousal.forceOrgasm(), "denied");
check("  never starts", calls, ["prepare"]);

console.log(`arousal: ${pass}/${pass + failures.length} passed`);
for (const f of failures) console.log(`  ${JSON.stringify(f.phrase)}\n    expected: ${f.expected}\n    got:      ${f.got}`);
process.exit(failures.length ? 1 : 0);
