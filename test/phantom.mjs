// Phantom touch (v1.19.0, DW 2026-11-26): "Missy, you feel a hand on your thigh". She alone sees
// the touch, it does what a real touch does (BC's ActivityEffect, the call BC makes for a real touch
// on her), and the room sees a reaction only now and then, never where.
//
// Failure looks like: a phantom line read as an order to touch herself; the numbness release, "you
// feel warm" or "you feel your hands go heavy" read as a touch; the wrong activity or zone (her
// preferences would then be asked about the wrong thing); arousal applied while she is numb or
// without the permission; the room told every time, or told where; or a trigger dropping it.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, Appearance: [], AssetFamily: "Female3DCG" };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.text) toHyp.push(m.text);
};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
let emotes = [];
globalThis.ChatRoomSendEmote = (m) => emotes.push(String(m));
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
globalThis.ChatRoomSendChatMessage = () => true;
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
// BC: what a real touch on her does. Recorded, and the ones that must NOT happen are watched too.
let effects = [];
globalThis.ActivityEffect = (S, C, A, Z, n) => effects.push([S === Player ? "her" : S, C === Player ? "her" : C, A, Z, n]);
let ran = [];
globalThis.ActivityRun = (...a) => ran.push(a);
globalThis.ActivityAllowedForGroup = () => [{ Activity: { Name: "Caress" } }];
globalThis.AssetGroupGet = (f, g) => ({ Name: g });

const { voice, storage, session, timers, phantom } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
let clock = Date.now();
Date.now = () => clock;

// --- wordings ------------------------------------------------------------------------------------
const p = (line) => {
	const t = phantom.matchPhantomTouch(line);
	return t ? `${t.activity}:${t.part}` : null;
};
check("a hand on your thigh", p("Missy, you feel a hand on your thigh"), "Caress:thigh");
check("lips on your neck", p("Missy, you feel soft lips on your neck"), "Kiss:neck");
check("hands all over you", p("Missy, you feel hands all over you"), "Caress:all");
check("a verb changes what the hand does", [p("Missy, you feel a hand squeeze your breasts"), p("Missy, you feel fingers pinch your nipples"), p("Missy, you feel a hand spank your butt"), p("Missy, you feel someone tickle your ribs"), p("Missy, you feel a hand tug your hair")], ["Grope:breasts", "Pinch:nipples", "Spank:butt", "Tickle:ribs", "Pull:hair"]);
check("a tongue, teeth, a smack", [p("Missy, you feel a tongue on your ear"), p("Missy, you feel teeth on your shoulder"), p("Missy, you feel a smack on your ass")], ["Lick:ear", "Bite:shoulder", "Spank:ass"]);
check("lips stay a kiss even when they brush", p("Missy, you feel lips brush your neck"), "Kiss:neck");
check("no part named: the activity's own spot", p("Missy, you suddenly feel fingers stroking you"), "Caress:");
check("an extra word: your back", p("Missy, you feel nails down your back"), "Scratch:back");
// v1.19.5: "between your legs" is the crotch; a later "and you cannot speak" is its own clause.
check("between your legs: the crotch", [p("Missy, you feel a hand between your legs"), p("Missy, you feel fingers stroke between your thighs")], ["Caress:crotch", "Caress:crotch"]);
check("a later clause does not undo it", [p("Missy, you feel a hand between your legs and you cannot speak"), p("Missy, you feel lips on your neck and you cannot move")], ["Caress:crotch", "Kiss:neck"]);
check("  but its own negation still does", p("Missy, you feel no hand between your legs"), null);
check("not touches", [p("Missy, you feel warm"), p("Missy, you feel your hands go heavy"), p("Missy, you feel nothing"), p("Missy, you can feel my touch again"), p("Missy, you can feel my hands"), p("Missy, you feel someone watching you"), p("Missy, you do not feel a hand on your thigh"), p("Missy, you feel no hands on you"), p("Missy, touch your thigh")], [null, null, null, null, null, null, null, null, null]);
check("the old wordings still go where they did", [voice.matchSuggestion("Missy, you can feel my touch again"), voice.matchSuggestion("Missy, you feel a little warm"), voice.matchSuggestion("Missy, you feel nothing when I touch you")], ["numb-release", "arousal-light", "numb-block"]);
check("ids round-trip", [phantom.phantomActionId({ activity: "Kiss", part: "neck" }), phantom.parsePhantomId("feel:Caress:all"), phantom.parsePhantomId("act:Caress:thighs")], ["feel:Kiss:neck", { activity: "Caress", part: "all" }, null]);
check("how a trigger lists it", [voice.describeAction("feel:Caress:thighs"), voice.describeAction("feel:Caress:all"), voice.describeAction("feel:Kiss:")], ["you feel a hand on your thighs", "you feel hands all over you", "you feel lips on your neck"]);

