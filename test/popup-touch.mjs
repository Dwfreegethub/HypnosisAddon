// The touch picker (v1.19.2, DW 2026-11-26): who, real or phantom, the touch, then an area types the
// line. Every combination it can type must be read by the matchers as exactly that touch, on that
// person, on that area; and a phantom one as a phantom of that touch.
//
// Failure looks like: a picked line nothing reads, or one read as a different touch, person or
// part; a phantom read as an order to touch herself; or greying the wrong way round.
globalThis.Player = { MemberNumber: 1, Name: "Mira", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid" }, AssetFamily: "Female3DCG" };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: 2, Name: "Sena" }, { MemberNumber: 3, Name: "Rei" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
const { voice, phantom, popupTouch: T } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const wrong = [];
const phantomOf = { Caress: "Caress", Kiss: "Kiss", Lick: "Lick", Grope: "Grope", Pinch: "Pinch", Spank: "Spank", Slap: "Slap", Tickle: "Tickle", Bite: "Bite", Nibble: "Bite", Scratch: "Scratch", MassageHands: "Caress", Pull: "Pull" };
let lines = 0;
for (const v of T.TOUCH_VERBS) for (const a of T.TOUCH_AREAS) {
	for (const who of [{ kind: "self" }, { kind: "me" }, { kind: "other", name: "Rei" }]) {
		const real = T.touchLine(v, who, a.word, false);
		if (real) {
			lines++;
			const line = `Sena, ${real}`;
			if (phantom.matchPhantomTouch(line)) wrong.push(`real read as phantom: ${line}`);
			if (who.kind === "self") {
				const c = voice.matchActivityCommand(line);
				if (c?.kind !== "part" || c.activity !== T.verbActivity(v, a.word, who.kind === "self") || voice.partGroups(c.word)[0] !== voice.partGroups(a.word)[0]) wrong.push(`${line} -> ${JSON.stringify(c)}`);
			} else {
				const c = voice.matchTargetedActivityCommand(line, ["Rei"]);
				const target = who.kind === "me" ? "me" : "Rei";
				const okTarget = who.kind === "me" ? c?.target === "me" : String(c?.target ?? "").toLowerCase() === "rei" || c?.target === 3 || c?.targetName === "Rei";
				if (!c || c.activity !== T.verbActivity(v, a.word, who.kind === "self") || !okTarget || voice.partGroups(c.word)[0] !== voice.partGroups(a.word)[0]) wrong.push(`${line} -> ${JSON.stringify(c)} (want ${v.activity} on ${target}'s ${a.word})`);
			}
		}
		const ph = T.touchLine(v, who, a.word, true);
		if (ph) {
			lines++;
			const line = `Sena, ${ph}`;
			const p = phantom.matchPhantomTouch(line);
			if (!p || p.activity !== phantomOf[v.activity] || phantom.phantomZone(p.part) !== phantom.phantomZone(a.word)) wrong.push(`${line} -> ${JSON.stringify(p)}`);
		}
	}
}
check("every line the picker types reads as what was picked", wrong.slice(0, 15), []);
console.log(`  (${lines} lines checked, ${wrong.length} wrong)`);
check("a phantom on someone else isn't offered", T.touchLine(T.TOUCH_VERBS[2], { kind: "other", name: "Rei" }, "neck", true), null);
check("pull is the hair only", T.touchLine(T.TOUCH_VERBS.find((v) => v.word === "pull"), { kind: "self" }, "neck", false), null);
check("me, phantom: their own imagined", T.touchLine(T.TOUCH_VERBS[2], { kind: "me" }, "neck", true), "you feel my lips on your neck");

// Greying from BC's table.
globalThis.AssetGetActivity = (f, name) => ({ Slap: { Target: ["ItemBreast", "ItemHead"], TargetSelf: true }, Grope: { Target: ["ItemBreast", "ItemButt", "ItemLegs"], TargetSelf: ["ItemBreast", "ItemButt"] } })[name] ?? null;
check("allowed on someone else from Target", [T.areaAllowed("Grope", ["ItemLegs"], false), T.areaAllowed("Grope", ["ItemNeck"], false)], [true, false]);
check("on herself from TargetSelf", [T.areaAllowed("Grope", ["ItemLegs"], true), T.areaAllowed("Grope", ["ItemButt"], true)], [false, true]);
check("TargetSelf true means the same as Target", T.areaAllowed("Slap", ["ItemHead"], true), true);
check("unknown to BC: not greyed", T.areaAllowed("Nothing", ["ItemHead"], true), true);

console.log(`popup-touch: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
