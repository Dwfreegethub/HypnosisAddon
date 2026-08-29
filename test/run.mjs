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
const suites = ["voicetest", "speech", "sup", "part", "wake"];
let failed = false;
for (const s of suites) {
	const out = execFileSync(process.execPath, [new URL(`${s}.mjs`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")], { encoding: "utf8" });
	process.stdout.write(out);
	if (/want|MISMATCH|expected/.test(out)) failed = true;
}
process.exit(failed ? 1 : 0);
