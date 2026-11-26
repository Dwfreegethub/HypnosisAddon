// Clothing compulsions (v1.18.0, DW 2026-11-26): "whenever anyone undresses you", "whenever you take
// your top off", "whenever anyone puts a bra on you", and "this trigger holds while you are undressed".
// BC R134 changes someone else's clothes only through the wardrobe, which syncs her whole appearance
// (ChatRoomSyncSingle with SourceMemberNumber); her own go out through ChatRoomCharacterUpdate.
//
// Failure looks like: a wording that plants the wrong act (or "pulls your top off" read as pulling
// hair); the wrong garment or direction setting it off; a swap read as undressing; her own change not
// counting for "anyone", or counting for a named person; a room join or a change outside a room
// setting it off; someone blocked setting it off; clothing and items mixing; or the hold not letting
// go when she is dressed again.
const HYP = 246108, REI = 999, OTHER_HYP = 424242;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, Appearance: [] };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: OTHER_HYP, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
let inRoom = true;
globalThis.ServerPlayerIsInChatRoom = () => inRoom;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let spoken = [];
globalThis.ChatRoomSendChatMessage = (msg) => { spoken.push(msg); return true; };
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};
// What she wears: group -> asset name. Player.Appearance and InventoryGet both read it.
let wearing = {};
const dressIn = (outfit) => {
	wearing = { ...outfit };
	Player.Appearance = Object.entries(wearing).map(([g, n]) => ({ Asset: { Name: n, Group: { Name: g } }, Property: {} }));
};
globalThis.InventoryGet = (C, g) => (C === Player && wearing[g] ? { Asset: { Name: wearing[g], Group: { Name: g } }, Property: {} } : null);

const { voice, storage, session, timers, compulsionActs, outfitWatch } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let arousalSet = [];
globalThis.ActivitySetArousal = (C, p) => { arousalSet.push(p); C.ArousalSettings.Progress = p; };
globalThis.CurrentTime = Date.now();
globalThis.ActivityExpression = () => {};
Player.ArousalSettings.AffectExpression = false;
const MIN = 60_000;
let clock = Date.now();
Date.now = () => clock;

