// Sight, v0.93.0 (DW, 2026-09-26): "you cannot see", linked into BC's own blindness.
//
// BC's three levels: 1 dim, 2 very dark, 3 black. DW: link into BC's blindness and never override
// its limits. So the stand-in below is R132's Player.GetBlindLevel, trimmed: it counts
// BlindLight/BlindNormal/BlindHeavy from CharacterGetEffects asked about ItemHead, ItemHood, ItemNeck
// and ItemDevices ONLY, then clamps to 2 when her Sensory Deprivation setting is Light, else to 3.
// Our effect has to reach BC through that door, or nothing happens.
//
// Every block states what failure looks like.
const HYP = 246108;
const emoticonAsset = { Name: "Emoticon", Group: { Name: "Emoticon" }, Effect: [], AllowEffect: [] };
globalThis.Asset = [emoticonAsset];
const BLIND = { BlindLight: 1, BlindNormal: 2, BlindHeavy: 3 };
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	GameplaySettings: { SensDepChatLog: "Normal" },
	Appearance: [{ Asset: emoticonAsset, Property: {} }],
	Effect: [], ActivePose: ["BaseUpper", "BaseLower"],
	_BlindLevel: undefined,
	IsPlayer() { return true; },
	HasEffect(e) { return this.Effect.includes(e); },
	CanWalk() { return !this.HasEffect("Freeze"); },
	// R132 Character.js GetBlindLevel, trimmed (no eyes-closed or crafted Thick/Thin terms).
	GetBlindLevel() {
		if (this._BlindLevel != null) return this._BlindLevel;
		const effects = CharacterGetEffects(this, ["ItemHead", "ItemHood", "ItemNeck", "ItemDevices"], true);
		let level = effects.reduce((n, e) => n + (BLIND[e] ?? 0), 0);
		level = this.GameplaySettings.SensDepChatLog === "SensDepLight" ? Math.max(0, Math.min(2, level)) : Math.max(0, Math.min(3, level));
		this._BlindLevel = level;
		return level;
	},
};
globalThis.CharacterGetEffects = (C, Groups = undefined) => {
	const total = [];
	for (const item of C.Appearance) {
		if (Array.isArray(Groups) && Groups.length && !Groups.includes(item.Asset.Group.Name)) continue;
		for (const e of [...(item.Property?.Effect ?? []), ...(item.Asset.Effect ?? [])]) total.push(e);
	}
	return total;
};
// R132 CharacterLoadEffect: drops the cached blind level, rebuilds C.Effect.
globalThis.CharacterLoadEffect = (C) => { C._BlindLevel = undefined; C.Effect = CharacterGetEffects(C); };
globalThis.CharacterRefresh = () => {};
globalThis.CharacterSetActivePose = () => {};
globalThis.PoseSetActive = () => {};
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
const pending = [];
globalThis.setTimeout = (fn, ms = 0) => { pending.push({ fn, ms, live: true }); return pending.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pending[id - 1]) pending[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drain = () => {
	for (let g = 0; g < 1000; g++) {
		const i = pending.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pending[i].live = false;
		pending[i].fn();
	}
};
// The mod SDK's hook chain.
const modApi = {
	hookFunction(name, _p, hook) {
		const original = globalThis[name];
		globalThis[name] = (...args) => hook(args, (a) => original(...a));
	},
};

const { voice, storage, session, timers, effects, menu } = await import("./harness-bundle.mjs");
effects.installEffectAllowList();
effects.installEffectHooks(modApi);

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "sightControl", "carryForward"]) storage.setFeature(k, true);
storage.setFeature("tranceCannotMove", false);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drain(); };
const blind = () => Player.GetBlindLevel();
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; Player.GameplaySettings.SensDepChatLog = "Normal"; };

// --- the wordings ---------------------------------------------------------------------------------
// Failure: a wording missed or read at the wrong level, or the clothing illusion's "see" lines taken.
for (const [line, id] of [
	["Missy, you cannot see", "sight-blind"],
	["Missy, you are blind", "sight-blind"],
	["Missy, everything is fading to black", "sight-blind"],
	["Missy, you can barely see", "sight-dark"],
	["Missy, everything is going dark", "sight-dark"],
	["Missy, your vision is dimming", "sight-dim"],
	["Missy, the room grows dim", "sight-dim"],
	["Missy, you can see again", "sight-release"],
	["Missy, your vision clears", "sight-release"],
	["Missy, you cannot see what you are wearing", "illusion-block"],
	["Missy, you can see yourself again", "illusion-release"],
	["I cannot see the door from here", null],
]) check(`"${line}"`, voice.matchSuggestion(line), id);

// --- the three levels, through BC's own door ---------------------------------------------------------
// Failure: BC does not see it (level 0), the wrong level, or it leaks into her synced item.
reset();
under();
say("Missy, your vision is dimming");
check("dim: BC's blind level 1", blind(), 1);
say("Missy, you can barely see");
check("very dark: level 2", blind(), 2);
say("Missy, you cannot see");
check("blind: level 3", blind(), 3);
check("  she is told", said.some((s) => /black|dark|cannot see/i.test(s)), true);
check("  not on her synced item (the room sees nothing)", Player.Appearance[0].Property?.Effect?.some((e) => e.startsWith("Blind")) ?? false, false);
check("  not in her general effect list either", Player.Effect.some((e) => e.startsWith("Blind")), false);
say("Missy, you can see again");
check("released: level 0", blind(), 0);

// --- BC's limits win ------------------------------------------------------------------------------------
// Her Sensory Deprivation setting on Light: BC never goes past 2. Failure: we push through to 3, or
// the hypnotist is not told it stopped short.
reset();
Player.GameplaySettings.SensDepChatLog = "SensDepLight";
under();
say("Missy, you cannot see");
check("SensDep Light: BC caps it at 2", blind(), 2);
check("  the hypnotist is told it stopped short", /sight-capped/.test(toHyp.join(" ")), true);
check("  and she is told some light stays", said.some((s) => /some light stays/i.test(s)), true);
// A real blindfold adds to ours, by BC's own sum — and the cap still holds.
Player.GameplaySettings.SensDepChatLog = "Normal";
Player.Appearance.push({ Asset: { Name: "Blindfold", Group: { Name: "ItemHead" }, Effect: ["BlindLight"] }, Property: {} });
CharacterLoadEffect(Player);
say("Missy, your vision is dimming");
check("dim plus a light blindfold: BC sums them to 2", blind(), 2);
Player.Appearance.pop();
CharacterLoadEffect(Player);

// --- endings --------------------------------------------------------------------------------------------
// Failure: it outlives the trance, the safeword, or the permission.
reset();
under();
say("Missy, you cannot see");
session.wakeByHypnotist(HYP);
check("the wake ends it", blind(), 0);
under();
say("Missy, you cannot see");
session.safeword();
check("the safeword ends it", blind(), 0);
under();
say("Missy, you cannot see");
storage.setFeature("sightControl", false);
menu.onToggle("sightControl", false);
check("unticking Sight ends it at once", blind(), 0);
reset();
under();
say("Missy, you cannot see");
check("permission off: refused", [blind(), /Refused/.test(toHyp.join(" "))], [0, true]);
storage.setFeature("sightControl", true);

// --- carried past the wake (DW: yes) ------------------------------------------------------------------
// Failure: gone at the wake although it was carried.
reset();
under();
say("Missy, you cannot see");
say("Missy, that will stay with you");
session.wakeByHypnotist(HYP);
check("carried: still blind after the wake", blind(), 3);
session.safeword();
check("  until the safeword", blind(), 0);

console.log(`sight: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
