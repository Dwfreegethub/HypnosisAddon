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

const options = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	outfile: "dist/HypnosisAddon.user.js",
	format: "iife",
	target: "es2020",
	banner: { js: banner },
	define: { __VERSION__: JSON.stringify(pkg.version) },
	logLevel: "info",
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching for changes...");
} else {
	await esbuild.build(options);
}
