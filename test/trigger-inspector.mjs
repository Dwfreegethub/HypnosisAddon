// The trigger inspector, v0.88.0 (design.md, "Trigger Overhaul", Build 2, decisions 7-9):
// `/hypno triggers` as a summary and `/hypno triggers <n>` as the detail; Purge refused while a
// trigger holds you; Clear All (and `forgettrigger all`) refused while a trigger or a session has
// hold of you, and asking first when it may run.
//
// The settings-screen drawing is covered in menu-layout.mjs. This is the rules behind it, and the
// chat commands, which share them.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 }, GetPronouns: () => "SheHer" };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(typeof m === "string" ? m : m?.textContent ?? String(m));
let Commands = [];
globalThis.CommandCombine = (add) => { Commands = Commands.concat(Array.isArray(add) ? add : [add]); };
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };

const { depth, voice, storage, timers, session, menu, commands } = await import("./harness-bundle.mjs");
depth.setCurrentDepths(80, 80);
commands.installCommands();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const run = (sub, args = "") => {
	said = [];
	Commands.find((c) => c.Tag === "hypno").Subcommands.find((s) => s.Tag === sub).Action(args);
	// Private lines arrive bracketed ("[...]"); compare the words.
	return said.map((m) => m.replace(/^\[(.*)\]$/s, "$1")).join(" | ");
};

for (const k of ["hypnoEnabled", "movementRestriction", "triggerControl"]) storage.setFeature(k, true);
storage.setTriggerScope("hypnotist");
storage.setTriggerDuration(0); // held until released, so "holding" is stable under test
const plant = (phrase, by = HYP, name = "GameBot") =>
	storage.saveTrigger({ phrase, actions: ["movement-block"], installedBy: by, installedByName: name, installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });

// --- /hypno triggers: the summary --------------------------------------------------------------
// Failure: it names actions or the phrase, or leaves out who or how strong.
storage.forgetAllTriggers();
check("empty list", run("triggers"), "no triggers planted");
plant("amber light");
plant("velvet dark", 555, "Rei");
const summary = run("triggers");
check("summary counts them", /You have 2 triggers planted/.test(summary), true);
check("  names each installer with their number", /GameBot \(#246108\).*Rei \(#555\)/.test(summary), true);
check("  gives each one's level", (summary.match(/full strength/g) ?? []).length, 2);
check("  says nothing of what they do", /cannot move|movement/.test(summary), false);
check("  nor the words", /amber|velvet/.test(summary), false);
check("  and points at the detail", /triggers <number>/.test(summary), true);

// --- /hypno triggers <n>: the detail -----------------------------------------------------------
// Failure: no actions, the phrase leaks, or a bad number gets no answer.
const two = run("triggers", "2");
check("detail: what it does", /What it does: you cannot move/.test(two), true);
check("  who planted it", /planted by Rei \(#555\)/.test(two), true);
check("  the word stays hidden", /velvet/.test(two), false);
check("  and says it is hidden", /Word: hidden/.test(two), true);
check("a bad number says so", run("triggers", "9"), "no trigger 9 — you have 2.");
check("junk says so", /no trigger/.test(run("triggers", "banana")), true);
storage.setFeature("showTriggerWords", true);
check("the setting shows the word in the detail", /Word: "velvet dark"/.test(run("triggers", "2")), true);
check("  and in the list", /"amber light"/.test(run("triggers")), true);
storage.setFeature("showTriggerWords", false);
check("options appear in the detail", (() => {
	const t = storage.listTriggers()[0];
	t.oneShot = true;
	t.expiresAt = Date.now() + 2 * 3_600_000;
	return /Also: works once, ends in 2 hours/.test(run("triggers", "1"));
})(), true);
storage.forgetAllTriggers();

// describeAction covers every stored id shape. Failure: a raw id reaches the player.
check("action words: suggestion", voice.describeAction("movement-block"), "you cannot move");
check("action words: body part", voice.describeAction("touch:breasts"), "you cannot touch your breasts");
check("action words: all", voice.describeAction("touch:all"), "you cannot touch yourself");
check("action words: compel", voice.describeAction("act:Caress:breasts"), "you caress your breasts");
check("action words: vague", voice.describeAction("act:vague"), "you touch yourself somewhere");

// --- Purge: refused while holding ---------------------------------------------------------------
// Failure (a): a holding trigger is removed. Failure (b): a free one is not.
plant("iron grip");
plant("loose end");
voice.handleSpokenLine(HYP, "iron grip");
const held = storage.listTriggers().find((t) => t.phrase === "iron grip");
check("the fired trigger is holding", voice.isTriggerInEffect(held), true);
check("Purge refuses while it holds", /holding you right now/.test(menu.purgePlanted(1)), true);
check("  and it is still there", storage.listTriggers().length, 2);
check("Purge removes a free one", menu.purgePlanted(2), "Trigger 2 removed.");
check("  and only that one", storage.listTriggers().map((t) => t.phrase), ["iron grip"]);
check("Purge of a number that is not there says so", menu.purgePlanted(5), "There is no trigger 5.");

// --- Clear All: refused while a trigger holds ---------------------------------------------------
// Failure: it clears, or it refuses in silence.
plant("spare word");
check("refusal while a trigger holds", /holding you right now/.test(voice.clearAllRefusal() ?? ""), true);
check("  the button refuses with the reason", /holding you right now/.test(menu.clickClearAll()), true);
check("  and a second click still refuses (it never armed)", /holding you right now/.test(menu.clickClearAll()), true);
check("  nothing removed", storage.listTriggers().length, 2);
check("  forgettrigger all refuses the same way", /holding you right now/.test(run("forgettrigger", "all confirm")), true);
check("  nothing removed by it either", storage.listTriggers().length, 2);

// --- Clear All: refused while a session runs, even with nothing holding -------------------------
timers.clearAllTimers(); // let go of the trigger
check("nothing holds now", voice.clearAllRefusal(), null);
session.forceTrance(HYP, 60, 60);
check("refusal while a session runs", /session is running/.test(voice.clearAllRefusal() ?? ""), true);
check("  the button refuses", /session is running/.test(menu.clickClearAll()), true);
check("  forgettrigger all refuses", /session is running/.test(run("forgettrigger", "all")), true);
check("  nothing removed", storage.listTriggers().length, 2);
session.safeword();
check("after the safeword, no refusal", voice.clearAllRefusal(), null);

// --- Clear All: asks, then clears ---------------------------------------------------------------
// Failure: one click, or one command, clears everything.
check("first click arms", /again within 5 seconds/.test(menu.clickClearAll()), true);
check("  nothing removed yet", storage.listTriggers().length, 2);
check("second click clears", menu.clickClearAll(), "Removed 2 trigger(s).");
check("  all gone", storage.listTriggers().length, 0);
plant("one more");
plant("and another");
check("forgettrigger all asks first", /forgettrigger all confirm/.test(run("forgettrigger", "all")), true);
check("  and removes nothing", storage.listTriggers().length, 2);
check("  it mentions ones you cannot see", /including any you cannot see/.test(run("forgettrigger", "all")), true);
check("forgettrigger all confirm clears", run("forgettrigger", "all confirm"), "forgot 2 trigger(s)");
check("  all gone", storage.listTriggers().length, 0);
check("forgettrigger all with none planted says so", run("forgettrigger", "all"), "no triggers planted");

console.log(`trigger-inspector: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