// --- feeling it --------------------------------------------------------------------------------------
for (const k of ["hypnoEnabled", "triggerControl", "arousalControl", "compelActivity"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0);
const under = () => session.forceTrance(HYP, 80, 80);
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
const fresh = () => { effects = []; ran = []; said = []; emotes = []; toHyp = []; };

under();
fresh();
say("Missy, you feel fingers stroke your thighs");
check("a real touch's effect, from her, on her thigh zone", effects, [["her", "her", "Caress", "ItemLegs", 1]]);
check("  she is told, privately", said.length === 1 && !/Missy/.test(said[0]), true);
check("  never as an order to stroke herself", ran, []);
fresh();
say("Missy, you feel hands all over you");
check("all over: three touches, each on a real zone", effects.length === 3 && effects.every((e) => e[2] === "Caress" && /^Item/.test(e[3])), true);
fresh();
say("Missy, you feel a hand squeeze your breasts");
check("a squeeze is BC's grope, on the breast zone", effects, [["her", "her", "Grope", "ItemBreast", 1]]);

// Numb: it lands on nothing.
say("Missy, you feel nothing when I touch you");
fresh();
say("Missy, you feel a hand on your thigh");
check("numb: no effect, the hypnotist told", [effects, toHyp.some((m) => /numb/.test(m))], [[], true]);
say("Missy, you can feel my touch again");
// Her arousal off in BC: she feels it, nothing more, and the hypnotist knows why.
Player.ArousalSettings.Active = "Inactive";
fresh();
say("Missy, you feel a hand on your thigh");
check("arousal off: felt, no effect, the hypnotist told", [effects, said.length, toHyp.some((m) => /arousal meter is off/.test(m))], [[], 1, true]);
Player.ArousalSettings.Active = "Hybrid";
// Without the permission: refused, and nothing felt.
storage.setFeature("arousalControl", false);
fresh();
say("Missy, you feel a hand on your thigh");
check("no Arousal & Orgasm: refused, nothing", [effects, said, toHyp.some((m) => /Arousal & Orgasm/.test(m))], [[], [], true]);
storage.setFeature("arousalControl", true);

// --- the room, now and then, never where -----------------------------------------------------------
phantom.resetPhantomRoom();
emotes = [];
const t = { activity: "Caress", part: "thighs" };
phantom.feelPhantom(t, () => 0, 1_000_000);
check("the room: a reaction, not the place", emotes.length === 1 && !/thigh/.test(emotes[0]) && /Missy/.test(emotes[0]), true);
phantom.feelPhantom(t, () => 0, 1_000_000 + 60_000);
check("  not again within 3 minutes", emotes.length, 1);
phantom.feelPhantom(t, () => 0.9, 1_000_000 + 4 * 60_000);
check("  and only sometimes (this roll: no)", emotes.length, 1);
phantom.feelPhantom(t, () => 0, 1_000_000 + 8 * 60_000);
check("  later, a lucky roll: yes", emotes.length, 2);

// --- in a trigger ------------------------------------------------------------------------------------
session.safeword();
timers.clearAllTimers();
storage.forgetAllTriggers();
under();
say("Missy, your trigger word is velvet");
say("Missy, you feel lips on your neck");
say("Missy, remember trigger");
const trig = storage.listTriggers().find((x) => x.phrase === "velvet");
check("recorded into the trigger, not felt now", [trig?.actions, effects.filter((e) => e[2] === "Kiss").length], [["feel:Kiss:neck"], 0]);
session.wakeByHypnotist(HYP);
drainPaced();
fresh();
clock += 60_000;
say("velvet");
check("the word fires it: the kiss is felt", effects, [["her", "her", "Kiss", "ItemNeck", 1]]);
check("it repeats with the arousal while held", voice.wornRepeatKind("feel:Kiss:neck"), "arousal");

console.log(`phantom: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
