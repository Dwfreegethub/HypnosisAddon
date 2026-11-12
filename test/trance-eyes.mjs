// Her eyes while under (v1.10.0, DW 2026-11-08).
//
// Her choice, off by default, seen by the whole room: one of BC's own eye expressions and, if she
// picks one, a colour. The colour is written to her real eye items, which BC saves with her
// character, so what was there before is saved first and put back on every way out, including the
// next load after a crash. Put back only where it is still what we set.
import { readFileSync } from "node:fs";

const ALLOWED = ["Closed", "Dazed", "Shy", "Dizzy", "Daydream", "Heart", "HeartPink"];
const eye = (group) => ({
	Asset: { Name: "Eyes1", ColorableLayerCount: 2, Group: { Name: group, AllowExpression: ALLOWED } },
	Color: ["#3366CC", "#3366CC"],
	Property: { Expression: null },
});
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {},
	Appearance: [eye("Eyes"), eye("Eyes2"), { Asset: { Name: "CatEye", Group: { Name: "EyeShadow" } }, Color: "#542828", Property: { Opacity: 0.8 } }, { Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.InventoryGet = (C, group) => C.Appearance.find((i) => i.Asset.Group.Name === group) ?? null;
// As R133's: "Eyes" means both, and an expression the group does not allow is refused.
globalThis.CharacterSetFacialExpression = (C, group, expr) => {
	if (group === "Eyes") CharacterSetFacialExpression(C, "Eyes2", expr);
	const item = InventoryGet(C, group === "Eyes1" ? "Eyes" : group);
	if (!item || (expr != null && !item.Asset.Group.AllowExpression.includes(expr))) return;
	item.Property.Expression = expr;
};
let refreshed = 0, updates = 0;
globalThis.CharacterRefresh = () => { refreshed++; };
globalThis.ChatRoomCharacterUpdate = () => { updates++; };
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomCharacter = [Player];
const store = {};
globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; }, removeItem: (k) => { delete store[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};

const { eyes, storage, recovery } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const E1 = () => InventoryGet(Player, "Eyes");
const E2 = () => InventoryGet(Player, "Eyes2");
const look = () => [E1().Property.Expression, E1().Color, E2().Property.Expression, E2().Color];
const BLUE = ["#3366CC", "#3366CC"];
const GREY = ["#A2A2A2", "#A2A2A2"];
const reset = () => { for (const e of [E1(), E2()]) { e.Color = [...BLUE]; e.Property.Expression = null; } storage.setEyesSaved(undefined); };

// --- off by default: nothing at all ------------------------------------------------------------
// Failure looks like: the room sees her eyes change when she never asked for it.
check("off by default", [storage.getTranceEyes(), storage.getTranceEyeColor()], ["", ""]);
check("  going under changes nothing", [eyes.applyTranceEyes(), look()], ["", [null, BLUE, null, BLUE]]);
check("  and saves nothing", storage.getEyesSaved(), undefined);

// --- the choices ----------------------------------------------------------------------------
// Every expression offered must be one BC allows on eyes, or BC refuses it and nothing shows.
const f3 = readFileSync(new URL("../src/eyes.ts", import.meta.url), "utf8");
// DW (v1.10.1): Dazed, Spirals and one Hearts; no Daydream. Each a BC eye expression.
check("the eye choices", storage.TRANCE_EYES.map((e) => e.label), ["Unchanged", "Dazed", "Spirals", "Hearts"]);
check("  every one a BC eye expression", storage.TRANCE_EYES.every((e) => !e.key || ["Dazed", "Dizzy", "Heart"].includes(e.key)), true);
check("  Spirals is BC's Dizzy", storage.TRANCE_EYES.find((e) => e.label === "Spirals")?.key, "Dizzy");
storage.setTranceEyes("Bloodshot");
storage.setTranceEyeColor("#123");
check("a choice not on the list is refused", [storage.getTranceEyes(), storage.getTranceEyeColor()], ["", ""]);

// --- expression and colour: on, and back ------------------------------------------------------
storage.setTranceEyes("Dizzy");
storage.setTranceEyeColor("#A2A2A2");
updates = 0;
eyes.applyTranceEyes();
check("going under: spiral eyes and the grey, both eyes", look(), ["Dizzy", GREY, "Dizzy", GREY]);
check("  sent to the room", updates > 0, true);
check("  her real colour saved first", storage.getEyesSaved()?.eyes?.Eyes?.color, BLUE);
eyes.applyTranceEyes();
// Failure: a second apply saves the GREY as her real colour, and waking leaves her grey for good.
check("applying again does not overwrite what was saved", storage.getEyesSaved()?.eyes?.Eyes?.color, BLUE);
updates = 0;
check("waking puts them back", [eyes.restoreTranceEyes(), look()], [true, [null, BLUE, null, BLUE]]);
check("  sent to the room", updates > 0, true);
check("  and the saved copy is gone", storage.getEyesSaved(), undefined);
check("restoring again does nothing", eyes.restoreTranceEyes(), false);

// --- she changed them during the trance: hers to keep ------------------------------------------
reset();
eyes.applyTranceEyes();
E1().Color = ["#00FF00", "#00FF00"];
E2().Property.Expression = "Shy";
eyes.restoreTranceEyes();
// Failure: waking undoes what she (or another add-on) chose mid-trance.
check("a colour she changed is left alone", E1().Color, ["#00FF00", "#00FF00"]);
check("  but the eye she did not touch gets its colour back", E2().Color, BLUE);
check("an expression she changed is left alone", E2().Property.Expression, "Shy");
check("  and the one she did not is put back", E1().Property.Expression, null);

// --- spirals hide her eye shadow, and put it back (v1.10.1) ------------------------------------
// Failure: the shadow muddies the spiral, or she wakes with her eye shadow gone.
const SHADOW = () => InventoryGet(Player, "EyeShadow");
reset();
storage.setTranceEyes("Dizzy");
storage.setTranceEyeColor("");
eyes.applyTranceEyes();
check("spiral eyes: her eye shadow is hidden", SHADOW().Property.Opacity, 0);
check("  the item itself stays on, untouched", [SHADOW().Asset.Name, SHADOW().Color], ["CatEye", "#542828"]);
eyes.restoreTranceEyes();
check("  and waking puts her opacity back", SHADOW().Property.Opacity, 0.8);
delete SHADOW().Property.Opacity;
eyes.applyTranceEyes();
eyes.restoreTranceEyes();
check("  a shadow with no opacity set goes back to none set", "Opacity" in SHADOW().Property, false);
eyes.applyTranceEyes();
SHADOW().Property.Opacity = 0.5;
eyes.restoreTranceEyes();
check("  one she changed mid-trance is kept", SHADOW().Property.Opacity, 0.5);
SHADOW().Property.Opacity = 0.8;
storage.setTranceEyes("Dazed");
eyes.applyTranceEyes();
check("other eyes leave the shadow alone", SHADOW().Property.Opacity, 0.8);
eyes.restoreTranceEyes();
storage.setTranceEyes("Dizzy");
eyes.applyTranceEyes();
storage.importSettings(storage.exportSettings());
recovery.attemptRecovery();
check("a crash with spiral eyes: the shadow comes back on the next load", SHADOW().Property.Opacity, 0.8);
storage.setTranceEyes("");

// --- expression only, colour only ----------------------------------------------------------
reset();
storage.setTranceEyeColor("");
storage.setTranceEyes("Dazed");
eyes.applyTranceEyes();
check("expression only: her colour untouched", look(), ["Dazed", BLUE, "Dazed", BLUE]);
eyes.restoreTranceEyes();
reset();
storage.setTranceEyes("");
storage.setTranceEyeColor("#FF69B4");
E1().Property.Expression = "Shy";
E2().Property.Expression = "Shy";
eyes.applyTranceEyes();
check("colour only: her expression untouched", look(), ["Shy", ["#FF69B4", "#FF69B4"], "Shy", ["#FF69B4", "#FF69B4"]]);
eyes.restoreTranceEyes();
check("  and back", look(), ["Shy", BLUE, "Shy", BLUE]);

// --- a crash mid-trance: put back on the next load ---------------------------------------------
reset();
storage.setTranceEyes("Dizzy");
storage.setTranceEyeColor("#A2A2A2");
eyes.applyTranceEyes();
// The game goes down here. BC kept the grey on her character; we kept her real colour in settings.
check("the saved copy survives an export and import (it is in her settings)", (() => {
	storage.importSettings(storage.exportSettings());
	return storage.getEyesSaved()?.eyes?.Eyes?.color;
})(), BLUE);
// Next load, no trance to come back to. Failure: she is left grey for good.
const outcome = recovery.attemptRecovery();
check("the next load with no trance to resume puts them back", [outcome !== "resumed" && outcome !== "waiting", look()], [true, [null, BLUE, null, BLUE]]);
check("  and clears the saved copy", storage.getEyesSaved(), undefined);

// --- junk in an import -----------------------------------------------------------------------
{
	const lz = (await import("lz-string")).default;
	const blob = JSON.parse(lz.decompressFromBase64(storage.exportSettings()));
	storage.importSettings(lz.compressToBase64(JSON.stringify({ ...blob, tranceEyes: "HeartPink" })));
	check("v1.10.0's Pink hearts becomes Hearts", storage.getTranceEyes(), "Heart");
	storage.importSettings(lz.compressToBase64(JSON.stringify({ ...blob, tranceEyes: "Daydream" })));
	check("  and its Daydream goes back to Unchanged", storage.getTranceEyes(), "");
	Object.assign(blob, { tranceEyes: "Bloodshot", tranceEyeColor: "red", eyesSaved: "oops" });
	storage.importSettings(lz.compressToBase64(JSON.stringify(blob)));
	check("junk eye settings are dropped on import", [storage.getTranceEyes(), storage.getTranceEyeColor(), storage.getEyesSaved()], ["", "", undefined]);
}

// --- the wiring: going under, and every way out --------------------------------------------
// Failure: an exit path that leaves her eyes changed, or going under never applies them.
const session = readFileSync(new URL("../src/session.ts", import.meta.url), "utf8");
const rec = readFileSync(new URL("../src/recovery.ts", import.meta.url), "utf8");
check("going under applies them", /function applyTranceState\(\)[\s\S]{0,900}applyTranceEyes\(\)/.test(session), true);
check("every teardown that clears the trance also puts the eyes back",
	(session.match(/clearTranceStates\(\);\s*restoreTranceEyes\(\);/g) ?? []).length, (session.match(/clearTranceStates\(\);/g) ?? []).length);
check("recovery's release puts them back", /function releaseEverything[\s\S]{0,400}restoreTranceEyes\(\)/.test(rec), true);
check("  and so does any load that is not resuming the trance", /outcome !== "resumed" && outcome !== "waiting"\) restoreTranceEyes\(\)/.test(rec), true);
check("no asset swap: the eye items are never replaced", /\.Asset\s*=/.test(f3), false);

console.log(`trance-eyes: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
