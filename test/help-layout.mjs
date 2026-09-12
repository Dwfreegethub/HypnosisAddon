// The help screen's single-column, word-wrapped layout (v0.69.0).
//
// The two-column version cut nearly every line off with "…" and let headings overlap the body.
// This drives the real drawHelpLines through a stubbed canvas and asserts the three things that
// were wrong: nothing is drawn wider than the column, nothing is drawn off the bottom of the
// panel, and long content paginates instead of piling up. A fake measureText stands in for BC's —
// the ratio does not have to match BC, only be consistent, since every assertion is relative to
// the same measure the layout used.
const FONT_RE = /(\d+)px/;
let curSize = 24;
const drawn = []; // {text, x, y, width}

globalThis.MainCanvas = {
	save() {}, restore() {},
	set font(f) { const m = FONT_RE.exec(f); curSize = m ? Number(m[1]) : 24; },
	get font() { return `${curSize}px arial`; },
	measureText(t) { return { width: t.length * curSize * 0.5 }; },
	// drawSmallText sets textAlign/textBaseline/fillStyle then fillText — capture the draw.
	set textAlign(_v) {}, set textBaseline(_v) {}, set fillStyle(_v) {},
	fillText(text, x, y) { drawn.push({ text, x, y, width: text.length * curSize * 0.5 }); },
};
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { panel } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// Geometry the layout uses, recomputed from the panel's own exported constants.
const HELP_LEFT = panel.CONTENT_LEFT;
const HELP_WIDTH = panel.PANEL_LEFT + panel.PANEL_WIDTH - panel.CONTENT_LEFT - 40;
const PANEL_BOTTOM = panel.PANEL_TOP + panel.PANEL_HEIGHT;

const render = (lines, page) => {
	drawn.length = 0;
	const pages = panel.drawHelpLines(lines, page);
	return { pages, rows: [...drawn] };
};

// --- a single wide line is WRAPPED, not clipped ---------------------------------------------
const longText = "This is a deliberately long help line that in the old two-column layout would have run well past the column edge and been cut off with an ellipsis instead of wrapping onto the next line where it belongs.";
{
	const { rows } = render([{ text: longText, style: "body" }], 0);
	check("a long line becomes more than one row", rows.length > 1, true);
	check("  and no piece ends in the clip ellipsis", rows.some((r) => r.text.endsWith("…")), false);
	check("  every piece fits the column width", rows.every((r) => r.width <= HELP_WIDTH + 0.01), true);
	check("  all drawn at the single column's left edge", rows.every((r) => r.x === HELP_LEFT), true);
	check("  wrapped pieces stack downward, never overlapping", rows.every((r, i) => i === 0 || r.y > rows[i - 1].y), true);
}

// --- one column: everything shares one x ----------------------------------------------------
{
	const lines = [
		{ text: "First heading", style: "head" },
		{ text: "Body under it", style: "body" },
		{ text: "A dim aside", style: "dim" },
	];
	const { rows } = render(lines, 0);
	check("no second column — one x for all", new Set(rows.map((r) => r.x)).size, 1);
	check("  a heading and its body do not collide", rows[1].y - rows[0].y >= 20, true);
}

// --- long content paginates, and each page stays inside the panel ----------------------------
{
	const many = [];
	for (let i = 0; i < 60; i++) many.push({ text: `Line number ${i} with a little text after it`, style: i % 5 === 0 ? "head" : "body" });
	const first = render(many, 0);
	check("sixty lines need more than one page", first.pages > 1, true);
	check("  page 1 is not empty", first.rows.length > 0, true);
	check("  nothing on page 1 is drawn below the panel floor", first.rows.every((r) => r.y < PANEL_BOTTOM), true);
	const last = render(many, first.pages - 1);
	check("  the last page also renders", last.rows.length > 0, true);
	check("  and stays inside the panel", last.rows.every((r) => r.y < PANEL_BOTTOM), true);
	// A page past the end clamps rather than drawing blank.
	const beyond = render(many, 999);
	check("  a page past the end clamps to the last", beyond.rows.length, last.rows.length);
}

// --- a gap line never renders as text --------------------------------------------------------
{
	const { rows } = render([{ text: "A", style: "body" }, { style: "gap" }, { text: "B", style: "body" }], 0);
	check("gap draws nothing but spaces the two lines", rows.map((r) => r.text), ["A", "B"]);
	check("  and B sits below A with the gap between", rows[1].y - rows[0].y >= 40, true);
}

console.log(`help-layout: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
