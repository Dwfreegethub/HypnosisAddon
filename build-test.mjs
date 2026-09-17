// Bundles the modules the suites import directly.
//
// TESTING MODE IS PINNED ON HERE, deliberately, and this is the only place that overrides it.
//
// In the shipped build `isTestingMode()` (src/log.ts) is a runtime check on the chat room name,
// so it is off everywhere except the testing room — there is no release flag any more. But the
// unit suites do not simulate a room, and several stand their fixtures up through the testing
// commands — revoke.mjs reaches Hypnotized via forceTrance. Without a pin those would refuse:
// revoke.mjs would drop to 25/30, two checks failing loudly and *nine more passing while testing
// nothing*, because there was never a trance for the revoke to take down. That is rule 6 ("if a
// step cannot fail, it is not testing anything").
//
// So `src/log.ts` carries a `FORCE_TESTING` seed, `false` in source, and this rewrites it to
// `true` for the test bundles only. build.mjs does NOT do this, so the shipped userscript is
// governed purely by the room check. Anything that must be verified with testing genuinely off
// belongs in a check against a real room, not here.
import esbuild from "esbuild";
import { readFile } from "node:fs/promises";

// The shipped bundle replaces __VERSION__ from package.json (build.mjs). The suites don't care
// what the string is, only that modules using it (welcome.ts's first-run notice) bundle and run
// — so give it a stable placeholder rather than leaving it an undefined global.
const DEFINE = { __VERSION__: JSON.stringify("test") };

const FORCE_TESTING_DECL = /^const FORCE_TESTING: boolean = (?:true|false);$/m;

/** Rewrites src/log.ts on the way into the bundle so isTestingMode() always returns true. */
const pinTestingMode = {
	name: "pin-testing-mode",
	setup(build) {
		build.onLoad({ filter: /src[\\/]log\.ts$/ }, async (args) => {
			const source = await readFile(args.path, "utf8");
			// Loudly, not silently: if the declaration is ever reworded, the pin would quietly
			// stop applying and the suites would go back to passing vacuously with testing off —
			// the exact failure this exists to prevent.
			if (!FORCE_TESTING_DECL.test(source)) {
				throw new Error(
					"build-test.mjs: could not find the FORCE_TESTING declaration in src/log.ts, " +
						"so the test harness cannot pin testing mode on. Expected a line reading exactly " +
						"`const FORCE_TESTING: boolean = false;` (or `= true;`). Fix the pattern in " +
						"build-test.mjs to match — do not leave the suites unpinned.",
				);
			}
			return {
				contents: source.replace(FORCE_TESTING_DECL, "const FORCE_TESTING: boolean = true;"),
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
	define: DEFINE,
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
	define: DEFINE,
	plugins: [pinTestingMode],
});

// Shared graph for suites that need several modules to see the same state.
await esbuild.build({
	entryPoints: ["test/harness-entry.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/harness-bundle.mjs",
	logLevel: "error",
	define: DEFINE,
	plugins: [pinTestingMode],
});
