// Console levels (v0.82.3).
//
// Every line the add-on wrote went through console.log, so an ordinary evening in a busy room
// filled a player's devtools with one line per chat message, hook and state change. Routine
// diagnostics now go to console.debug (hidden at Chrome's default level); genuine faults go to
// console.warn so they still stand out; the one "script loaded" line stays console.info, because
// the troubleshooting page tells players to look for it.
// Failure looks like: a routine line reaching console.log, a fault reaching only console.debug
// (hidden, so a real failure is silent again — rule 5), or the startup line vanishing.
import { readFileSync, readdirSync } from "node:fs";

const seen = { log: [], debug: [], warn: [], info: [] };
const real = { ...console };
for (const k of Object.keys(seen)) console[k] = (...a) => seen[k].push(a.join(" "));

const { build } = await import("./harness-bundle.mjs");
for (const k of Object.keys(seen)) seen[k] = []; // drop anything logged at import
build.log("ChatRoomMessage", "{}");
build.warn("suggestion parsing failed:", "boom");
build.info("script loaded (vtest)");
const got = { ...seen };
for (const k of Object.keys(seen)) console[k] = real[k];

let pass = 0, fail = 0;
const check = (label, g, want) => {
	const ok = JSON.stringify(g) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(g)}`);
};

check("routine diagnostics go to console.debug", got.debug, ["[HypnosisAddon] ChatRoomMessage {}"]);
check("  and never to console.log", got.log, []);
check("faults go to console.warn, visible by default", got.warn, ["[HypnosisAddon] suggestion parsing failed: boom"]);
check("the startup line is console.info", got.info, ["[HypnosisAddon] script loaded (vtest)"]);

// Nothing in src/ reaches console directly except log.ts itself, so the levels cannot be
// bypassed by a stray console.log added later.
const src = new URL("../src/", import.meta.url);
const direct = readdirSync(src)
	.filter((f) => f.endsWith(".ts") && f !== "log.ts")
	.flatMap((f) => readFileSync(new URL(f, src), "utf8").split("\n")
		.map((l, i) => [f, i + 1, l])
		.filter(([, , l]) => /\bconsole\.\w+\(/.test(l) && !/^\s*(\/\/|\*)/.test(l)))
	.map(([f, n]) => `${f}:${n}`);
check("no module writes to console directly", direct, []);

const main = readFileSync(new URL("main.ts", src), "utf8");
check("main.ts announces startup through info()", /\binfo\(`script loaded/.test(main), true);
// A hook that fails to install is the plainest fault there is; it must not be hidden.
check("  and reports a failed setup through warn()", /\bwarn\(`FAILED to set up/.test(main), true);

console.log(`console: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
