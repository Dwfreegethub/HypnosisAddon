// The induction box (v1.16.41, UI lab review F11: "Something about the way they say your name…" came
// out a third the size of the lines around it, because DrawTextFit shrank it to one line). Each
// check says what failure looks like.
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

// A canvas that records each line: its text, size, y and colour. Text is ~0.5em a character.
let drawn = [];
const state = { font: "36px arial", fillStyle: "Black" };
const stack = [];
globalThis.MainCanvas = {
	get font() { return state.font; }, set font(v) { state.font = v; },
	get fillStyle() { return state.fillStyle; }, set fillStyle(v) { state.fillStyle = v; },
	textAlign: "left", textBaseline: "middle",
	save() { stack.push({ ...state }); }, restore() { Object.assign(state, stack.pop()); },
	measureText(t) { return { width: t.length * parseInt(state.font) * 0.5 }; },
	fillText(text, x, y, maxWidth) { drawn.push({ text, size: parseInt(state.font), y, maxWidth }); },
};
globalThis.CommonGetFont = (n) => `${n}px arial`;
let buttonTop = null;
globalThis.DrawRect = () => {};
globalThis.DrawEmptyRect = () => {};
globalThis.DrawButton = (x, y) => { buttonTop = y; };
globalThis.DrawTextFit = (text) => drawn.push({ text, size: "fit" });

const { prompt, session } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const honoured of [30, 60, 90]) {
	const descriptor = session.skillDescriptor(honoured);
	drawn = [];
	prompt.drawPrompt("Mira", 58_000, descriptor);
	const [title, ...rest] = drawn;
	// Failure: a line drawn at a size of its own (shrunk to fit), as the instinct line was.
	check(`${honoured}: every line under the title one size`, [...new Set(rest.map((l) => l.size))], [30]);
	check(`${honoured}:   the title too, none shrunk to fit`, [title.size, drawn.some((l) => l.size === "fit")], [36, false]);
	// Failure: the wrap drops or reorders words.
	const instinct = rest.filter((l) => !/never told|no answer/.test(l.text));
	check(`${honoured}: the instinct line, whole, on two lines at most`, [instinct.map((l) => l.text).join(" "), instinct.length <= 2], [descriptor, true]);
	check(`${honoured}:   each fits the box`, instinct.every((l) => l.text.length * 15 <= l.maxWidth), true);
	// Failure: lines overlap each other, or the countdown runs into the buttons.
	const ys = drawn.map((l) => l.y);
	check(`${honoured}: lines in order, 30px or more apart`, ys.every((y, i) => i === 0 || y - ys[i - 1] >= 30), true);
	check(`${honoured}:   the countdown is last, clear of the buttons`, [/no answer/.test(drawn.at(-1).text), drawn.at(-1).y + 15 < buttonTop], [true, true]);
}
drawn = [];
prompt.drawPrompt("Mira", 58_000, null);
check("no read on them: three lines, the countdown clear of the buttons", [drawn.length, drawn.at(-1).y + 15 < buttonTop], [3, true]);

console.log(`prompt-box: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
