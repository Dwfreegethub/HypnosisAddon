// Bundles voice.ts to ESM so the pattern suite can import it directly.
import esbuild from "esbuild";
await esbuild.build({
	entryPoints: ["src/voice.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/voice-bundle.mjs",
	logLevel: "error",
});

// Shared graph for suites that need several modules to see the same state.
await esbuild.build({
	entryPoints: ["test/harness-entry.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/harness-bundle.mjs",
	logLevel: "error",
});
