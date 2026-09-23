// Cut a release build and refresh the committed install files.
//
// Since v0.83.0 a release is TWO committed files, both build artifacts:
//
//   HypnosisAddon.user.js   at the repo root: the small loader players install. meta.txt's
//                           @updateURL/@downloadURL point here, raw on `main`, so every tester's
//                           manager reads this file's version line. Its @version tracks
//                           package.json like everything else, so a manager shows the same number
//                           as the startup chat line.
//   cdn/HypnosisAddon.js    the add-on itself, which the loader fetches from jsDelivr (and from
//                           GitHub directly if jsDelivr fails) on every page load.
//
//   npm run release      # build, then copy both from dist/ over the committed files
//
// Commit both with the version bump. Skipping this leaves testers on the old add-on, and since the
// loader reads cdn/ on main, a bump that updates one file and not the other is exactly the shape
// to check first when a tester's chat line and manager disagree. `npm run build` deliberately does
// NOT touch either file, so ordinary rebuilds do not churn them.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";

execFileSync(process.execPath, ["build.mjs"], { stdio: "inherit" });
mkdirSync("cdn", { recursive: true });
copyFileSync("dist/HypnosisAddon.loader.user.js", "HypnosisAddon.user.js");
copyFileSync("dist/HypnosisAddon.js", "cdn/HypnosisAddon.js");
console.log("release: synced dist/HypnosisAddon.loader.user.js -> HypnosisAddon.user.js (the installed loader)");
console.log("release: synced dist/HypnosisAddon.js -> cdn/HypnosisAddon.js (what the loader fetches; commit both)");
