// Our effects survive another add-on wiping the Emoticon item, v0.90.2.
//
// Found live by DW, 2026-09-26: "you cannot move" printed its flavour and did nothing. The console
// showed Missy's Emoticon item with `Property: {}` seconds after our write, our allow-list patch in
// place, and ~20 other add-ons loaded. Something replaces the item's whole Property; our Freeze went
// with it, so BC never saw it (HasEffect false, CanWalk true, ChatRoomCanLeave true).
//
// BC's effect pipeline here is transcribed from R132 Character.js: CharacterGetEffects builds the
// list from each item's Property.Effect and Asset.Effect; CharacterLoadEffect caches it as C.Effect;
// HasEffect and CanWalk read the cache. Hooks are installed through a minimal stand-in for the mod
// SDK's hookFunction, which wraps the global exactly as bcModSdk does (hook first, then next).
//
// Every check states what failure looks like. The wipe checks fail on v0.90.1.
const HYP = 246108;
const emoticonAsset = { Name: "Emoticon", Group: { Name: "Emoticon" }, Effect: [], AllowEffect: [] };
const feetAsset = { Name: "Chains", Group: { Name: "ItemFeet" }, Effect: [], AllowEffect: [] };
const emoticon = { Asset: emoticonAsset, Property: {} };
globalThis.Asset = [emoticonAsset, feetAsset];
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {},
	Appearance: [emoticon, { Asset: feetAsset, Property: {} }],
	Effect: [],
	IsPlayer() { return true; },
	HasEffect(e) { return this.Effect.includes(e); },
	CanWalk() { return !this.HasEffect("Freeze") && !this.HasEffect("Tethered") && !this.HasEffect("Mounted"); },
};
// R132 CharacterGetEffects / CharacterLoadEffect, trimmed to what matters here.
globalThis.CharacterGetEffects = (C, Groups = undefined) => {
	const total = [];
	for (const item of C.Appearance) {
		if (Array.isArray(Groups) && Groups.length && !Groups.includes(item.Asset.Group.Name)) continue;
		for (const e of [...(item.Property?.Effect ?? []), ...(item.Asset.Effect ?? [])]) if (!total.includes(e)) total.push(e);
	}
	return total;
};
globalThis.CharacterLoadEffect = (C) => { C.Effect = CharacterGetEffects(C); };
// What the room is sent: a copy of our appearance at the moment of the update.
let sentEffects = [];
globalThis.ChatRoomCharacterUpdate = (C) => { sentEffects = [...(C.Appearance[0].Property?.Effect ?? [])]; };
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendLocal = () => {};
globalThis.ChatRoomSendEmote = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
// The mod SDK's hookFunction: our hook runs first and calls next() for the original.
const modApi = {
	hookFunction(name, _priority, hook) {
		const original = globalThis[name];
		globalThis[name] = (...args) => hook(args, (a) => original(...a));
	},
};

const { effects, voice, storage, session } = await import("./harness-bundle.mjs");
effects.installEffectAllowList();
effects.installEffectHooks(modApi);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

// --- applying ----------------------------------------------------------------------------------
check("apply Freeze reports it landed", effects.applyEffect("Freeze"), true);
check("  BC sees it (HasEffect)", Player.HasEffect("Freeze"), true);
check("  so she cannot walk (and so cannot leave)", Player.CanWalk(), false);
check("  the room was sent it", sentEffects.includes("Freeze"), true);

// --- DW's report: another add-on replaces the item's whole Property ---------------------------------
// Failure (v0.90.1): HasEffect false, CanWalk true — the freeze silently gone.
emoticon.Property = {};
CharacterLoadEffect(Player);
check("item wiped: BC still sees the freeze", Player.HasEffect("Freeze"), true);
check("  she still cannot walk", Player.CanWalk(), false);
check("  hasOwnEffect still says it is ours", effects.hasOwnEffect("Freeze"), true);
check("  the item itself does not carry it (until the next sync)", effects.itemCarriesEffect("Freeze"), false);
// The other add-on then syncs its change to the room. Failure: the room is told she is free.
ChatRoomCharacterUpdate(Player);
check("the next sync puts it back on the item", effects.itemCarriesEffect("Freeze"), true);
check("  and the room is sent it", sentEffects.includes("Freeze"), true);

// A whole new item object (an outfit load), not just a new Property. Failure: as above.
Player.Appearance[0] = { Asset: emoticonAsset, Property: { Expression: "Afk" } };
CharacterLoadEffect(Player);
check("item replaced outright: BC still sees the freeze", Player.HasEffect("Freeze"), true);
ChatRoomCharacterUpdate(Player);
check("  and the sync puts it on the new item, keeping its expression", Player.Appearance[0].Property, { Expression: "Afk", Effect: ["Freeze"] });

// --- the hook stays in its lane ---------------------------------------------------------------------
// BC asks about specific item slots with a group filter; ours belong to the Emoticon slot only.
check("a group-filtered question about the feet does not see our freeze", CharacterGetEffects(Player, ["ItemFeet"]).includes("Freeze"), false);
check("one that includes the Emoticon slot does", CharacterGetEffects(Player, ["Emoticon"]).includes("Freeze"), true);

// --- removing ---------------------------------------------------------------------------------------
// Failure: the freeze comes back from our record after a release, or the item keeps it.
effects.removeEffect("Freeze");
check("removed: BC no longer sees it", Player.HasEffect("Freeze"), false);
check("  she can walk", Player.CanWalk(), true);
check("  not ours any more", effects.hasOwnEffect("Freeze"), false);
ChatRoomCharacterUpdate(Player);
check("  and a later sync does not put it back", effects.itemCarriesEffect("Freeze"), false);

// The safeword, after a wipe. Failure: the record keeps her frozen with the item already clean.
effects.applyEffect("Freeze");
Player.Appearance[0].Property = {};
session.safeword();
CharacterLoadEffect(Player);
check("wiped, then the safeword: free", [Player.HasEffect("Freeze"), Player.CanWalk()], [false, true]);

// --- rule 5: a freeze that does not land says so ------------------------------------------------------
// Failure: the flavour line plays and the hypnotist is told nothing.
for (const k of ["hypnoEnabled", "movementRestriction"]) storage.setFeature(k, true);
session.forceTrance(HYP, 80, 80);
const realHas = Player.HasEffect;
Player.HasEffect = () => false; // BC refuses to report it, whatever we do
toHyp = [];
voice.handleSpokenLine(HYP, "Missy, you cannot move");
check("the hypnotist is told it did not land", toHyp.some((t) => /movement-block" matched but did not land: effect-failed/.test(t)), true);
check("  and it is not kept as ours", effects.hasOwnEffect("Freeze"), false);
Player.HasEffect = realHas;
session.safeword();

console.log(`effect-wipe: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
