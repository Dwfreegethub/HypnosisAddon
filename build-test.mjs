// Bundles voice.ts to ESM so the pattern suite can import it directly.
import esbuild from "esbuild";
await esbuild.build({
	entryPoints: ["src/voice.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/voice-bundle.mjs",
	logLevel: "error",
});

// arousal.ts on its own, so the suite can stub BC's globals and watch the call order
// without the rest of the graph loading.
await esbuild.build({
	entryPoints: ["src/arousal.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/arousal-bundle.mjs",
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
