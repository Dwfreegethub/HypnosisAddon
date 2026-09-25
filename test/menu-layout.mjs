// The Permissions tab's layout (v0.85.4).
//
// The thirteenth permission row made the left column seven deep, and its last checkbox —
// Self-Touch Control, at y 748 — was drawn under the attempt-limit button, which sat at a fixed
// 740. The caption under the button covered the rest of it. A permission nobody could see or
// click, and nothing said so.
//
// This drives the REAL settings screen (installMenu → BC's extension-settings hooks) through
// stubbed drawing primitives, records every checkbox, button and line of text it draws, and
// asserts: nothing on the tab overlaps anything else, everything stays inside the panel with the
// caption 20px clear of its floor, and every checkbox and the button toggle when clicked where
// they were drawn.
const FONT_RE = /(\d+)px/;
let curSize = 36;
const boxes = [];   // DrawCheckbox
const buttons = []; // DrawButton
const texts = [];   // our own fillText (drawLeftTextFit / drawLeftTextWrap)
const reset = () => { boxes.length = 0; buttons.length = 0; texts.length = 0; };

globalThis.MainCanvas = {
	save() {}, restore() {},
	set font(f) { const m = FONT_RE.exec(f); curSize = m ? Number(m[1]) : 36; },
	get font() { return `${curSize}px arial`; },
	// Roughly Arial's average advance; every assertion is relative to the same measure.
	measureText(t) { return { width: t.length * curSize * 0.5 }; },
	set textAlign(_v) {}, set textBaseline(_v) {}, set fillStyle(_v) {},
	fillText(text, x, y) { texts.push({ text, left: x, width: text.length * curSize * 0.5, top: y - curSize / 2, height: curSize }); },
	fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {},
};
globalThis.MainCanvasWidth = 2000;
globalThis.CommonGetFont = (size) => `${size}px arial`;
globalThis.DrawCheckbox = (left, top, width, height, _t, checked, disabled) => boxes.push({ left, top, width, height, checked, disabled });
globalThis.DrawButton = (left, top, width, height, label) => buttons.push({ left, top, width, height, label });
for (const n of ["DrawText", "DrawTextFit", "DrawRect", "DrawEmptyRect", "DrawImage", "DrawImageResize", "DrawTextWrap"]) globalThis[n] = () => {};
globalThis.MouseX = 0;
globalThis.MouseY = 0;
globalThis.MouseIn = (l, t, w, h) => MouseX >= l && MouseX <= l + w && MouseY >= t && MouseY <= t + h;
globalThis.PreferenceSubscreenExtensionsClear = () => {};
globalThis.ElementRemove = () => {};
globalThis.document = { getElementById: () => null };
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

storage.setStarterState("done"); // past the setup wizard, onto the tabs
menu.installMenu();
check("the settings screen registered", typeof screen?.run, "function");
screen.load();
reset();
screen.run();

const PANEL_BOTTOM = panel.PANEL_TOP + panel.PANEL_HEIGHT;
const PANEL_RIGHT = panel.PANEL_LEFT + panel.PANEL_WIDTH;
const BODY_TOP = panel.BLURB_Y + 25; // below the tab's blurb line

// Everything drawn in the tab's body: checkboxes, the attempt button, and the text lines below
// the blurb (row labels and the caption). The screen's chrome — title, exit, tabs — is outside.
const attempt = buttons.find((b) => b.label.startsWith("Attempts before they must wait"));
check("the attempt button is drawn", !!attempt, true);
const caption = texts.filter((t) => t.top > BODY_TOP && /ten minutes|run out|cannot try/.test(t.text));
check("the caption is drawn", caption.length > 0, true);
check("  in full, not cut off with …", caption.map((t) => t.text).join(" "), "When they run out, they cannot try you again for ten minutes.");
const labels = texts.filter((t) => t.top > BODY_TOP && !caption.includes(t));
check("thirteen checkboxes drawn", boxes.length, 13);
check("thirteen row labels drawn", labels.length, 13);
check("the Self-Touch Control row is among them", labels.some((t) => t.text === "Self-Touch Control"), true);

const items = [
	...boxes.map((b, i) => ({ name: `checkbox ${i}`, ...b })),
	...labels.map((t) => ({ name: `label "${t.text}"`, ...t })),
	{ name: "attempt button", ...attempt },
	...caption.map((t) => ({ name: `caption "${t.text}"`, ...t })),
];
const overlaps = (a, b) => a.left < b.left + b.width && b.left < a.left + a.width && a.top < b.top + b.height && b.top < a.top + a.height;
const collisions = [];
for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) if (overlaps(items[i], items[j])) collisions.push(`${items[i].name} × ${items[j].name}`);
check("nothing on the Permissions tab overlaps", collisions, []);

const outside = items.filter((r) => r.left < panel.PANEL_LEFT || r.left + r.width > PANEL_RIGHT || r.top < panel.PANEL_TOP || r.top + r.height > PANEL_BOTTOM).map((r) => r.name);
check("everything stays inside the panel", outside, []);
const captionBottom = Math.max(...caption.map((t) => t.top + t.height));
check("the caption ends at least 20px above the panel floor", captionBottom <= PANEL_BOTTOM - 20, true);
check("the caption sits below the button", Math.min(...caption.map((t) => t.top)) >= attempt.top + attempt.height, true);

// --- hit boxes match what was drawn --------------------------------------------------------
const clickAt = (x, y) => { MouseX = x; MouseY = y; screen.click(); };
const features = () => storage.getFeatures();
const rowKeys = ["hypnoEnabled", "movementRestriction", "clothingRestriction", "postureControl", "followControl", "speechRestriction", "selfTouchControl", "compelActivity", "compelTouchOthers", "arousalControl", "illusionControl", "undressControl", "lockedWhileHypnotized"];
const flipped = [];
boxes.forEach((b, i) => {
	const key = rowKeys[i];
	const before = features()[key];
	clickAt(b.left + b.width / 2, b.top + b.height / 2);
	if (features()[key] === before) flipped.push(`${key} did not toggle`);
	clickAt(b.left + b.width / 2, b.top + b.height / 2); // put it back
	if (features()[key] !== before) flipped.push(`${key} did not toggle back`);
});
check("every checkbox toggles where it is drawn", flipped, []);
{
	const before = storage.getMaxAttempts();
	// The corner that used to hide Self-Touch Control's box: clicking there must hit the box.
	const selfTouch = boxes[6];
	const st = features().selfTouchControl;
	clickAt(selfTouch.left + 5, selfTouch.top + selfTouch.height - 5);
	check("Self-Touch Control's lower corner is its own, not the button's", [features().selfTouchControl !== st, storage.getMaxAttempts()], [true, before]);
	clickAt(selfTouch.left + 5, selfTouch.top + selfTouch.height - 5);
	clickAt(attempt.left + attempt.width / 2, attempt.top + attempt.height / 2);
	check("the attempt button cycles where it is drawn", storage.getMaxAttempts() !== before, true);
}

console.log(`menu-layout: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
