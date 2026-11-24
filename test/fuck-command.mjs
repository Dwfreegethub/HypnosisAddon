// "Missy, fuck me" (v1.16.17, DW 2026-11-23, from a player's strap-on suggestion). Slow by default,
// fast for "hard", the pussy by default, refused when she wears no strap-on. Setup as touch-others.mjs.
const HYP = 246108;
const REI = 300, ELLA = 400;

let ALLOWED = {};
let strapOn = false;  // memberNumber -> { groupName: [activityName] }
const runCalls = [];
globalThis.ActivityAllowedForGroup = (char, groupName) =>
	((ALLOWED[char?.MemberNumber] || {})[groupName] || [])
		// BC's Needs-PenetrateItem: no strap-on, no penetration offered.
		.filter((name) => !name.startsWith("Penetrate") || strapOn)
		.map((name) => ({ Activity: { Name: name }, Group: groupName }));
globalThis.AssetGroupGet = (_family, groupName) => ({ Name: groupName });
globalThis.ActivityRun = (actor, acted, groupObj, itemActivity) =>
	runCalls.push({ actor: actor?.MemberNumber, acted: acted?.MemberNumber, activity: itemActivity?.Activity?.Name, group: groupObj?.Name });

const emoticon = { Asset: { Name: "Emoticon", AllowEffect: ["Freeze", "DenialMode", "BlockWardrobe"] }, Property: { Effect: [] } };
let realItemEffects = [];
globalThis.CurrentTime = 1_000_000;
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", AssetFamily: "Female3DCG", ExtensionSettings: {},
	Appearance: [emoticon], Effect: [],
	ArousalSettings: { Active: "Hybrid", Progress: 0, OrgasmTimer: 0 },
	IsPlayer: () => true,
	HasEffect(e) { return this.Effect.includes(e); },
};
const hyp = { MemberNumber: HYP, Name: "GameBot", ArousalSettings: { Active: "Hybrid" } };
const rei = { MemberNumber: REI, Name: "Rei", ArousalSettings: { Active: "Hybrid" } };
const ella = { MemberNumber: ELLA, Name: "Ellanora", Nickname: "Ella", ArousalSettings: { Active: "Hybrid" } };
const sam1 = { MemberNumber: 500, Name: "Sam" };
const sam2 = { MemberNumber: 501, Name: "Samantha", Nickname: "Sam" };
globalThis.Asset = [emoticon.Asset];
globalThis.ChatRoomCharacterUpdate = () => {};
globalThis.CharacterLoadEffect = (C) => (C.Effect = [...emoticon.Property.Effect, ...realItemEffects]);
globalThis.ActivityOrgasmPrepare = () => {};
globalThis.ActivityOrgasmStart = () => {};
globalThis.ActivitySetArousal = () => {};
globalThis.ChatRoomCharacter = [Player, hyp, rei, ella, sam1, sam2];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const toHyp = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m?.type === "trigger-status") toHyp.push(m.text); };

const { voice, storage, session, effects } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const say = (line) => voice.handleSpokenLine(HYP, line);
const lastRun = () => runCalls[runCalls.length - 1];
const lastReport = () => toHyp.filter((t) => t.startsWith("[command]")).at(-1) ?? "";
const reset = () => { runCalls.length = 0; toHyp.length = 0; };

globalThis.CharacterItemsForActivity = (C, activity) => (C === Player && activity === "PenetrateItem" && strapOn ? [{ Asset: { Name: "StrapOn" } }] : []);

// --- the grammar, pure ------------------------------------------------------------------------
const R = ["Rei", "GameBot"];
const m = (line, roster = R) => voice.matchTargetedActivityCommand(line, roster);
const P = (activity, target, word) => ({ activity, target, word });
check("fuck me: slow, her pussy", m("Missy, fuck me"), P("PenetrateSlow", "me", "pussy"));
check("fuck me hard: fast", m("Missy, fuck me hard"), P("PenetrateFast", "me", "pussy"));
check("with your strap-on, either side of hard", [m("Missy, fuck me with your strap-on"), m("Missy, fuck me hard with your strap-on"), m("Missy, fuck me with your strap-on, hard")],
	[P("PenetrateSlow", "me", "pussy"), P("PenetrateFast", "me", "pussy"), P("PenetrateFast", "me", "pussy")]);
