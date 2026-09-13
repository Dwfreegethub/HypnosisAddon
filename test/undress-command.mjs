// A commanded strip overrides OUR hypnotic freeze — command always wins (DW, 2026-09-13), the
// same rule the touch and orgasm commands already follow. undress() itself keeps refusing while
// frozen (that is its own unit test in undress.mjs); the override lives in the command path
// (applyUndress), so this suite drives the REAL voice pipeline — handleSpokenLine("Missy,
// strip.") with a live session and OUR freeze on — and proves the clothes come off, our freeze
// is put back, and a REAL restraint still refuses.
const HYP = 246108;

// BC's effect model: HasEffect / IsRestrained / CanChangeOwnClothes all read the CACHED
// Player.Effect, which CharacterLoadEffect rebuilds from appearance. Our effects.ts writes onto
// the invisible Emoticon carrier; realItemEffects stands in for a restraint we do NOT control,
// so the suite can tell "our freeze" (liftable) from a real one (not).
const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "BlockWardrobe", "DenialMode"] }, Property: { Effect: [] } };
let realItemEffects = [];
const reload = () => (Player.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
	// BC's own restraint gates, derived from the cache exactly as the live client does:
	//   CanInteract         = !HasEffect("Block")                     (hands bound)
	//   IsRestrained        = Freeze || Block || BlockWardrobe
	//   CanChangeOwnClothes = !IsRestrained (+ club-slave etc., not modelled here)
	CanInteract() { return !this.Effect.includes("Block"); },
	CanChangeOwnClothes() { return !["Freeze", "Block", "BlockWardrobe"].some((e) => this.Effect.includes(e)); },
};
globalThis.CurrentTime = 1_000_000;
globalThis.Asset = [emoticon.Asset];
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterRefresh = () => {};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.ServerSend = () => {};
globalThis.InventoryGet = (C, g) => C.Appearance.find((a) => a?.Asset?.Group?.Name === g) ?? null;
globalThis.InventoryRemove = (C, g) => {
	const i = C.Appearance.findIndex((a) => a?.Asset?.Group?.Name === g);
	if (i >= 0) C.Appearance.splice(i, 1);
};

const dress = (...groups) => {
	Player.Appearance = [emoticon, ...groups.map((g) => ({ Asset: { Name: g, Group: { Name: g, Clothing: true } } }))];
};
const wearing = () => Player.Appearance.filter((a) => a?.Asset?.Group?.Clothing).map((a) => a.Asset.Group.Name);

const { voice, session, storage } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line) => voice.handleSpokenLine(HYP, line);
const setOurFreeze = (on) => { emoticon.Property.Effect = on ? ["Freeze"] : []; reload(); };
const setRealFreeze = (on) => { realItemEffects = on ? ["Freeze"] : []; reload(); };

storage.setFeature("hypnoEnabled", true);
storage.setFeature("undressControl", true);
session.forceTrance(HYP, 80, 80);

// --- our freeze does NOT stop a strip command ------------------------------------------------
// The bug DW reported: "you cannot move" took priority over a strip. It should not — the strip
// is the hypnotist's command, not the subject's choice.
dress("Cloth", "Panties");
setOurFreeze(true);
say("Missy, strip.");
check("our freeze does not stop a strip command", wearing(), []);
check("  and our freeze is restored afterward", emoticon.Property.Effect.includes("Freeze"), true);
check("  the effect cache is put back too", Player.HasEffect("Freeze"), true);

// --- a REAL restraint still refuses ----------------------------------------------------------
// A heavy item that freezes her is physical and not ours to lift, so undress() re-reads
// CanChangeOwnClothes against the rebuilt cache and still refuses.
dress("Cloth", "Panties");
setOurFreeze(false); setRealFreeze(true);
say("Missy, strip.");
check("a real freeze still stops the strip", wearing(), ["Cloth", "Panties"]);
setRealFreeze(false);

// --- bound hands (Block) still refuse, even with our freeze ALSO on ---------------------------
// Lifting our freeze must not clear a real restraint underneath it — CanInteract() still false.
dress("Cloth");
emoticon.Property.Effect = ["Freeze"]; realItemEffects = ["Block"]; reload();
say("Missy, strip.");
check("bound hands still stop the strip", wearing(), ["Cloth"]);
check("  and our freeze survived the attempt", emoticon.Property.Effect.includes("Freeze"), true);
emoticon.Property.Effect = []; realItemEffects = []; reload();

// --- with nothing restraining, a plain strip works (the control) -----------------------------
dress("Cloth", "Bra");
say("Missy, take everything off.");
check("an unrestrained strip works", wearing(), []);

console.log(`undress-command: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
