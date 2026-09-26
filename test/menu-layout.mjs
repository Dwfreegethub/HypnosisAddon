// The settings screen's checkbox lists: one column, scrolling (v0.86.0).
//
// v0.85.4: the thirteenth permission row made the Permissions tab's left column seven deep, and
// its last checkbox — Self-Touch Control — was drawn under the attempt-limit button, where it
// could be neither seen nor clicked. v0.85.4 moved the button into the one free slot; v0.86.0
// replaced the two-column layout with a scroll area so a list can keep growing.
//
// This drives the REAL settings screen (installMenu → BC's extension-settings hooks) through
// stubbed drawing primitives, recording every checkbox, button and line of text and the clip
// rectangle each was drawn under. It asserts that nothing overlaps, that the list is clipped to
// an area inside the panel, that the bar and the wheel move it, and — the part a scroll area
// most easily gets wrong — that clicks land where things are DRAWN: on a row after scrolling,
// and never on the clipped-off part of a row that is only half in view.
const FONT_RE = /(\d+)px/;
let curSize = 36;
let clip = null;       // the active clip rectangle, or null
const saved = [];      // save()/restore() stack, as the real canvas keeps one
let pendingRect = null;
const boxes = [];      // DrawCheckbox
const buttons = [];    // DrawButton
const texts = [];      // our own fillText (drawLeftTextFit / drawLeftTextWrap)
const reset = () => { boxes.length = 0; buttons.length = 0; texts.length = 0; };

const wheelListeners = new Set();
globalThis.MainCanvas = {
	save() { saved.push(clip); }, restore() { clip = saved.pop() ?? null; },
	beginPath() {}, rect(l, t, w, h) { pendingRect = { left: l, top: t, width: w, height: h }; }, clip() { clip = pendingRect; },
	set font(f) { const m = FONT_RE.exec(f); curSize = m ? Number(m[1]) : 36; },
	get font() { return `${curSize}px arial`; },
	// Roughly Arial's average advance; every assertion is relative to the same measure.
	measureText(t) { return { width: t.length * curSize * 0.5 }; },
	set textAlign(_v) {}, set textBaseline(_v) {}, set fillStyle(_v) {},
	fillText(text, x, y) { texts.push({ text, left: x, width: text.length * curSize * 0.5, top: y - curSize / 2, height: curSize, clip }); },
	canvas: {
		addEventListener(type, fn) { if (type === "wheel") wheelListeners.add(fn); },
		removeEventListener(type, fn) { if (type === "wheel") wheelListeners.delete(fn); },
	},
};
globalThis.MainCanvasWidth = 2000;
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.DrawCheckbox = (left, top, width, height, _t, checked, disabled) => boxes.push({ left, top, width, height, checked, disabled, clip });
globalThis.DrawButton = (left, top, width, height, label, _c, _i, hover) => buttons.push({ left, top, width, height, label, hover, clip });
for (const n of ["DrawText", "DrawTextFit", "DrawRect", "DrawEmptyRect", "DrawImage", "DrawImageResize", "DrawTextWrap"]) globalThis[n] = () => {};
globalThis.MouseX = 0;
globalThis.MouseY = 0;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;
globalThis.PreferenceSubscreenExtensionsClear = () => {};
// The Triggers tab's dropdowns are DOM; only their existence matters here.
const elements = {};
globalThis.document = { getElementById: (id) => elements[id] ?? null };
globalThis.ElementCreateDropdown = (id) => (elements[id] = { selectedIndex: 0, disabled: false });
globalThis.ElementCreateInput = (id) => (elements[id] = { value: "", disabled: false, addEventListener() {}, setAttribute() {} });
globalThis.ElementCreateDropdown = (id) => (elements[id] = { selectedIndex: 0, disabled: false, addEventListener() {}, setAttribute() {} });
globalThis.ElementPosition = () => {};
globalThis.ElementNumberInputWheel = () => {};
globalThis.ElementRemove = (id) => { delete elements[id]; };
let screen = null;
globalThis.PreferenceRegisterExtensionSetting = (s) => { screen = s; };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {} };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ChatRoomData = null;

const { menu, storage, panel } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const PANEL_BOTTOM = panel.PANEL_TOP + panel.PANEL_HEIGHT;
const PANEL_RIGHT = panel.PANEL_LEFT + panel.PANEL_WIDTH;
const BODY_TOP = panel.BLURB_Y + 25; // below the tab's blurb line
const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const inside = (r, c) => r.left >= c.left && r.top >= c.top && r.left + r.width <= c.left + c.width && r.top + r.height <= c.top + c.height;

