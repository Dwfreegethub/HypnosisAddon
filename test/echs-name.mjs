// "/echs", never "/hypno", in anything a player sees (DW, 2026-10-28, v0.101.1).
//
// /hypno still WORKS — alias.mjs proves that — but the old name is mentioned only on the wiki. This
// reads the shipped bundle rather than the source, because comments are stripped there: what is
// left is code and the strings players see. Failure looks like a count above 0, with the offending
// text printed so it can be found.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
execFileSync(process.execPath, ["build.mjs"], { cwd: root, stdio: "ignore" });
const bundle = readFileSync(new URL("dist/HypnosisAddon.js", root), "utf8");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const hits = [...bundle.matchAll(/.{0,50}\/hypno\b.{0,30}/g)].map((m) => m[0]);
check("no /hypno anywhere in the shipped add-on", hits, []);
check("the add-on does name /echs (so the check above is reading the right file)", /\/echs safeword/.test(bundle), true);
// The tag is registered under both names; only the first is the one players are shown.
check("/hypno is still registered as a command tag", /["']hypno["']/.test(bundle), true);

console.log(`echs-name: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
