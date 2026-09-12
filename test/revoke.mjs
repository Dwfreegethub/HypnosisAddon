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
globalThis.localStorage = {
	_d: {},
	getItem(k) { return this._d[k] ?? null; },
	setItem(k, v) { this._d[k] = v; },
	removeItem(k) { delete this._d[k]; },
};
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.CharacterLoadSimple = () => ({ Appearance: [], IsPlayer: () => false });
globalThis.CharacterRefresh = () => {};

const { menu, storage, illusion, effects, suppression, session, depth, carry, recovery } = await import("./harness-bundle.mjs");

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

// --- and the SESSION, which it did not take ------------------------------------------------
// The block above is the whole of what this suite used to ask: do the effects come off. They
// did. The session did not — phase stayed Hypnotized, the hypnotist stayed attached, the timer
// kept counting and the depths stayed set. Two things followed, both found in play rather than
// here: flipping the master switch off and back on resumed the trance with no new induction,
// and a genuine induction attempt afterwards was refused "Already under." by a subject who had
// switched the add-on off.
//
// The doc's wording is "clears active trance, suspends all effects". Only the second half was
// happening, and this suite could not see it because it only ever looked at effects.
const HYP = 246108;
storage.setFeature("hypnoEnabled", true);
check("forced under for the test", session.forceTrance(HYP, 80, 80), null);
check("  under, at depth", [session.isHypnotized(), depth.currentDepth()], [true, 80]);
menu.onToggle("hypnoEnabled", false);
check("the hard floor ends the session", session.isHypnotized(), false);
check("  and clears the depth", depth.currentDepth(), 0);
check("  and detaches the hypnotist", session.currentHypnotistId(), null);

// Carried suggestions are the ones most likely to creep back: an ordinary session end
// deliberately re-applies them, and a total stop is not an ordinary session end.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("carryForward", true);
session.forceTrance(HYP, 80, 80);
storage.setFeature("movementRestriction", true);
carry.noteApplied("movement-block");
carry.carryThese(HYP, "GameBot", ["movement-block"]);
check("something is being carried", carry.carriedIds(), ["movement-block"]);
menu.onToggle("hypnoEnabled", false);
check("the hard floor drops it too", carry.carriedIds(), []);

// --- reset, which did not take the session either (Known Bug #4) ---------------------------
// Same class as the block above and found the same way, by asking what a stop actually stops.
// resetSettings() replaced the settings object and saved, and that was all of it: the session
// kept its phase, the timers kept running, the Emoticon effects stayed applied, and the
// recovery key — which lives in its own localStorage entry, so wiping ExtensionSettings
// cannot reach it — would have restored the whole trance on the next load. The subject was
// left frozen and still under by the one command that had just told her it erased everything.
//
// Reset now runs the same teardown as the safeword and the hard floor, and says so. These
// assertions are the reason it cannot quietly stop doing that again: every one of them
// passes today against a resetSettings() that only swaps the settings object EXCEPT the ones
// below, which is exactly the gap that shipped.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("carryForward", true);
storage.setFeature("illusionControl", true);
storage.setFeature("movementRestriction", true);
session.forceTrance(HYP, 80, 80);
illusion.freezeAppearance();
effects.applyEffect("Freeze");
effects.applyEffect("BlockWardrobe");
suppression.setSuppressed("clothing", true);
carry.noteApplied("movement-block");
carry.carryThese(HYP, "GameBot", ["movement-block"]);
// Written down the way a live session writes it down, so the assertion below is about the
// real key and not a value this file invented.
recovery.persist({
	sessionLive: true, hypnotistId: HYP, hypnotistName: "GameBot", depth: 80, depthEarned: 80,
	sessionEndsAt: Date.now() + 600_000, applied: ["movement-block"], carried: ["movement-block"],
	carriedUntil: Date.now() + 600_000, carrierId: HYP, carrierName: "GameBot", triggers: [],
	...recovery.snapshotLocalState(),
});
check("under, with the lot applied", [session.isHypnotized(), effects.hasOwnEffect("Freeze"), illusion.isIllusionActive()], [true, true, true]);
check("  and a recovery key on disk", recovery.describeSavedState().startsWith("saved for reconnect: nothing"), false);

const resetSaid = storage.resetSettings();

// The wording is part of the fix, not decoration: she is told the release happened FIRST,
// because that is the half she needs to trust immediately. A reset that ends a trance and
// only reports the wipe is still a reset that lied about what it did.
check("reset names the release before the wipe", resetSaid, "Trance ended and every effect released. Settings reset to defaults.");
check("reset ends the trance", session.isHypnotized(), false);
check("  and clears the depth", depth.currentDepth(), 0);
check("  and detaches the hypnotist", session.currentHypnotistId(), null);
check("  and takes the freeze off", effects.hasOwnEffect("Freeze"), false);
check("  and the wardrobe block", effects.hasOwnEffect("BlockWardrobe"), false);
check("  and lifts the illusion", illusion.isIllusionActive(), false);
check("  and the suppression", suppression.isSuppressed("clothing"), false);
check("  and drops what was carried", carry.carriedIds(), []);
// The one a settings wipe genuinely cannot reach on its own, and the one that would have
// brought the whole trance back on the next load.
check("  and clears the recovery key", recovery.describeSavedState().startsWith("saved for reconnect: nothing"), true);
// It is still a reset. Ending the trance must not have cost the wipe.
check("  and still wipes the settings", storage.getFeatures().carryForward, false);

// Idle reset must not claim to have ended something. Rule 5 cuts both ways: a stop that says
// nothing is a bug, and so is one that announces a trance nobody was in.
check("an idle reset says only what it did", storage.resetSettings(), "settings reset to defaults");

// The remaining branch — a reset landing mid-induction, which says "Induction stopped"
// rather than "Trance ended" — is not asserted here: reaching AttemptMade means going
// through the hidden-message handler, which only exists after installSession(), and this
// harness deliberately does not run main.ts. It is one ternary in stopForReset().

console.log(`revoke: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
