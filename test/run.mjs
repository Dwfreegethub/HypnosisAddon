// Pattern-library regression suite for voice.ts.
//
// Bundles the real module (stubbing nothing — matchSuggestion and friends are pure) and
// runs every case file. This has caught six real bugs before they shipped: adverbs
// breaking "you are completely frozen", "get up" firing on everyday chat, bare "stand"
// and "rise" never matching at all, and awareness-release swallowing "you are awake
// again" (which would have made the wake keyword merely restore awareness while leaving
// the subject under).
//
//   npm test        — bundles voice.ts, then runs every suite
//
// RUN THIS AFTER ANY CHANGE TO voice.ts PATTERNS. Adding a suggestion whose wording
// overlaps an existing one is the easiest mistake to make here and the hardest to notice.
import { execFileSync } from "node:child_process";
const suites = ["voicetest", "speech", "sup", "part", "wake", "triggers", "scope", "arousal", "carry", "notify", "presence", "relation", "rp", "undress", "ooc", "revoke", "recovery", "illusion", "depth", "odds", "attempts", "awareness", "skill", "walking", "chemical-reach", "help-layout", "starter", "welcome", "wizard", "activity", "undress-command", "miss", "alias", "addressee", "departure", "banner", "selftouch", "denial", "relog", "veil", "console", "toast", "expiry", "loader", "touch-others", "first-run-login", "import-lock", "poses", "stutter", "menu-layout", "command-namespace", "trigger-options", "trigger-inspector", "conceal", "drop", "say", "compulsion"];

// A failure is caught two ways, because the suites are not uniform. Most guard their exit —
// they print diagnostics AND `process.exit(1)`, which makes execFileSync throw. A handful of
// the pure pattern suites (voicetest, speech, sup, part, wake) only print and exit 0, so their
// output is scanned for the "want X got Y" / "expected" / "MISMATCH" markers their check
// helpers emit ONLY on a failing case.
//
// The scan first drops the add-on's own "[HypnosisAddon]" log lines: trance flavor such as
// "...makes you want to listen." contains the word "want" and used to read as a failure marker,
// so every run exited non-zero regardless of the checks. Real failure lines are the suites' own
// console.logs and never carry that prefix.
const FAILURE_MARKER = /\bwant\b|\bexpected\b|MISMATCH/;
const stripAddonLogs = (out) => out.split("\n").filter((l) => !l.includes("[HypnosisAddon]")).join("\n");

let failed = false;
for (const s of suites) {
	const path = new URL(`${s}.mjs`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
	let out = "";
	try {
		out = execFileSync(process.execPath, [path], { encoding: "utf8" });
	} catch (err) {
		// Non-zero exit is a failure, full stop — but keep running the rest so one broken suite
		// does not hide the others.
		out = (err.stdout ?? "") + (err.stderr ?? "");
		failed = true;
		console.log(`>>> suite "${s}" exited non-zero (status ${err.status ?? "?"})`);
	}
	process.stdout.write(out);
	if (FAILURE_MARKER.test(stripAddonLogs(out))) failed = true;
}
process.exit(failed ? 1 : 0);
