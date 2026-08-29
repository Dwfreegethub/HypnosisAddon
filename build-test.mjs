// Bundles voice.ts to ESM so the pattern suite can import it directly.
import esbuild from "esbuild";
await esbuild.build({
	entryPoints: ["src/voice.ts"],
	bundle: true,
	format: "esm",
	outfile: "test/voice-bundle.mjs",
	logLevel: "error",
});