storage.setStarterState("done"); // past the setup wizard, onto the tabs
menu.installMenu();
check("the settings screen registered", typeof screen?.run, "function");
screen.load();
check("load listens for the wheel", wheelListeners.size, 1);

const frame = () => { reset(); screen.run(); };
const clickAt = (x, y) => { MouseX = x; MouseY = y; screen.click(); };
const openTab = (i) => clickAt(panel.TAB_LEFT + 20, panel.tabTop(i) + 30);
const up = () => buttons.find((b) => b.label === "▲");
const down = () => buttons.find((b) => b.label === "▼");
const wheel = (deltaY) => { for (const fn of wheelListeners) fn({ deltaY }); };
// Text drawn under the list's clip: the row labels (and, at the end, the attempt caption). The
// blurb and the chrome are not clipped.
const rowLabels = () => texts.filter((t) => t.clip);

// --- Permissions: the layout ----------------------------------------------------------------
frame();
const area = boxes[0]?.clip;
check("the rows are drawn under a clip", !!area, true);
check("  every checkbox under the same clip", boxes.every((b) => b.clip === area), true);
check("  the clip is inside the panel", inside(area, { left: panel.PANEL_LEFT, top: BODY_TOP - 10, width: panel.PANEL_WIDTH, height: panel.PANEL_HEIGHT }), true);
check("  and stops 20px above its floor", area.top + area.height <= PANEL_BOTTOM - 20, true);
check("one column: every checkbox at the same x", new Set(boxes.map((b) => b.left)).size, 1);
check("a scroll bar is drawn (13 rows and the attempt control do not fit)", [!!up(), !!down()], [true, true]);
check("  the bar is outside the clipped list", !overlaps(up(), area) && !overlaps(down(), area), true);
check("the first row drawn is Hypnosis Enabled", rowLabels()[0]?.text, "Hypnosis Enabled");
check("Self-Touch Control is on the first screen", rowLabels().some((t) => t.text === "Self-Touch Control"), true);
{
	const shown = [...boxes.map((b) => ({ name: "box", ...b })), ...rowLabels().map((t) => ({ name: t.text, ...t }))];
	const hits = [];
	for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) if (overlaps(shown[i], shown[j])) hits.push(`${shown[i].name}@${shown[i].top} × ${shown[j].name}@${shown[j].top}`);
	check("nothing drawn in the list overlaps", hits, []);
	check("every label ends before the scroll bar", rowLabels().every((t) => t.left + t.width <= up().left), true);
	check("nothing is drawn wholly outside the clip", shown.filter((r) => !overlaps(r, area)).map((r) => r.name), []);
}

// --- a row half out of view is clickable only where it shows --------------------------------
{
	const cut = boxes.find((b) => b.top < area.top + area.height && b.top + b.height > area.top + area.height);
	check("a row is cut by the bottom of the area on the first screen", !!cut, true);
	const before = JSON.stringify(storage.getFeatures());
	clickAt(cut.left + cut.width / 2, area.top + area.height + 5);
	check("  a click on its clipped-off part does nothing", JSON.stringify(storage.getFeatures()), before);
}

// --- every row toggles where it is drawn, reached by the down arrow -------------------------
const ROWS = [
	["hypnoEnabled", "Hypnosis Enabled"], ["movementRestriction", "Movement Restriction"],
	["clothingRestriction", "Clothing Restriction"], ["postureControl", "Posture Control"],
	["followControl", "Follow / Leash"], ["speechRestriction", "Speech Restriction"],
	["selfTouchControl", "Self-Touch Control"], ["compelActivity", "Made to Act (touch yourself on command)"],
	["compelTouchOthers", "Made to Touch Others (needs Made to Act)"], ["arousalControl", "Arousal & Orgasm"],
	["illusionControl", "Clothing Illusion (you see old clothes)"], ["undressControl", "Undressing"],
	["lockedWhileHypnotized", "Lock settings while a session is on you"],
];
const initial = { ...storage.getFeatures() };
const problems = [];
let arrowClicks = 0;
// Boxes and labels are drawn in pairs, in the same order.
const fullyShown = (label) => boxes.find((b, k) => rowLabels()[k]?.text === label && inside(b, area));
for (const [key, label] of ROWS) {
	frame();
	let box = fullyShown(label);
	for (let guard = 0; !box && guard < 30 && down(); guard++) {
		clickAt(down().left + down().width / 2, down().top + down().height / 2);
		arrowClicks++;
		frame();
		box = fullyShown(label);
	}
	if (!box) { problems.push(`${key} never came fully into view`); continue; }
	clickAt(box.left + box.width / 2, box.top + box.height / 2);
	const changed = ROWS.map(([k]) => k).filter((k) => storage.getFeatures()[k] !== initial[k]);
	if (JSON.stringify(changed) !== JSON.stringify([key])) problems.push(`clicking ${label} changed [${changed}]`);
	clickAt(box.left + box.width / 2, box.top + box.height / 2);
}
check("every checkbox toggles where it is drawn after scrolling", problems, []);
check("  and the down arrow did the scrolling", arrowClicks > 0, true);

