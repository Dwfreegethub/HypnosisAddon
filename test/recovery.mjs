// Surviving a disconnect — and, more importantly, never surviving it as a trap.
//
// BC drops people constantly and a thirty-second blip should not end a scene. But the
// failure this suite really guards is the opposite one: somebody reconnecting still frozen,
// still silent, with nothing running that would ever let go. That case EXISTED before this
// module, and not because state was lost — because half of it was not. Freeze, BlockWardrobe
// and DenialMode ride on the Emoticon item in Player.Appearance, which is server-side and
// comes back on reload, while the session that would release them does not.
const HYP = 246108, OTHER = 999;

globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [
		{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } },
		{ Asset: { Name: "Dress", Group: { Name: "Cloth", Clothing: true, Category: "Appearance" } } },
	],
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
const store = {};
globalThis.localStorage = {
	getItem(k) { return store[k] ?? null; },
	setItem(k, v) { store[k] = v; },
	removeItem(k) { delete store[k]; },
};
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(m);
globalThis.ChatRoomCharacterUpdate = () => {};
// Behaves like BC's: it actually writes the pose onto the character. A no-op stub here made
// the pose test pass vacuously in the wrong direction.
globalThis.CharacterSetActivePose = (C, pose) => { C.ActivePose = pose; };
globalThis.CharacterLoadSimple = () => ({ Appearance: [], IsPlayer: () => false });
globalThis.CharacterRefresh = () => {};
const KNOWN = new Set(["Cloth/Dress", "Bra/Lace"]);
globalThis.AssetGet = (family, group, name) =>
	KNOWN.has(`${group}/${name}`) ? { Name: name, Group: { Name: group, Clothing: true } } : null;

const { recovery, storage, effects, suppression, selftouch, illusion } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const KEY = "HypnosisAddon_Session_1";
const clearAll = () => {
	delete store[KEY];
	recovery.stopWaiting();
	recovery.releaseEverything("test reset");
	said = [];
};
/** A trance written down `agoMs` ago. */
const saveTrance = (agoMs, over = {}) => {
	recovery.persist({
		hypnotistId: HYP, hypnotistName: "GameBot", depth: 55,
		sessionEndsAt: Date.now() + 20 * 60_000,
		speechBlocked: true, screenFade: 0.3, suppressed: ["clothing"], numb: true,
		selfTouch: { all: false, groups: [["ItemBreast", "breasts"]] },
		illusion: null, effects: [], pose: null,
		carried: [], carriedUntil: 0, carrierId: null, carrierName: "", triggers: [], ...over,
	});
	const saved = JSON.parse(store[KEY]);
	saved.savedAt = Date.now() - agoMs;
	store[KEY] = JSON.stringify(saved);
};

let restored = null;
let carriedBack = null;
recovery.registerRecoveryHandlers({
	restoreSession: (s) => { restored = s; },
	restoreCarried: (s) => { carriedBack = s; },
	inRoom: (id) => ChatRoomCharacter.some((c) => c.MemberNumber === id),
});

// --- the hazard that already existed ------------------------------------------------------
// No saved state at all, but our own Freeze still on us from a crash. This is the case that
// left somebody stuck with only the safeword as a way out — and no way to know that.
clearAll();
effects.applyEffect("Freeze");
check("orphaned effects are detected", recovery.hasOrphanedEffects(), true);
check("and cleared on load", recovery.attemptRecovery(), "orphans cleared");
check("  the freeze is gone", effects.hasOwnEffect("Freeze"), false);
check("  and the subject is told", said.some((m) => /let go/.test(m)), true);

// A clean load with nothing stranded must stay silent.
clearAll();
check("nothing to do stays quiet", recovery.attemptRecovery(), "nothing to do");
check("  and says nothing", said.length, 0);

// --- back inside the window, hypnotist present --------------------------------------------
clearAll();
restored = null;
saveTrance(30_000);
check("a quick drop resumes", recovery.attemptRecovery(), "resumed");
check("  the session came back", restored?.depth, 55);
check("  still silenced", effects.isSpeechBlocked(), true);
check("  still faded", effects.getScreenFade(), 0.3);
check("  still unaware of clothing", suppression.isSuppressed("clothing"), true);
check("  still numb", suppression.isNumb(), true);
check("  still blocked from herself", selftouch.selfTouchSnapshot().groups, [["ItemBreast", "breasts"]]);

// --- back inside the window, hypnotist absent ---------------------------------------------
// DW's rule: someone who comes BACK inside the five minutes still counts, so this holds
// rather than releasing — but it holds a clock, not the subject.
clearAll();
globalThis.ChatRoomCharacter = [Player];
saveTrance(30_000);
check("waits for an absent hypnotist", recovery.attemptRecovery(), "waiting");
check("  and says so", said.some((m) => /not back within/.test(m)), true);
check("  holding the effects meanwhile", effects.isSpeechBlocked(), true);
check("  with a clock running", recovery.isWaitingForHypnotist(), true);
recovery.stopWaiting();
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];

// --- too long away -------------------------------------------------------------------------
clearAll();
saveTrance(6 * 60_000);
check("past the window it breaks", recovery.attemptRecovery(), "expired");
check("  speech comes back", effects.isSpeechBlocked(), false);
check("  the fade lifts", effects.getScreenFade(), 0);
check("  awareness returns", suppression.isSuppressed("clothing"), false);
check("  her hands are hers", selftouch.selfTouchSnapshot().groups, []);
check("  and the saved copy is gone", store[KEY], undefined);

