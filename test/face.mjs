// Her face on command (v1.11.0, DW 2026-11-11): eyes, mouth, tongue, blush, spoken or by trigger.
//
// What this pins:
//   - the wordings, and the near misses that must NOT move her face ("you make me smile", "don't
//     close your eyes", "a smile");
//   - each lands on BC's own expression for its part, and one the part refuses is reported (rule 5);
//   - "relax your face", "open your eyes", "close your mouth" put back what was there;
//   - DW's choice: it lasts until relaxed or she wakes. Every way out puts it back, and it is not
//     carried by "that will stay with you";
//   - with her trance eyes on, "open your eyes" gives the spirals back while she is under, and
//     waking takes them off (the face is put back before the trance eyes);
//   - a trigger can carry one, and its undo touches only the face it set;
//   - a crash mid-trance is put right on the next load.
//
// BC's setter is R132 Character.js CharacterSetFacialExpression, trimmed: "Eyes" sets both eyes, an
// expression the group does not allow is refused in silence. The lists are R132 Female3DCG's.
const HYP = 246108;
const ALLOW = {
	Eyes: ["Closed", "Dazed", "Shy", "Sad", "Horny", "Lewd", "VeryLewd", "Heart", "HeartPink", "LewdHeart", "LewdHeartPink", "Dizzy", "Daydream", "ShylyHappy", "Angry", "Surprised", "Scared"],
	Mouth: ["Frown", "Sad", "Pained", "Angry", "HalfOpen", "Open", "Ahegao", "Moan", "TonguePinch", "LipBite", "Happy", "Devious", "Laughing", "Grin", "Smirk", "Pout"],
	Blush: ["Low", "Medium", "High", "VeryHigh", "Extreme", "ShortBreath"],
};
ALLOW.Eyes2 = ALLOW.Eyes;
const part = (group) => ({ Asset: { Name: group, ColorableLayerCount: 1, Group: { Name: group, AllowExpression: ALLOW[group] } }, Color: "Default", Property: { Expression: null } });
const emoticonAsset = { Name: "Emoticon", Group: { Name: "Emoticon" }, Effect: [], AllowEffect: [] };
globalThis.Asset = [emoticonAsset];
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [part("Eyes"), part("Eyes2"), part("Mouth"), part("Blush"), { Asset: emoticonAsset, Property: {} }],
	Effect: [], ActivePose: ["BaseUpper", "BaseLower"],
	IsPlayer() { return true; },
	HasEffect(e) { return this.Effect.includes(e); },
	CanWalk() { return !this.HasEffect("Freeze"); },
};
globalThis.InventoryGet = (C, group) => C.Appearance.find((i) => i.Asset.Group.Name === group) ?? null;
let faceSets = 0;
globalThis.CharacterSetFacialExpression = (C, group, expr) => {
	if (group === "Eyes") CharacterSetFacialExpression(C, "Eyes2", expr);
	const item = InventoryGet(C, group === "Eyes1" ? "Eyes" : group);
	if (!item || !item.Asset.Group.AllowExpression) return;
	if (expr != null && !item.Asset.Group.AllowExpression.includes(expr)) return;
	if (item.Property.Expression == expr) return;
	item.Property.Expression = expr;
	faceSets++;
};
globalThis.CharacterGetEffects = () => [];
globalThis.CharacterLoadEffect = (C) => { C.Effect = []; };
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
let room = [];
globalThis.ChatRoomSendEmote = (m) => room.push(String(m));
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

const { voice, storage, session, timers, carry, recovery } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

for (const k of ["hypnoEnabled", "postureControl", "carryForward", "triggerControl"]) storage.setFeature(k, true);
storage.setFeature("tranceCannotMove", false);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drain(); };
const face = (g) => InventoryGet(Player, g).Property.Expression;
const faces = () => ({ eyes: face("Eyes"), eyes2: face("Eyes2"), mouth: face("Mouth"), blush: face("Blush") });
const bare = { eyes: null, eyes2: null, mouth: null, blush: null };
const reset = () => {
	session.safeword();
	timers.clearAllTimers();
	storage.forgetAllTriggers();
	for (const g of ["Eyes", "Eyes2", "Mouth", "Blush"]) InventoryGet(Player, g).Property.Expression = null;
	storage.setFaceSaved(undefined);
	storage.setTranceEyes("");
	toHyp = []; said = []; room = [];
};

