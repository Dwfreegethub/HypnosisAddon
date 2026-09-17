// Cut a release build and refresh the committed install file.
//
// The install story (README > Install, and meta.txt's @updateURL/@downloadURL) serves the
// userscript from `HypnosisAddon.user.js` at the repo root, raw on `main`. That file is a BUILD
// ARTIFACT and has to be regenerated whenever the version bumps, or installed testers keep the
// stale one — the price of the "commit the build" approach. This makes that one step:
//
//   npm run release      # build, then copy dist -> the committed root install file
//
// Then commit the changed HypnosisAddon.user.js alongside the version bump. `npm run build`
// still exists for the dev loop and deliberately does NOT touch the committed file, so ordinary
// rebuilds do not churn it.
import { execFileSync } from "node:child_process";
import { copyFileSync } from "node:fs";

execFileSync(process.execPath, ["build.mjs"], { stdio: "inherit" });
copyFileSync("dist/HypnosisAddon.user.js", "HypnosisAddon.user.js");
console.log("release: synced dist/HypnosisAddon.user.js -> HypnosisAddon.user.js (commit it)");
