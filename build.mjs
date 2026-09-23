import esbuild from "esbuild";
import { readFileSync, mkdirSync } from "fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
// package.json is the single source of truth for the version — meta.txt's banner and the
// runtime __VERSION__ constant both derive from it so they can't silently drift apart.
const banner = readFileSync("meta.txt", "utf8").replace(
	/^(\/\/ @version\s+).*/m,
	`$1${pkg.version}`,
);
const watch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

const common = {
	bundle: true,
	format: "iife",
	target: "es2020",
	define: { __VERSION__: JSON.stringify(pkg.version) },
	logLevel: "info",
};

// The whole add-on as one userscript, header and all. This is the dev build: what a file://
// install from a local checkout runs. Players no longer install it (v0.83.0) — see below.
const options = {
	...common,
	entryPoints: ["src/main.ts"],
	outfile: "dist/HypnosisAddon.user.js",
	banner: { js: banner },
};

// Since v0.83.0 a player installs only the small loader, and the loader fetches the add-on from
// jsDelivr on every page load. These are the two halves of that; `npm run release` copies them to
// the committed files (root HypnosisAddon.user.js and cdn/HypnosisAddon.js).
//
// The bundle carries no userscript header: it is run by the loader's script tag, never installed,
// and a header there would only invite someone to install it directly and lose the loader. Same
// code as the dev build, byte for byte, below the header.
const bundle = {
	...common,
	entryPoints: ["src/main.ts"],
	outfile: "dist/HypnosisAddon.js",
	banner: {
		js: `// Erotic Chat Hypnosis Suite (ECHS) v${pkg.version}. Loaded at runtime by the installed loader;\n// this file is not a userscript. Install https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js`,
	},
};
// The loader carries the same header as the dev build (meta.txt): same name, namespace, update
// URLs and @match list, which is what lets an existing install update onto it in place.
const loader = {
	...common,
	entryPoints: ["src/loader-entry.ts"],
	outfile: "dist/HypnosisAddon.loader.user.js",
	banner: { js: banner },
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching for changes...");
} else {
	await Promise.all([esbuild.build(options), esbuild.build(bundle), esbuild.build(loader)]);
}
