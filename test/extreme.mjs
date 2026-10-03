// The Extreme progressive lock (extreme.ts), v0.99.0 — job2.md §4 and §5.
//
// Choosing Extreme and confirming its warning makes the settings read-only for 7 days, then 30 at a
// time if the player chooses; never permanent. Each check says what failure looks like.
const HELPER = 510001;
let Commands = [];
globalThis.CommandCombine = (add) => { Commands = Commands.concat(Array.isArray(add) ? add : [add]); };
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: {}, GetPronouns: () => "SheHer" };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HELPER, Name: "Missys Helper" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerSend = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m).replace(/^\[(.*)\]$/s, "$1"));
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;

const { storage, wizard, extreme, menu, voice, commands } = await import("./harness-bundle.mjs");
commands.installCommands();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const echs = () => Commands.find((c) => c.Tag === "echs");
const run = (sub, args = "") => {
	said = [];
	echs().Subcommands.find((s) => s.Tag === sub).Action(args);
	return said.join(" | ");
};
const runTop = (args) => {
	said = [];
	echs().Action(args);
	return said.join(" | ");
};
const DAY = 86_400_000;
const plant = () =>
	storage.saveTrigger({ phrase: "bluebell", actions: ["movement-block"], installedBy: HELPER, installedByName: "Missys Helper", installedAt: Date.now(), plantedDepth: 60, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });

// --- no lock until Extreme is confirmed ----------------------------------------------------------
storage.resetSettings();
check("fresh: no lock", [storage.getExtremeLock(), extreme.extremeLocked(), menu.settingsLocked()], [null, false, false]);

// --- the running lock ----------------------------------------------------------------------------
wizard.confirmExtreme();
storage.addInteractions(HELPER, "Missys Helper", 10);
plant();
check("locked: settings read-only with no session at all", menu.settingsLocked(), true);
check("locked: not yet expired", extreme.extremeExpired(), false);
check("locked: banner names the end date", /^Read-only: Extreme lock until /.test(extreme.extremeBannerText()), true);
// Failure: Hypnosis Enabled could be unticked. The checkbox reads settingsLocked() at draw and click.
check("locked: covers Hypnosis Enabled (the checkboxes read settingsLocked)", menu.settingsLocked(), true);
// Failure: the trigger is deleted.
check("locked: Planted tab Purge refuses", /^Locked by Extreme until /.test(menu.purgePlanted(1)), true);
check("  and the trigger is still there", storage.listTriggers().length, 1);
check("locked: Clear All refuses", /^Locked by Extreme until /.test(voice.clearAllRefusal() ?? ""), true);
check("locked: /echs forgettrigger refuses", /Locked by Extreme until /.test(run("forgettrigger", "1")), true);
check("  trigger still there", storage.listTriggers().length, 1);
check("locked: /echs triggerdecay refuses to change", /Locked by Extreme until /.test(run("triggerdecay", "fast")), true);
check("  fade unchanged", storage.getTriggerDecayRate(), "veryslow");
check("  but reading it still works", /Triggers fade:/.test(run("triggerdecay")), true);
check("locked: /echs import refuses", /Locked by Extreme until /.test(run("import", "anything")), true);
check("locked: /echs export still works", /Copy the line below/.test(run("export")), true);
check("locked: the wizard cannot be reached (Setup is gated on settingsLocked)", menu.settingsLocked(), true);

// --- the safeword ends a trance but not the lock ---------------------------------------------------
run("safeword");
check("safeword: the lock stays", extreme.extremeLocked(), true);

// --- the hidden /echs exit_extreme ---------------------------------------------------------------
// Failure: it is listed anywhere a player reads commands, or it wipes anything.
check("exit_extreme is not a registered subcommand (BC's /help would list it)",
	echs().Subcommands.some((s) => s.Tag === "exit_extreme"), false);
check("exit_extreme is not in the command help", commands.commandHelp().some((c) => c.tag === "exit_extreme"), false);
check("exit_extreme unlocks", runTop("exit_extreme"), "Extreme lock ended. Your settings are editable again; trust, triggers and stats are untouched.");
check("  settings editable", menu.settingsLocked(), false);
check("  Extreme's settings kept", storage.getFeatures().compelTouchOthers, true);
check("  trust kept", storage.listTrust().length, 1);
check("  triggers kept", storage.listTriggers().length, 1);
check("exit_extreme with no lock says so", runTop("exit_extreme"), "No Extreme lock is set.");
check("bare /echs still prints the summary", /\/(hypno|echs)/.test(runTop("")), true);

// --- the 7-day trial runs out --------------------------------------------------------------------
storage.startExtremeLock("trial", Date.now() - 8 * DAY);
check("trial over: still read-only until answered", [extreme.extremeExpired(), menu.settingsLocked()], [true, true]);
check("trial over: the prompt", extreme.renewalPrompt(), {
	title: "Your 7-day Extreme trial has ended. How was your experience?",
	unlock: "Return to editable settings",
	renew: "Commit to 30 days",
});
check("trial over: the banner says to choose", /lock period has ended/.test(extreme.extremeBannerText()), true);
// Commit to 30 days.
check("commit: answer", /^Extreme renewed for 30 days, until /.test(menu.clickRenewal(true)), true);
const month = storage.getExtremeLock();
check("commit: a 30-day month lock", [month?.stage, Math.round((month.until - Date.now()) / DAY)], ["month", 30]);
check("commit: still locked, no longer expired", [menu.settingsLocked(), extreme.extremeExpired()], [true, false]);

// --- a 30-day period runs out ---------------------------------------------------------------------
storage.startExtremeLock("month", Date.now() - 31 * DAY);
check("month over: the prompt", extreme.renewalPrompt(), {
	title: "Your 30-day Extreme lock has expired. Continue for another 30 days?",
	unlock: "Unlock and edit settings",
	renew: "Renew for 30 days",
});
check("unlock: answer", menu.clickRenewal(false), "Extreme lock ended. Your settings are editable again, and nothing in them has changed.");
check("unlock: no lock, editable", [storage.getExtremeLock(), menu.settingsLocked()], [null, false]);
check("unlock: Extreme's settings kept", storage.getFeatures().compelTouchOthers, true);

// --- reset is the documented way out --------------------------------------------------------------
wizard.confirmExtreme();
check("reset: allowed while locked", /reset to defaults/i.test(run("reset", "confirm")), true);
check("reset: the lock is gone", [storage.getExtremeLock(), menu.settingsLocked()], [null, false]);

// --- junk in storage -------------------------------------------------------------------------------
// Failure: a malformed value locks someone, or a valid lock loses its stage.
{
	const lz = (await import("lz-string")).default;
	const blob = (extra) => lz.compressToBase64(JSON.stringify({ version: "0.99.0", trust: [], experience: 0, features: { hypnoEnabled: true }, ...extra }));
	storage.importSettings(blob({ extremeLockUntil: "soon", extremeLockStage: "month" }));
	check("junk end time: no lock", storage.getExtremeLock(), null);
	storage.importSettings(blob({ extremeLockUntil: Date.now() + DAY, extremeLockStage: "forever" }));
	check("junk stage on a real lock: treated as the trial", storage.getExtremeLock()?.stage, "trial");
	storage.clearExtremeLock();
}

console.log(`extreme: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
