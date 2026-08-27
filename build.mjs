import esbuild from "esbuild";
import { readFileSync, mkdirSync } from "fs";

const banner = readFileSync("meta.txt", "utf8");
const watch = process.argv.includes("--watch");

mkdirSync("dist", { recursive: true });

const options = {
	entryPoints: ["src/main.ts"],
	bundle: true,
	outfile: "dist/HypnosisAddon.user.js",
	format: "iife",
	target: "es2020",
	banner: { js: banner },
	logLevel: "info",
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log("Watching for changes...");
} else {
	await esbuild.build(options);
}
