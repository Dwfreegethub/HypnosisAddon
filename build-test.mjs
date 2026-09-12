// Bundles the modules the suites import directly.
//
// TESTING_MODE IS PINNED ON HERE, deliberately, and this is the only place that overrides it.
//
// The flag in src/log.ts is a *release* switch: flipping it to false is the last step before
// shipping (CLAUDE.md rule 11). But several suites stand their fixtures up through the testing
// commands — revoke.mjs reaches Hypnotized via forceTrance — and a release build correctly
// refuses those. Without this pin, the day that flag is flipped, revoke.mjs drops to 25/30: two
// checks fail loudly, and *nine more pass while testing nothing*, because there was never a
// trance for the revoke to take down. That is rule 6 ("if a step cannot fail, it is not testing
// anything") firing on the one build nobody had ever verified revocation against.
//
// So the suites test the logic, and the flag stays purely a release concern. Note the asymmetry
// and keep it: build.mjs does NOT do this, so the shipped userscript still honours whatever
// src/log.ts says. Anything that must be verified with the flag genuinely off belongs in a check
// against dist/, not here.
import esbuild from "esbuild";
import { readFile } from "node:fs/promises";

const TESTING_MODE_DECL = /^export const TESTING_MODE = (?:true|false);$/m;

/** Rewrites src/log.ts on the way into the bundle so TESTING_MODE always reads true. */
const pinTestingMode = {
	name: "pin-testing-mode",
	setup(build) {
		build.onLoad({ filter: /src[\\/]log\.ts$/ }, async (args) => {
			const source = await readFile(args.path, "utf8");
			// Loudly, not silently: if the declaration is ever reworded, the pin would quietly
			// stop applying and the suites would go back to passing vacuously on a release
			// build — the exact failure this exists to prevent.
			if (!TESTING_MODE_DECL.test(source)) {
				throw new Error(
					"build-test.mjs: could not find the TESTING_MODE declaration in src/log.ts, " +
						"so the test harness cannot pin it on. Expected a line reading exactly " +
						"`export const TESTING_MODE = true;` (or `= false;`). Fix the pattern in " +
						"build-test.mjs to match — do not leave the suites unpinned.",
				);
			}
			return {
				contents: source.replace(TESTING_MODE_DECL, "export const TESTING_MODE = true;"),
				loader: "ts",
			};
		});
	},
};

// Bundles voice.ts to ESM so the pattern suite can import it directly.
await esbuild.build({
	entryPoints: ["src/voice.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/voice-bundle.mjs",
	logLevel: "error",
	plugins: [pinTestingMode],
});

// arousal.ts on its own, so the suite can stub BC's globals and watch the call order
// without the rest of the graph loading.
await esbuild.build({
	entryPoints: ["src/arousal.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/arousal-bundle.mjs",
	logLevel: "error",
	plugins: [pinTestingMode],
});

// Shared graph for suites that need several modules to see the same state.
await esbuild.build({
	entryPoints: ["test/harness-entry.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/harness-bundle.mjs",
	logLevel: "error",
	plugins: [pinTestingMode],
});
