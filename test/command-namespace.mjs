// ECHS registers its own command names and nothing else (v0.86.1).
//
// ECHS used to register a top-level `/bot` for the test bot, on the belief that BC had none.
// BC does (CommandsDefault.js, R132: it sends "ChatRoomBot <text>" hidden to everyone else in
// the room, which is how players talk to room bots), and CommandCombine REPLACES a command with
// the same tag. So every player with ECHS installed lost BC's `/bot`, and outside the testing room
// ours answered "join the Hypno Testing room" (Bella, #223446 and #254192).
//
// CommandCombine below is BC's own, transcribed from R132 Commands.js, so a clash replaces here
// exactly as it does in the game. BC's native `/bot` is registered first, as the game does, and
// must still be BC's after ECHS installs.
let Commands = [];
globalThis.CommandCombine = function (add) {
	if (!add) return;
	const arr = Array.isArray(add) ? add : [add];
	Commands = Commands.filter((C) => !arr.some((A) => A.Tag == C.Tag)).concat(arr);
	Commands.sort((A, B) => A.Tag.localeCompare(B.Tag));
};
const bcBot = { Tag: "bot", Action: () => "BC's own /bot" };
const bcDefaults = [bcBot, { Tag: "craft", Action() {} }, { Tag: "help", Action() {} }, { Tag: "me", Action() {} }];
CommandCombine(bcDefaults);
const before = Commands.map((c) => c.Tag);

globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, GetPronouns: () => "SheHer" };
globalThis.ChatRoomCharacter = [globalThis.Player];
globalThis.ChatRoomSendLocal = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};

const { commands } = await import("./harness-bundle.mjs");

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

commands.installCommands();

const added = Commands.map((c) => c.Tag).filter((t) => !before.includes(t));
check("ECHS adds exactly its own two names", added.sort(), ["echs", "hypno"]);
check("BC's /bot is still BC's", Commands.find((c) => c.Tag === "bot") === bcBot, true);
check("no BC command was replaced", bcDefaults.every((d) => Commands.includes(d)), true);

// The test-bot channel still exists, under our tag.
const sub = (tag) => Commands.find((c) => c.Tag === "hypno")?.Subcommands?.find((s) => s.Tag === tag);
check("/hypno bot is registered", !!sub("bot"), true);
check("/echs bot is registered too", !!Commands.find((c) => c.Tag === "echs")?.Subcommands?.find((s) => s.Tag === "bot"), true);

console.log(`command-namespace: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