// --- the opt-out --------------------------------------------------------------------------
clearAll();
storage.setFeature("releaseOnDisconnect", true);
saveTrance(10_000);
check("release-on-disconnect wins even inside the window", recovery.attemptRecovery(), "released by setting");
check("  nothing held", effects.isSpeechBlocked(), false);
storage.setFeature("releaseOnDisconnect", false);

// --- triggers serve out their remainder ----------------------------------------------------
// A trigger was never part of the session, so it survives regardless of the window and
// regardless of the hypnotist. Reconnecting must not reset a clock that is holding you.
clearAll();
const seen = [];
recovery.registerTriggerRecovery(() => [], (t) => seen.push(t));
saveTrance(6 * 60_000, { triggers: [{ key: "trigger:1:sleepy", actions: ["movement-block"], until: Date.now() + 120_000 }] });
recovery.attemptRecovery();
check("a live trigger is restored even past the window", seen.map((t) => t.key), ["trigger:1:sleepy", "trigger:1:sleepy"]);
check("  with its own remaining time", seen[0].until > Date.now(), true);

// One whose time already ran out while away must NOT come back.
clearAll();
seen.length = 0;
saveTrance(60_000, { triggers: [{ key: "trigger:1:old", actions: ["movement-block"], until: Date.now() - 1000 }] });
recovery.attemptRecovery();
check("an expired trigger stays expired", seen.length, 0);

// --- everything restorable is restored ------------------------------------------------------
// DW's rule: all states come back unless they genuinely cannot. The illusion is the one that
// takes real work, because re-freezing would snapshot the TRUTH — the same trap carry.ts
// documents for waking — so the original garments are rebuilt from their stored identities.
clearAll();
saveTrance(20_000, { illusion: [{ group: "Cloth", name: "Dress" }, { group: "Bra", name: "Lace" }] });
recovery.attemptRecovery();
check("the illusion comes back", illusion.isIllusionActive(), true);
check("  and is not re-snapshotted from the truth", said.some((m) => /as you actually are/.test(m)), false);

// The one case where it genuinely cannot: a BC release removed the asset. Say so rather than
// showing something other than what was frozen.
clearAll();
saveTrance(20_000, { illusion: [{ group: "Cloth", name: "SomethingRemovedInR132" }] });
recovery.attemptRecovery();
check("an unresolvable garment does not fake it", illusion.isIllusionActive(), false);
check("  and the subject is told", said.some((m) => /as you actually are/.test(m)), true);

// --- BC effects are re-asserted, not assumed --------------------------------------------------
// Freeze and friends ride on the Emoticon item and usually survive a reload on their own, but
// a sync landing before the AllowEffect patch strips them. Asserting is idempotent.
clearAll();
saveTrance(20_000, { effects: ["Freeze", "BlockWardrobe"] });
check("no freeze before recovery", effects.hasOwnEffect("Freeze"), false);
recovery.attemptRecovery();
check("the freeze is put back", effects.hasOwnEffect("Freeze"), true);
check("  and the wardrobe block", effects.hasOwnEffect("BlockWardrobe"), true);

// --- a suggested pose survives -------------------------------------------------------------
// ActivePose itself lives on the server, but the knowledge that WE set it does not — and
// without that, waking would leave them kneeling with nothing to undo it.
clearAll();
saveTrance(20_000, { pose: "Kneel" });
recovery.attemptRecovery();
check("the suggested pose is restored", effects.suggestedPose(), "Kneel");

// --- carried suggestions come back with the time they had LEFT -------------------------------
clearAll();
carriedBack = null;
saveTrance(20_000, {
	carried: ["movement-block"], carriedUntil: Date.now() + 120_000, carrierId: HYP, carrierName: "GameBot",
});
recovery.attemptRecovery();
check("carried suggestions are handed back", carriedBack?.carried, ["movement-block"]);
check("  with their carrier", carriedBack?.carrierId, HYP);
check("  and their remaining time, not a fresh one", carriedBack?.carriedUntil > Date.now(), true);

// --- the readout ---------------------------------------------------------------------------
// Generated from the same snapshot the restore reads, so what it SAYS is on you and what
// would actually come back cannot drift apart. A second hand-written list would be wrong
// within two features.
clearAll();
const idle = recovery.describeCurrentState();
check("says so plainly when nothing is on", idle[0], "Nothing is holding you right now.");
check("  and lists nothing else", idle.length, 1);
check("  saved state says nothing too", /nothing/.test(recovery.describeSavedState()), true);

effects.applyEffect("Freeze");
suppression.setNumb(true);
const busy = recovery.describeCurrentState().join(" ");
check("reports what is on", /ON  frozen/.test(busy), true);
check("  and what is not", /-   wardrobe blocked/.test(busy), true);
check("  including numbness", /ON  numb to touch/.test(busy), true);
check("  no longer claims nothing is holding you", /Nothing is holding you/.test(busy), false);

saveTrance(30_000);
check("saved state reports the window", /inside the 5-minute window/.test(recovery.describeSavedState()), true);
saveTrance(9 * 60_000);
check("  and when it has passed", /PAST the 5-minute window/.test(recovery.describeSavedState()), true);
clearAll();

recovery.stopWaiting();
console.log(`recovery: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