// --- the wordings ---------------------------------------------------------------------------------
// Failure: a command missed or read as the wrong face, or ordinary talk moving her face.
for (const [line, id] of [
	["Missy, close your eyes", "eyes-closed"],
	["Missy, your eyes close", "eyes-closed"],
	["Missy, you cannot open your eyes", "eyes-closed"],
	["Missy, open your eyes", "eyes-open"],
	["Missy, eyes wide", "eyes-wide"],
	["Missy, your eyes glaze over", "eyes-dazed"],
	["Missy, hearts in your eyes", "eyes-hearts"],
	["Missy, open your mouth", "mouth-open"],
	["Missy, open wide", "mouth-open"],
	["Missy, part your lips", "mouth-parted"],
	["Missy, stick out your tongue", "tongue-out"],
	["Missy, tongue out", "tongue-out"],
	["Missy, let your tongue hang out", "tongue-hang"],
	["Missy, tongue all the way out", "tongue-hang"],
	["Missy, bite your lip", "lip-bite"],
	["Missy, smile for me", "smile"],
	["Missy, smile", "smile"],
	["Missy, grin", "grin"],
	["Missy, smirk", "smirk"],
	["Missy, pout", "pout"],
	["Missy, moan for me", "moan"],
	["Missy, close your mouth", "mouth-close"],
	["Missy, tongue back in", "mouth-close"],
	["Missy, blush", "blush"],
	["Missy, your cheeks burn", "blush"],
	["Missy, relax your face", "face-relax"],
	// Near misses: none of these is a face command.
	["Missy, you make me smile", null],
	["Missy, I love your smile", null],
	["Missy, don't close your eyes", null],
	["Missy, do not smile", null],
	["I smile at you, Missy", null],
	["Missy, you will not blush", null],
]) check(`"${line}"`, voice.matchSuggestion(line), id);

// --- each lands on BC's own expression ---------------------------------------------------------------
// Failure: the wrong expression, one eye only, or the room and the subject not told.
reset();
under();
say("Missy, close your eyes");
check("close your eyes: both eyes Closed", [face("Eyes"), face("Eyes2")], ["Closed", "Closed"]);
check("  she is told", said.some((s) => /eyes close/i.test(s)), true);
check("  the room sees it", room.some((s) => /eyes drift closed/i.test(s)), true);
say("Missy, stick out your tongue");
check("tongue out: TonguePinch", face("Mouth"), "TonguePinch");
say("Missy, let your tongue hang out");
check("tongue hanging: Ahegao", face("Mouth"), "Ahegao");
say("Missy, blush");
check("blush: High", face("Blush"), "High");
say("Missy, smile");
check("smile replaces the tongue: Happy", face("Mouth"), "Happy");

// --- the releases ------------------------------------------------------------------------------------
// Failure: a release that leaves the face, or one that takes off a part it does not name.
say("Missy, open your eyes");
check("open your eyes: eyes back, mouth and blush kept", faces(), { eyes: null, eyes2: null, mouth: "Happy", blush: "High" });
say("Missy, close your mouth");
check("close your mouth: back to her own mouth (not the tongue said before the smile)", face("Mouth"), null);
check("  blush still on", face("Blush"), "High");
say("Missy, pout");
say("Missy, relax your face");
check("relax your face: everything back", faces(), bare);
check("  nothing left saved", storage.getFaceSaved(), undefined);

// --- what she had before comes back, not a blank ----------------------------------------------------
// Failure: her own face lost, so the command left a mark after it ended.
reset();
InventoryGet(Player, "Mouth").Property.Expression = "Smirk";
under();
say("Missy, open your mouth");
say("Missy, relax your face");
check("her own smirk comes back", face("Mouth"), "Smirk");
// She changed it herself in between: that is hers, and is left alone.
under();
say("Missy, open your mouth");
InventoryGet(Player, "Mouth").Property.Expression = "Frown";
say("Missy, relax your face");
check("a face she made herself since is left alone", face("Mouth"), "Frown");

// --- a part BC refuses ---------------------------------------------------------------------------------
// Failure: announced as done (rule 5), or something saved that would later "put back" a face.
reset();
const realAllow = ALLOW.Mouth;
InventoryGet(Player, "Mouth").Asset.Group.AllowExpression = ["Open"];
under();
say("Missy, smile");
check("refused: no change", face("Mouth"), null);
check("  the hypnotist is told it did not land", toHyp.some((t) => /"smile" matched but did not land: face-blocked/.test(t)), true);
check("  nothing saved", storage.getFaceSaved(), undefined);
InventoryGet(Player, "Mouth").Asset.Group.AllowExpression = realAllow;

