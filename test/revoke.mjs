// Unchecking a permission must free whatever it allowed, immediately.
//
// The settings screen states this as a rule and it was true of most permissions and quietly
// false of two: menu.ts's onToggle had no case for arousalControl or illusionControl, so
// unchecking *Arousal & Orgasm* left DenialMode applied and unchecking *Clothing Illusion*
// left the subject unable to see their own clothes — with the setting that caused it switched
// off. A permission that cannot be withdrawn is not a permission, which is why this suite
// exists as its own file rather than as a footnote in another.
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [
		{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } },
		{ Asset: { Name: "Dress", Group: { Name: "Cloth", Clothing: true, Category: "Appearance" } } },
	],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.CharacterLoadSimple = () => ({ Appearance: [], IsPlayer: () => false });
globalThis.CharacterRefresh = () => {};

const { menu, storage, illusion, effects, suppression } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- Clothing Illusion ------------------------------------------------------------------
// The one that mattered most: the subject is looking at a lie about her own body, and the
// switch that permitted it is now off.
storage.setFeature("illusionControl", true);
illusion.freezeAppearance();
check("illusion running", illusion.isIllusionActive(), true);
menu.onToggle("illusionControl", false);
check("revoking the permission lifts it", illusion.isIllusionActive(), false);

// --- Arousal & Orgasm -------------------------------------------------------------------
// Two lasting states hang off this permission and both have to go.
storage.setFeature("arousalControl", true);
effects.applyEffect("DenialMode");
suppression.setNumb(true);
check("denial applied", effects.hasOwnEffect("DenialMode"), true);
check("numbness applied", suppression.isNumb(), true);
menu.onToggle("arousalControl", false);
check("revoking clears the denial lock", effects.hasOwnEffect("DenialMode"), false);
check("  and the numbness", suppression.isNumb(), false);

// The arousal LEVEL is deliberately NOT reset — it is a number she now carries, not
// something still being done to her. Same reasoning endSession already applies.
Player.ArousalSettings.Progress = 70;
storage.setFeature("arousalControl", true);
menu.onToggle("arousalControl", false);
check("but the arousal level is hers to keep", Player.ArousalSettings.Progress, 70);

// --- the master switch still takes everything ---------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("illusionControl", true);
illusion.freezeAppearance();
effects.applyEffect("DenialMode");
effects.applyEffect("Freeze");
menu.onToggle("hypnoEnabled", false);
check("hypnoEnabled off frees the illusion", illusion.isIllusionActive(), false);
check("  and the freeze", effects.hasOwnEffect("Freeze"), false);

console.log(`revoke: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