check("roughly / fast before the verb", [m("Missy, roughly fuck me")?.activity, m("Missy, fuck me fast")?.activity], ["PenetrateFast", "PenetrateFast"]);
check("my ass, my mouth", [m("Missy, fuck my ass"), m("Missy, fuck my mouth")], [P("PenetrateSlow", "me", "ass"), P("PenetrateSlow", "me", "mouth")]);
check("in the ass", m("Missy, fuck me in the ass"), P("PenetrateSlow", "me", "ass"));
check("someone else, by name", [m("Missy, fuck Rei"), m("Missy, fuck Rei's ass hard")], [P("PenetrateSlow", "rei", "pussy"), P("PenetrateFast", "rei", "ass")]);
check("penetrate / screw / pound", [m("Missy, penetrate me")?.activity, m("Missy, screw Rei")?.activity, m("Missy, pound me")?.activity], ["PenetrateSlow", "PenetrateSlow", "PenetrateSlow"]);
// Failure: a part with no strap-on place claimed and refused, or patter read as an order.
check("not a part a strap-on goes: left alone", m("Missy, fuck my nipples"), null);
check("'fuck me a sandwich' is not an order", m("Missy, fuck me a sandwich"), null);
check("not a self command", m("Missy, fuck yourself"), null);
check("negated: nothing", m("Missy, don't fuck me"), null);

// "Suck my strap-on" (v1.16.18). Failure: "suck my cock" changed from BC's plain Suck, or no part read.
check("suck my strap-on", m("Missy, suck my strap-on"), P("SuckPenetrateItem", "me", "strap"));
check("suck on Rei's strap-on, suck my dildo", [m("Missy, suck on Rei's strap-on"), m("Missy, suck my dildo")], [P("SuckPenetrateItem", "rei", "strap"), P("SuckPenetrateItem", "me", "dildo")]);
check("suck my cock is still plain Suck", m("Missy, suck my cock")?.activity, "Suck");

// --- the handler ----------------------------------------------------------------------------------
storage.setFeature("hypnoEnabled", true);
storage.setFeature("compelActivity", true);
session.forceTrance(HYP, 80, 80);
ALLOWED[HYP] = { ItemVulva: ["PenetrateSlow", "PenetrateFast"], ItemButt: ["PenetrateSlow", "PenetrateFast"] };

reset();
say("Missy, fuck me");
check("no strap-on: refused, and says why", [runCalls.length, /aren't wearing a strap-on/.test(lastReport())], [0, true]);

strapOn = true;
reset();
say("Missy, fuck me");
check("with one: slow, on the hypnotist's vulva, by her", lastRun(), { actor: 1, acted: HYP, activity: "PenetrateSlow", group: "ItemVulva" });
reset();
say("Missy, fuck my ass hard");
check("fuck my ass hard: fast, on the butt", lastRun(), { actor: 1, acted: HYP, activity: "PenetrateFast", group: "ItemButt" });

// BC says no (clothes on, a belt): the hypnotist hears what to check on their own body.
ALLOWED[HYP] = {};
reset();
say("Missy, fuck me");
check("BC refuses: nothing run, and what to check", [runCalls.length, /has to be bare and empty/.test(lastReport())], [0, true]);

// Suck: BC offers it only while the target wears the strap-on (TargetNeeds-PenetrateItem).
ALLOWED[HYP] = { ItemVulva: ["SuckPenetrateItem"] };
reset();
say("Missy, suck my strap-on");
check("suck my strap-on: on the hypnotist's vulva, by her", lastRun(), { actor: 1, acted: HYP, activity: "SuckPenetrateItem", group: "ItemVulva" });
ALLOWED[HYP] = {};
reset();
say("Missy, suck my strap-on");
check("BC refuses: what to check", [runCalls.length, /you need a strap-on on/.test(lastReport())], [0, true]);

// Someone else still needs "Made to touch others".
reset();
say("Missy, fuck Rei");
check("someone else without Made to touch others: refused", [runCalls.length, /Made to touch others/.test(lastReport())], [0, true]);

console.log(`fuck-command: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