for (const k of ["hypnoEnabled", "triggerControl", "movementRestriction", "forcedSpeech", "arousalControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);

// --- wordings --------------------------------------------------------------------------------------
const c = (line) => {
	const p = voice.parseCondition(line);
	return p ? `${p.act}/${p.who}` : null;
};
check("undresses you", [c("Missy, whenever anyone undresses you, moan"), c("Missy, when Rei strips you naked, moan"), c("Missy, when I take your clothes off, moan")], ["undress/anyone", "undress/rei", "undress/i"]);
check("undress with no doer: anyone", [c("Missy, whenever you get undressed, moan"), c("Missy, whenever you undress, moan"), c("Missy, whenever your clothes come off, moan")], ["undress/anyone", "undress/anyone", "undress/anyone"]);
check("one garment off", [c("Missy, whenever anyone takes your top off, moan"), c("Missy, when Rei takes off your bra, moan"), c("Missy, whenever anyone removes your panties, moan"), c("Missy, when anyone pulls your skirt off, moan"), c("Missy, whenever anyone takes your shoes off, moan"), c("Missy, whenever anyone peels your stockings off, moan")], ["off-top/anyone", "off-bra/rei", "off-panties/anyone", "off-skirt/anyone", "off-shoes/anyone", "off-socks/anyone"]);
check("one garment off, no doer", [c("Missy, whenever you take your top off, moan"), c("Missy, whenever your bra comes off, moan"), c("Missy, whenever you remove your panties, moan")], ["off-top/anyone", "off-bra/anyone", "off-panties/anyone"]);
check("dressing", [c("Missy, whenever anyone dresses you, moan"), c("Missy, whenever you get dressed, moan"), c("Missy, when Rei puts a bra on you, moan"), c("Missy, whenever anyone puts panties on you, moan"), c("Missy, when I dress you in a skirt, moan"), c("Missy, whenever you put your shoes on, moan"), c("Missy, whenever your bra goes back on, moan")], ["dress/anyone", "dress/anyone", "on-bra/rei", "on-panties/anyone", "on-skirt/i", "on-shoes/anyone", "on-bra/anyone"]);
// Failure: "pulls your top off" read as the hair pull, or the old ones changed.
check("the old ones are unchanged", [c("Missy, when anyone pulls your hair, kneel"), c("Missy, when anyone ties you up, kneel"), c("Missy, when anyone puts something on you, kneel"), c("Missy, when anyone locks you in chastity, kneel"), c("Missy, when anyone kisses you, kneel")], ["pull/anyone", "bind/anyone", "bind/anyone", "chastity/anyone", "kiss/anyone"]);
check("not a condition after a suggestion", c("you are very aroused whenever you undress"), null);

// --- matching ------------------------------------------------------------------------------------------
const m = compulsionActs.actMatches;
const off = (slot, group = slot) => compulsionActs.clothEvent("off", slot, group);
const on = (slot, group = slot) => compulsionActs.clothEvent("on", slot, group);
check("undress: any garment off, never on", [m("undress", off("Shoes")), m("undress", off("Cloth")), m("undress", on("Cloth"))], [true, true, false]);
check("dress: any garment on, never off", [m("dress", on("Bra")), m("dress", off("Bra"))], [true, false]);
check("top: the top or a jacket, not the bra", [m("off-top", off("Cloth")), m("off-top", off("ClothOuter")), m("off-top", off("Bra"))], [true, true, false]);
check("an Echo copy counts as its slot", m("off-top", off("Cloth", "Cloth_笨笨蛋Luzi")), true);
check("socks: either sock", [m("off-socks", off("SocksLeft")), m("on-socks", on("Socks"))], [true, true]);
check("clothing and items never mix", [m("bind", off("Cloth")), m("any", off("Cloth")), m("undress", "item:ItemArms"), m("gag", on("ItemMouth")), m("kiss", off("Cloth"))], [false, false, false, false, false]);
check("the slot of a clothing event", [compulsionActs.eventSlot(off("Cloth", "Cloth_笨笨蛋Luzi")), compulsionActs.eventSlot("item:@chaste|ItemPelvis"), compulsionActs.eventSlot("item:ItemMouth")], ["Cloth_笨笨蛋Luzi", "ItemPelvis", "ItemMouth"]);

// --- reading the outfit --------------------------------------------------------------------------------
const o = outfitWatch.outfitOf;
const ch = (a, b) => outfitWatch.outfitChanges(a, b);
check("only garments are read (not hair, not items)", o([{ Asset: { Name: "Shirt", Group: { Name: "Cloth" } } }, { Asset: { Name: "Hair1", Group: { Name: "HairFront" } } }, { Asset: { Name: "Rope", Group: { Name: "ItemArms" } } }]), { Cloth: "Shirt" });
check("off, then on", ch({ Cloth: "Shirt", Bra: "Bra1" }, { Bra: "Bra1", Panties: "P1" }), [off("Cloth"), on("Panties")]);
check("a swap is something on, not off", ch({ Cloth: "Shirt" }, { Cloth: "Dress" }), [on("Cloth")]);
check("nothing changed", ch({ Cloth: "Shirt" }, { Cloth: "Shirt" }), []);

// --- end to end through BC's hooks -------------------------------------------------------------------
const hooks = {};
outfitWatch.installOutfitWatch({ hookFunction: (name, _p, fn) => { (hooks[name] ??= []).push(fn); } });
const call = (name, args, body) => hooks[name][0](args, () => body?.());
// Someone else's wardrobe change: BC applies it inside ChatRoomSyncSingle.
const changedBy = (who, outfit) => { call("ChatRoomSyncSingle", [{ Character: { MemberNumber: Player.MemberNumber }, SourceMemberNumber: who }], () => dressIn(outfit)); drainPaced(); };
// Her own: already applied, then sent.
const changedSelf = (outfit) => { dressIn(outfit); call("ChatRoomCharacterUpdate", [Player]); drainPaced(); };
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line, who = HYP) => { voice.handleSpokenLine(who, line); drainPaced(); };
const only = () => storage.listTriggers().find((t) => t.fireOn);
const DRESSED = { Cloth: "Shirt", ClothLower: "Skirt", Bra: "Bra1", Panties: "P1", Shoes: "Heels" };
const reset = () => { session.safeword(); timers.clearAllTimers(); storage.forgetAllTriggers(); toHyp = []; said = []; spoken = []; arousalSet = []; clock += MIN; inRoom = true; changedSelf(DRESSED); spoken = []; };
const plant = (lines) => { under(); for (const l of lines) say(l); say("Missy, remember trigger"); session.wakeByHypnotist(HYP); drainPaced(); };

reset();
plant(["Missy, whenever anyone takes your top off, you will say 'Oh!'"]);
check("stored", [only()?.act, only()?.watchName], ["off-top", "*"]);
check("  the hypnotist told when it fires", /when anyone takes (?:your|their) top off/.test(toHyp.join(" ")), true);
const { Shoes: _s, ...noShoes } = DRESSED;
changedBy(REI, noShoes);
check("shoes off: nothing", spoken, []);
changedBy(REI, { ClothLower: "Skirt", Bra: "Bra1", Panties: "P1" });
check("Rei takes her top off in the wardrobe: it fires", spoken, ["Oh!"]);
clock += MIN;
changedSelf({ ...DRESSED });
spoken = [];
clock += MIN;
changedSelf({ ClothLower: "Skirt", Bra: "Bra1", Panties: "P1", Shoes: "Heels" });
check("she takes it off herself: anyone includes her", spoken, ["Oh!"]);
// A blocked person sets nothing off (v1.17.0).
clock += MIN;
changedSelf({ ...DRESSED });
spoken = [];
clock += MIN;
storage.setAccessLevel(OTHER_HYP, "Vex", "blocked");
changedBy(OTHER_HYP, { ClothLower: "Skirt" });
check("someone blocked: nothing", spoken, []);
storage.setAccessLevel(OTHER_HYP, "Vex", "normal");
// Outside a room, and a room join: taken as they are.
clock += MIN;
inRoom = false;
changedSelf({ ...DRESSED });
changedSelf({ Bra: "Bra1" });
check("outside a room: nothing", spoken, []);
inRoom = true;
dressIn({ ...DRESSED });
call("ChatRoomSync", [{}], () => undefined);
await Promise.resolve();
await Promise.resolve();
changedSelf({ ...DRESSED });
check("a room join, then nothing changed: nothing", spoken, []);

// Named: only that person, never her.
reset();
plant(["Missy, whenever Rei undresses you, you will say 'Rei!'"]);
changedSelf({ Bra: "Bra1", Panties: "P1" });
check("named Rei: her own undressing doesn't count", spoken, []);
changedSelf({ ...DRESSED });
changedBy(HYP, { Panties: "P1" });
check("  nor someone else", spoken, []);
changedSelf({ ...DRESSED });
changedBy(REI, { Panties: "P1" });
check("  Rei does: it fires", spoken, ["Rei!"]);

// Dressing.
reset();
plant(["Missy, whenever anyone puts a bra on you, you will say 'Snug'"]);
changedSelf({ Cloth: "Shirt" });
spoken = [];
clock += MIN;
changedBy(REI, { Cloth: "Shirt", Panties: "P1" });
check("panties on: nothing", spoken, []);
changedBy(REI, { Cloth: "Shirt", Panties: "P1", Bra: "Lace" });
check("a bra on: it fires", spoken, ["Snug"]);

// Items still need the item menu: a restraint in a sync is not clothing.
reset();
plant(["Missy, whenever anyone undresses you, you will say 'Bare'"]);
changedBy(REI, { ...DRESSED, ItemArms: "Rope" });
check("a rope in the same sync: nothing", spoken, []);

// --- held while undressed --------------------------------------------------------------------------------
check("parse: holds while you are undressed", voice.parseTriggerControl("Missy, this trigger holds while you are undressed")?.option?.kind, "whileWorn");
check("parse: until you are dressed again", voice.parseTriggerControl("Missy, it lasts until you are dressed again")?.option?.kind, "whileWorn");
check("parse: while it stays off", voice.parseTriggerControl("Missy, this trigger holds while it stays off")?.option?.kind, "whileWorn");
reset();
plant(["Missy, whenever anyone takes your bra off, you are very aroused", "Missy, this trigger holds while you are undressed"]);
check("stored with the hold", [only()?.act, only()?.whileWorn], ["off-bra", true]);
check("  the hypnotist was told", /until that garment goes back on/.test(toHyp.join(" ")), true);
const { Bra: _b, ...noBra } = DRESSED;
changedBy(REI, noBra);
check("bra off: aroused, held, watching the empty slot", [arousalSet.length, voice.isTriggerInEffect(only()), only()?.wornHold], [1, true, { group: "Bra", asset: "", off: true }]);
check("  still off: still held", voice.checkWornHolds(clock + 3 * MIN), 0);
check("  and the arousal came again", arousalSet.length, 2);
changedBy(REI, { ...DRESSED, Bra: "Sports" });
said = [];
check("a bra back on: lets go", voice.checkWornHolds(clock + 4 * MIN), 1);
check("  and she is told", said.some((l) => /dressed again/.test(l)), true);

// Put on: "while you wear it" holds until it comes off.
reset();
plant(["Missy, whenever anyone puts panties on you, you are very aroused", "Missy, this trigger holds while you wear it"]);
const { Panties: _p, ...noPanties } = DRESSED;
changedSelf(noPanties);
arousalSet = [];
clock += MIN;
changedBy(REI, { ...noPanties, Panties: "Lace" });
check("panties on: held, watching them", [arousalSet.length, only()?.wornHold], [1, { group: "Panties", asset: "Lace" }]);
changedBy(REI, noPanties);
check("  off again: lets go", voice.checkWornHolds(clock + MIN), 1);

// On a phrase trigger it is still ignored, and the message names clothing too.
reset();
under();
say("Missy, your trigger word is sleepy");
say("Missy, you are very aroused");
say("Missy, this trigger holds while you are undressed");
check("on a word trigger: ignored, and says why", /item, clothing or pose compulsion/.test(toHyp.join(" ")), true);

console.log(`clothing-compulsion: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
