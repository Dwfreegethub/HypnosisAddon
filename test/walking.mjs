// Walking trance — "walk with me" lifts the freeze and thins the veil without ending the
// trance; "be still" restores full stillness. A trance MODE, governed by the trance defaults
// the subject accepted, not by the on-demand movement permission.
//
// Driven through handleSpokenLine with a forced trance, so what is asserted is the state a
// real session would be in, not what a helper returns. The falsifiable core: after "walk with
// me" the subject is NOT frozen but IS still under and still parsing suggestions, and after
// "be still" the freeze is back — a distinction the old model (in trance or not) could not make.
const HYP = 246108;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.ServerSend = () => {};

const { voice, storage, session, effects, suppression } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const frozen = () => effects.hasOwnEffect("Freeze");
const fade = () => effects.getScreenFade();
const say = (line) => voice.handleSpokenLine(HYP, line);

for (const k of ["hypnoEnabled", "movementRestriction", "suppressActivities"]) storage.setFeature(k, true);
// Trance defaults: frozen and faded when under, which is the state walking trance departs from.
storage.setFeature("tranceCannotMove", true);
storage.setFeature("tranceScreenFade", true);

// --- it does nothing when there is no trance to walk ----------------------------------------
check("no session: enter refuses", session.enterWalkingTrance(), false);
check("  and nothing is walking", effects.isWalkingTrance(), false);

// --- under, at full trance: frozen and fully veiled -----------------------------------------
check("forced under", session.forceTrance(HYP, 80, 80), null);
check("full trance freezes", frozen(), true);
check("  and draws the full veil", fade(), effects.TRANCE_FADE_OPACITY);
check("  not walking", effects.isWalkingTrance(), false);

// --- "walk with me": moving, still under ----------------------------------------------------
say("Missy, walk with me.");
check("walking now", effects.isWalkingTrance(), true);
check("  the freeze is lifted", frozen(), false);
check("  the veil thins to the walking level", fade(), effects.WALKING_FADE_OPACITY);
check("  but the trance has NOT ended", session.isHypnotized(), true);

// --- still parsing suggestions while walking (a light effect lands) -------------------------
say("Missy, you will ignore my touches.");
check("a suggestion still fires while walking", suppression.isSuppressed("activity"), true);

// --- "be still": back to full trance --------------------------------------------------------
say("Missy, be still.");
check("no longer walking", effects.isWalkingTrance(), false);
check("  frozen again", frozen(), true);
check("  and the full veil is back", fade(), effects.TRANCE_FADE_OPACITY);
check("  still under throughout", session.isHypnotized(), true);
check("  the light effect it never touched is still on", suppression.isSuppressed("activity"), true);

// --- a leave phrase does nothing when NOT walking (left to the movement suggestion) ---------
// Prove it by removing the freeze by hand, saying "stay still", and seeing the SUGGESTION
// re-apply it — if the walking handler had swallowed the line, nothing would have frozen.
effects.removeEffect("Freeze");
check("hand-cleared for the test", frozen(), false);
say("Missy, stay still.");
check("outside walking trance, 'stay still' reaches the movement suggestion", frozen(), true);
check("  and did not spuriously enter walking trance", effects.isWalkingTrance(), false);

// --- "walk with me" outside any session is inert --------------------------------------------
session.safeword();
check("safeword cleared the walking flag too", effects.isWalkingTrance(), false);
say("Missy, walk with me.");
check("no session: walking line does nothing", effects.isWalkingTrance(), false);

// --- entering, then waking, leaves nothing behind -------------------------------------------
session.forceTrance(HYP, 80, 80);
say("Missy, walk with me.");
check("walking again", effects.isWalkingTrance(), true);
session.safeword();
check("a safeword out of walking trance clears the flag", effects.isWalkingTrance(), false);
check("  and the veil", fade(), 0);
check("  and the freeze", frozen(), false);

console.log(`walking: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