// --- the attempt control, at the bottom -----------------------------------------------------
// Down to the end: keep clicking the arrow until the list stops moving.
frame();
for (let guard = 0; guard < 30; guard++) {
	const top = boxes[0].top;
	clickAt(down().left + down().width / 2, down().top + down().height / 2);
	frame();
	if (boxes[0].top === top) break;
}
{
	const attempt = buttons.find((b) => b.label.startsWith("Attempts before they must wait"));
	check("at the bottom, the attempt button is drawn", !!attempt, true);
	check("  wholly in view", inside(attempt, area), true);
	check("  below the last row", attempt.top >= Math.max(...boxes.map((b) => b.top + b.height)), true);
	const caption = texts.filter((t) => /run out|ten minutes/.test(t.text));
	check("  its caption is whole", caption.map((t) => t.text).join(" "), "When they run out, they cannot try you again for ten minutes.");
	check("  and in view", caption.every((t) => inside(t, area)), true)
	const before = storage.getMaxAttempts();
	clickAt(attempt.left + attempt.width / 2, attempt.top + attempt.height / 2);
	check("  the attempt button cycles where it is drawn", storage.getMaxAttempts() !== before, true);
	clickAt(attempt.left + attempt.width / 2, attempt.top + attempt.height / 2);
}

// --- the up arrow and the wheel --------------------------------------------------------------
{
	const firstBefore = rowLabels()[0].text;
	clickAt(up().left + up().width / 2, up().top + up().height / 2);
	frame();
	check("the up arrow moves the list back", rowLabels()[0].text !== firstBefore, true);
	// Wheel back to the top.
	MouseX = area.left + 200; MouseY = area.top + 100;
	for (let i = 0; i < 20; i++) { wheel(-100); frame(); }
	check("the wheel scrolls to the top", rowLabels()[0].text, "Hypnosis Enabled");
	wheel(100); frame();
	check("one wheel notch is one row", boxes[0].top, area.top + 10 - 78);
	MouseX = 100; MouseY = 500;
	const top = boxes[0].top;
	wheel(100); frame();
	check("the wheel does nothing with the pointer outside the list", boxes[0].top, top);
}

// --- tabs that fit, and the tab with DOM controls under its rows -----------------------------
openTab(2); frame(); // Awareness: four rows
check("a tab that fits has no scroll bar", [!!up(), !!down()], [false, false]);
check("  and its rows start at the top again", rowLabels()[0].text, "Clothing Changes");
openTab(1); frame(); // Trance Defaults: seven rows, once two columns
check("Trance Defaults is one column now", new Set(boxes.map((b) => b.left)).size, 1);
check("  and fits without scrolling", !!down(), false);
openTab(3); frame(); // Triggers
check("Triggers' rows stop above its dropdowns at 630", boxes[0].clip.top + boxes[0].clip.height <= 630, true);
// Five rows since v0.87.0 (whole-words matching): four fit above the dropdowns, and the list
// scrolls to the fifth rather than running under them.
check("  four fit wholly in view", boxes.filter((b) => inside(b, b.clip)).length, 4);
check("  and a scroll bar reaches the fifth", !!down(), true);
// v0.90.0: the drop-trigger control scrolls in after the rows, as the attempt control does on
// Permissions. Failure: it cannot be reached, or clicking it does not cycle the setting.
{
	for (let i = 0; i < 10; i++) { const d = down(); if (d) clickAt(d.left + 5, d.top + 5); frame(); }
	const drop = buttons.find((b) => /^Drop triggers: /.test(b.label));
	check("  the Drop triggers control scrolls into view", !!drop && inside(drop, drop.clip), true);
	check("    and reads Off by default", drop?.label, "Drop triggers: Off");
	clickAt(drop.left + 5, drop.top + 5); frame();
	check("    a click cycles it to One time", storage.getDropMode(), "once");
	storage.setDropMode("off");
}

