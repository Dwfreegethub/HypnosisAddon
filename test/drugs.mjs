// Crafted drinks and cigarettes, v0.101.0 (DW, 2026-10-28).
//
// A craft tagged [hypno:relax] or [hypno:stimulate] moves a drug level that ADDS to arousal in the
// induction's chemical half (DW reversed the old max() rule the same day). Drinks: 15 a sip, to
// ±40. A cigarette in her mouth: 3 a minute, to ±20, and never pulls a drink's level back down.
// Decays 1 a minute once nothing feeds it. Off unless her chemical scope lets drugs count, and
// then it SAYS so (rule 5). The safeword clears it (rule 2). Every block states what failure
// looks like.
const HYP = 246108;

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
const helper = { MemberNumber: HYP, Name: "Missys Helper" };
globalThis.ChatRoomCharacter = [Player, helper];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.CharacterSetActivePose = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let clock = 1_000_000;
Date.now = () => clock;
const MIN = 60_000;

// What each character is wearing, by group. InventoryGet is all drugs.ts reads.
const worn = new Map();
const wear = (C, group, item) => worn.set(`${C.MemberNumber}:${group}`, item);
const strip = (C, group) => worn.delete(`${C.MemberNumber}:${group}`);
globalThis.InventoryGet = (C, group) => worn.get(`${C.MemberNumber}:${group}`) ?? null;
const cup = (name, description = "") => ({ Asset: { Name: "GlassFilled" }, Craft: { Name: name, Description: description } });
const cigarette = (name, typed) => ({ Asset: { Name: "Cigarette" }, Craft: { Name: name, Description: "" }, Property: typed === undefined ? {} : { TypeRecord: { typed } } });

const { drugs, storage, session } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const level = () => Math.round(drugs.drugLevel() * 10) / 10;
const reset = () => { drugs.clearDrugs(); said = []; worn.clear(); Player.ArousalSettings.Progress = 0; };

storage.setFeature("hypnoEnabled", true);

// --- reading the tag -------------------------------------------------------------------------
// Failure looks like: a tag in the description missed, a differently-cased tag missed, or an
// unbuilt drug (sedate) treated as one we know.
check("tag in the name", drugs.drugKindOf({ Name: "Calm Tea [hypno:relax]" }), "relax");
check("tag in the description", drugs.drugKindOf({ Name: "Tea", Description: "Soothing. [hypno:relax]" }), "relax");
check("any case, spaces inside", drugs.drugKindOf({ Name: "Brew [ HYPNO : Stimulate ]" }), "stimulate");
check("an unbuilt drug is inert", drugs.drugKindOf({ Name: "[hypno:sedate]" }), null);
check("an unknown tag before a known one is skipped", drugs.drugKindOf({ Name: "[hypno:sedate] [hypno:relax]" }), "relax");
check("an LSCG keyword is not ours", drugs.drugKindOf({ Name: "Hypnotizing mind control drink" }), null);
check("no craft at all", drugs.drugKindOf(undefined), null);

// --- default scope: drugs do not count, and the drink says so ---------------------------------
// Failure looks like: a drink silently doing nothing (rule 5), or quietly working with the
// player never having opted in.
reset();
check("default scope is Arousal only", storage.getChemicalScope(), "arousal");
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper);
check("  the level does not move", level(), 0);
check("  she is told why, naming the setting", said.some((m) => /does nothing/.test(m) && /Arousal only/.test(m) && /Depth tab/.test(m)), true);

storage.setChemicalScope("both");

// --- drinks ----------------------------------------------------------------------------------
// Failure looks like: a dose other than 15, the level passing 40, or an untagged drink talking.
reset();
wear(helper, "ItemHandheld", cup("Plain Water"));
drugs.handleSip(helper);
check("an untagged drink: no change", level(), 0);
check("  and nothing said", said.length, 0);
wear(helper, "ItemHandheld", cup("Calm Tea", "[hypno:relax]"));
drugs.handleSip(helper);
check("one relax sip: +15", level(), 15);
check("  she feels it", said.some((m) => /looseness/.test(m)), true);
drugs.handleSip(helper);
drugs.handleSip(helper);
check("three sips cap at 40", level(), 40);
said = [];
drugs.handleSip(helper);
check("a fourth sip stays at 40", level(), 40);
check("  and says it can't go further", said.some((m) => /any further/.test(m)), true);

// Her own drink: she is the actor holding the cup.
reset();
wear(Player, "ItemHandheld", cup("Espresso [hypno:stimulate]"));
drugs.handleSip(Player);
check("her own stimulate sip: -15", level(), -15);
drugs.handleSip(Player); drugs.handleSip(Player); drugs.handleSip(Player);
check("stimulate caps at -40", level(), -40);

// Opposite drugs cancel.
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper);
check("relax after stimulate moves it back toward 0", level(), -25);

