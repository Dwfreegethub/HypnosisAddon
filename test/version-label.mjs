// The version label (v1.13.6, DW 2026-11-21): stable shows just the number, a dev build adds " D".
// Decided at load from where the bundle came from (log.ts). Each check says what failure looks like.
//
//   1. The FUSAM dev channel's address gives "D"; stable, jsDelivr (the Tampermonkey loader) and an
//      inline load give nothing. The local test build gives "D" wherever it runs.
//   2. In the real bundle the label is worked out at load, before the first await: the browser only
//      knows document.currentScript during that first synchronous run. Failure: stable for everyone.
//   3. package.json carries no "RC" any more.
import esbuild from "esbuild";
import vm from "node:vm";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };

const { build } = await import("./harness-bundle.mjs");
const DEV = "https://dwfreegethub.github.io/HypnosisAddon/dev/HypnosisAddon.js";
const STABLE = "https://dwfreegethub.github.io/HypnosisAddon/HypnosisAddon.js";
const JSDELIVR = "https://cdn.jsdelivr.net/gh/Dwfreegethub/HypnosisAddon@v1.13.6/cdn/HypnosisAddon.js";
check("dev channel: D", build.channelLabel(DEV, false) === "D", `"D" for ${DEV}`);
check("stable: nothing", build.channelLabel(STABLE, false) === "", `"" for ${STABLE}`);
check("Tampermonkey loader: nothing", build.channelLabel(JSDELIVR, false) === "", `"" for jsDelivr`);
check("inline (bookmark loader): nothing", build.channelLabel("", false) === "", `"" with no script address`);
check("local test build: D anywhere", build.channelLabel(STABLE, true) === "D" && build.channelLabel("", true) === "D", `"D" for the local build`);

// The real bundle, built as build.mjs builds it, run as a browser would: currentScript only during
// the synchronous first run. The label is read through a probe on the one line that computes it.
const bundle = (localBuild) =>
	esbuild.build({
		entryPoints: ["src/index.ts"], bundle: true, format: "iife", target: "es2020", write: false, logLevel: "error",
		define: { __VERSION__: '"test"', __LOCAL_BUILD__: String(localBuild) },
	}).then((r) => r.outputFiles[0].text);
const labelWhenLoadedFrom = (code, src) => {
	const hooked = code.replace("RELEASE_SUFFIX = channelLabel(", "RELEASE_SUFFIX = window.__probe = channelLabel(");
	if (hooked === code) return "probe hook not found";
	let current = src ? { src } : null;
	const ctx = { console: { log() {}, warn() {}, error() {}, info() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, Promise, Date, Math, JSON, TextEncoder, TextDecoder, localStorage: { getItem: () => null, setItem() {} } };
	ctx.document = { get currentScript() { return current; }, createElement: () => ({ style: {}, appendChild() {}, addEventListener() {} }), body: { appendChild() {} }, head: { appendChild() {} }, getElementById: () => null };
	ctx.window = ctx;
	vm.createContext(ctx);
	try { vm.runInContext(hooked, ctx); } catch { /* the game's own globals are missing here; the label is already set */ }
	current = null;
	return ctx.__probe;
};
const shipped = await bundle(false);
check("bundle from the dev channel: D", labelWhenLoadedFrom(shipped, DEV) === " D", `" D", got ${JSON.stringify(labelWhenLoadedFrom(shipped, DEV))}`);
check("bundle from stable: nothing", labelWhenLoadedFrom(shipped, STABLE) === "", `"", got ${JSON.stringify(labelWhenLoadedFrom(shipped, STABLE))}`);
check("bundle from jsDelivr: nothing", labelWhenLoadedFrom(shipped, JSDELIVR) === "", `"", got ${JSON.stringify(labelWhenLoadedFrom(shipped, JSDELIVR))}`);
const local = await bundle(true);
check("local test build: D", labelWhenLoadedFrom(local, STABLE) === " D", `" D", got ${JSON.stringify(labelWhenLoadedFrom(local, STABLE))}`);

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
check("no RC label any more", !("releaseLabel" in pkg), `no releaseLabel in package.json, got ${JSON.stringify(pkg.releaseLabel)}`);

console.log(`version-label: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