// --- Planted (v0.88.0): the trigger inspector -------------------------------------------------
{
	const plantedTab = 4;
	const t = (phrase, by) => ({ phrase, actions: ["movement-block"], installedBy: by, installedByName: `Hyp${by}`, installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
	storage.forgetAllTriggers();
	openTab(plantedTab); frame();
	check("Planted: empty says so", texts.some((x) => /No triggers are planted/.test(x.text)), true);
	check("  and draws no Clear All", buttons.some((b) => b.label === "Clear All"), false);
	for (let i = 1; i <= 8; i++) storage.saveTrigger(t(`word number ${i}`, 1000 + i));
	frame();
	const purges = () => buttons.filter((b) => b.label === "Purge");
	check("Planted: six rows on the first page", purges().length, 6);
	check("  each with Details", buttons.filter((b) => b.label === "Details").length, 6);
	check("  paging shows (8 triggers)", ["Prev", "Next"].every((l) => buttons.some((b) => b.label === l)), true);
	check("  Clear All shows", buttons.some((b) => b.label === "Clear All"), true);
	check("  the phrase is not drawn", texts.some((x) => /word number/.test(x.text)), false);
	const drawn = [...buttons.filter((b) => b.left >= panel.PANEL_LEFT && b.top > panel.BLURB_Y).map((b) => ({ name: b.label, ...b })), ...texts.filter((x) => x.top > panel.BLURB_Y + 20).map((x) => ({ name: x.text, ...x }))];
	const hits = [];
	for (let i = 0; i < drawn.length; i++) for (let j = i + 1; j < drawn.length; j++) if (overlaps(drawn[i], drawn[j])) hits.push(`${drawn[i].name}@${drawn[i].top} × ${drawn[j].name}@${drawn[j].top}`);
	check("  nothing on it overlaps", hits, []);
	check("  everything inside the panel", drawn.filter((r) => !inside(r, { left: panel.PANEL_LEFT, top: panel.PANEL_TOP, width: panel.PANEL_WIDTH, height: panel.PANEL_HEIGHT })).map((r) => r.name), []);
	const next = buttons.find((b) => b.label === "Next");
	clickAt(next.left + 5, next.top + 5); frame();
	check("  Next shows the last two", purges().length, 2);
	// Purge the first row on page 2 (trigger 7). Failure: nothing removed, or the wrong one.
	const p7 = purges()[0];
	clickAt(p7.left + 5, p7.top + 5); frame();
	check("  Purge removes that trigger", storage.listTriggers().map((x) => x.installedBy).includes(1007), false);
	check("  and only that one", storage.listTriggers().length, 7);
	// Details, then Back.
	const d = buttons.find((b) => b.label === "Details");
	clickAt(d.left + 5, d.top + 5); frame();
	check("  Details shows what it does", texts.some((x) => /What it does: you cannot move/.test(x.text)), true);
	check("    and hides the word", texts.some((x) => /word number/.test(x.text)), false);
	const back = buttons.find((b) => b.label === "Back");
	clickAt(back.left + 5, back.top + 5); frame();
	check("  Back returns to the list", buttons.some((b) => b.label === "Details"), true);
	// Clear All asks first. Failure: one click clears.
	const clear = () => buttons.find((b) => b.label === "Clear All" || b.label === "Confirm?");
	clickAt(clear().left + 5, clear().top + 5); frame();
	check("  Clear All: first click only arms it", [storage.listTriggers().length, clear().label], [7, "Confirm?"]);
	clickAt(clear().left + 5, clear().top + 5); frame();
	check("  second click clears", storage.listTriggers().length, 0);
	// A click where the Stats tab's Reset button would be must be consumed here, not reset.
	storage.saveTrigger(t("left alone", 2000));
	storage.setFeature("hypnoEnabled", true);
	frame();
	clickAt(panel.CONTENT_LEFT + 2 * 220 + 10, 745);
	check("  a click on empty panel space changes nothing", [storage.listTriggers().length, storage.getFeatures().hypnoEnabled], [1, true]);
	storage.forgetAllTriggers();
	storage.setFeature("hypnoEnabled", false);
}
// The wheel listener outlives the list: it must not scroll it while something else is drawn.
// Probed through the help page, because closing help (unlike changing tab) keeps the offset.
openTab(0); frame();
{
	clickAt(1700 + 10, panel.BACK_TOP + 10); // the "?" button
	frame();                                  // help is drawn, not the rows
	MouseX = area.left + 200; MouseY = area.top + 100;
	wheel(100); wheel(100);
	clickAt(panel.BACK_LEFT + 10, panel.BACK_TOP + 10); // help's own back button
	frame();
	check("a wheel turned over the help page does not scroll the list behind it", rowLabels()[0]?.text, "Hypnosis Enabled");
}

screen.exit();
check("exit stops listening for the wheel", wheelListeners.size, 0);
screen.load();
screen.unload();
check("unload stops listening too", wheelListeners.size, 0);

console.log(`menu-layout: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