// --- out of trance, it does nothing ------------------------------------------------------------------
reset();
say("Missy, smile");
check("not under: no face", face("Mouth"), null);

// --- the permission ---------------------------------------------------------------------------------
reset();
storage.setFeature("postureControl", false);
under();
say("Missy, smile");
check("Posture Control off: no face", face("Mouth"), null);
storage.setFeature("postureControl", true);

// --- every way out puts it back ------------------------------------------------------------------------
// Failure: she wakes, or safewords, still pulling the face.
for (const [label, out] of [
	["waking", () => session.wakeByHypnotist(HYP)],
	["the safeword", () => session.safeword()],
	["Hypnosis Enabled unticked", () => session.hardFloorStop()],
]) {
	reset();
	under();
	say("Missy, close your eyes");
	say("Missy, open your mouth");
	say("Missy, blush");
	out();
	drain();
	check(`${label}: face back`, faces(), bare);
	check(`${label}: nothing left saved`, storage.getFaceSaved(), undefined);
}

// --- not carried ---------------------------------------------------------------------------------------
// DW: until relaxed or woken. Failure: "that will stay with you" keeps it past the wake.
reset();
under();
say("Missy, smile");
say("Missy, that will stay with you");
check("not carried", carry.isCarried("smile"), false);
session.wakeByHypnotist(HYP);
drain();
check("  and gone on waking", face("Mouth"), null);

// --- her trance eyes ------------------------------------------------------------------------------------
// DW: closing spiral eyes, then opening them, brings the spirals back; waking takes them off.
reset();
storage.setTranceEyes("Dizzy");
under();
check("spirals on going under", face("Eyes"), "Dizzy");
say("Missy, close your eyes");
check("closed over the spirals", face("Eyes"), "Closed");
say("Missy, open your eyes");
check("open: the spirals again", face("Eyes"), "Dizzy");
say("Missy, close your eyes");
session.wakeByHypnotist(HYP);
drain();
check("woken with eyes closed: her own eyes, not spirals or closed", [face("Eyes"), face("Eyes2")], [null, null]);
check("  neither save left", [storage.getFaceSaved(), storage.getEyesSaved()], [undefined, undefined]);

// --- triggers ---------------------------------------------------------------------------------------------
// DW: a face can be a trigger action. Failure: not planted, not fired, or its undo takes a newer face.
reset();
under();
say("Missy, your trigger word is sunny day");
say("Missy, smile");
say("Missy, remember trigger");
session.wakeByHypnotist(HYP);
drain();
check("trigger planted, face gone on the wake", face("Mouth"), null);
say("sunny day", HYP);
check("the trigger smiles her", face("Mouth"), "Happy");
const smileTrigger = storage.listTriggers().find((t) => t.phrase === "sunny day");
check("  its action is the smile", smileTrigger?.actions, ["smile"]);
// The trigger's undo touches only its own face.
const smileEntry = voice.matchSuggestion("Missy, smile");
check("  (sanity) smile is the id", smileEntry, "smile");
storage.setFaceSaved({ at: 1, groups: { Mouth: { was: null, set: "Pout" } } });
InventoryGet(Player, "Mouth").Property.Expression = "Pout";
session.safeword();
check("a newer face is still put back by the safeword", face("Mouth"), null);

// A trigger's undo is clearFace(part, its own expression): a pout said after its smile stays.
reset();
const { face: faceMod } = await import("./harness-bundle.mjs");
faceMod.setFace("Mouth", "Happy");
faceMod.setFace("Mouth", "Pout");
faceMod.clearFace("Mouth", "Happy");
check("a trigger's smile letting go leaves the pout said since", face("Mouth"), "Pout");
faceMod.clearFace("Mouth", "Pout");
check("  and the pout's own undo puts back what was there before both", face("Mouth"), null);

// --- a crash mid-trance ------------------------------------------------------------------------------------
// The expression is saved with her character. Failure: the next load leaves her with the face.
reset();
InventoryGet(Player, "Mouth").Property.Expression = "Ahegao";
storage.setFaceSaved({ at: Date.now(), groups: { Mouth: { was: "Smirk", set: "Ahegao" } } });
const outcome = recovery.attemptRecovery();
check(`a load with no trance to resume (${outcome}) puts it back`, face("Mouth"), "Smirk");
check("  and forgets it", storage.getFaceSaved(), undefined);

console.log(`face: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