// --- decay ------------------------------------------------------------------------------------
// Failure looks like: no decay, decay past 0, or decay at the wrong rate.
reset();
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper);
clock += 5 * MIN;
check("5 minutes later: 15 → 10", level(), 10);
clock += 30 * MIN;
check("it stops at 0, never goes negative", level(), 0);

// --- cigarettes ---------------------------------------------------------------------------------
// Failure looks like: a cigarette in hand counting, one reaching past 20, one pulling a drink's
// 40 back down, or decay running while it is still in her mouth.
reset();
wear(Player, "ItemHandheld", cigarette("Clove [hypno:relax]", 1)); // typed 1: In Hand
drugs.smokeTick();
check("a cigarette held in the hand does nothing", level(), 0);
wear(Player, "ItemHandheld", cigarette("Clove [hypno:relax]")); // fresh: option 0, In Mouth
drugs.smokeTick();
check("in her mouth (handheld, default option): +3", level(), 3);
check("  she feels it once", said.filter((m) => /looseness/.test(m)).length, 1);
for (let i = 0; i < 10; i++) { clock += MIN; drugs.smokeTick(); }
check("ten more minutes: capped at 20", level(), 20);
check("  still only one feel line", said.filter((m) => /looseness/.test(m)).length, 1);
clock += 10 * MIN;
check("no decay while it is still in her mouth", level(), 20);
strip(Player, "ItemHandheld");
drugs.smokeTick();
clock += 4 * MIN;
check("taken out: decays from 20", level(), 16);

reset();
wear(Player, "ItemMouth", cigarette("Menthol [hypno:stimulate]"));
drugs.smokeTick();
check("an ItemMouth cigarette counts too, stimulate: -3", level(), -3);

reset();
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper); drugs.handleSip(helper); drugs.handleSip(helper);
wear(Player, "ItemMouth", cigarette("Clove [hypno:relax]"));
drugs.smokeTick();
check("a cigarette never pulls a drink's 40 down to 20", level(), 40);

// --- adding onto arousal (DW, 2026-10-28) ---------------------------------------------------------
// Failure looks like: max() instead of a sum, or a stimulant unable to go below zero.
reset();
Player.ArousalSettings.Progress = 60;
check("arousal alone", session.chemicalLevel(), 60);
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper); drugs.handleSip(helper);
check("arousal 60 + relax 30 = 90, they add", session.chemicalLevel(), 90);
const withDrug = session.effectiveAccess(HYP);
drugs.clearDrugs();
check("  and the drink lifts access by a quarter of itself (+7.5)", Math.round((withDrug - session.effectiveAccess(HYP)) * 10) / 10, 7.5);
Player.ArousalSettings.Progress = 0;
wear(Player, "ItemHandheld", cup("Espresso [hypno:stimulate]"));
drugs.handleSip(Player); drugs.handleSip(Player);
check("no arousal, stimulate 30: chemical -30", session.chemicalLevel(), -30);

// Scope decides: "Arousal only" ignores a level already in her.
storage.setChemicalScope("arousal");
check("scope back to Arousal only: the drug stops counting", session.chemicalLevel(), 0);
check("  /echs drugs says why", /not counting/.test(drugs.describeDrugs()), true);
storage.setChemicalScope("drugs");
Player.ArousalSettings.Progress = 50;
check("Drugs only: arousal ignored, the drug counts", session.chemicalLevel(), -30);
storage.setChemicalScope("both");

// --- the hard floor and the safeword ---------------------------------------------------------------
// Failure looks like: a drink working with hypnosis unticked, or any level surviving the safeword.
reset();
storage.setFeature("hypnoEnabled", false);
wear(helper, "ItemHandheld", cup("Calm Tea [hypno:relax]"));
drugs.handleSip(helper);
check("hypnosis unticked: a drink does nothing", level(), 0);
check("  and says nothing (the add-on is off)", said.length, 0);
storage.setFeature("hypnoEnabled", true);
drugs.handleSip(helper); drugs.handleSip(helper);
check("re-ticked: the drink works again", level(), 30);
session.safeword();
check("the safeword clears it", level(), 0);

// A cigarette still in her mouth must not start again the minute after a safeword.
reset();
wear(Player, "ItemMouth", cigarette("Clove [hypno:relax]"));
drugs.smokeTick(); clock += MIN; drugs.smokeTick();
check("smoking: 6", level(), 6);
session.safeword();
clock += MIN; drugs.smokeTick();
check("safeword, cigarette still in: stays 0", level(), 0);
strip(Player, "ItemMouth");
clock += MIN; drugs.smokeTick();
wear(Player, "ItemMouth", cigarette("Clove [hypno:relax]"));
clock += MIN; drugs.smokeTick();
check("taken out and put back: counts again", level(), 3);

// The hard floor is the same stop.
session.hardFloorStop();
check("unticking hypnosis clears it too", level(), 0);

console.log(`drugs: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
