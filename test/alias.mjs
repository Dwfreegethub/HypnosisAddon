// `/echs` is a second tag on the SAME command, not a second command.
//
// DW's call, 2026-09-18, alongside the rename to Erotic Chat Hypnosis Suite: `/hypno` keeps
// working — every wiki page, help line and habit already says it — and `/echs` is added
// beside it so someone who reaches for the add-on's own name is not met with BC's "no such
// command". That makes two independent failures possible, and neither is visible by reading
// installCommands():
//
//   1. Only one tag actually reaches BC. A registration that silently didn't happen looks
//      exactly like one that did from inside this file — it is BC's Commands array that
//      decides, so the suite captures what BC is handed and asserts on that.
//   2. The two registrations share mutable state. BC KEEPS the object it is given in its own
//      Commands array, so handing it one object twice (or two objects whose Subcommands
//      entries are the same objects) means anything BC ever writes onto one shows up on the
//      other. That is why installCommands() builds each registration through a factory and
//      shallow-copies metaCommands; this suite is what stops that quietly reverting to a
//      shared object, which would pass a typecheck and look identical in a diff.
//
// A hollow alias is the third failure — registered, but wired to nothing — so the suite runs
// a real subcommand off the `echs` registration rather than only inspecting its shape.
//
// FAILURE LOOKS LIKE: a "want/got" line below, and a non-zero exit. If the alias is dropped
// the first check fails; if the factory becomes a shared object the identity checks fail while
// everything else still passes.
globalThis.Player = {
	MemberNumber: 1, Name: "Missy", ExtensionSettings: {},
	ArousalSettings: { Active: "Hybrid", Progress: 0 },
	GetPronouns: () => "SheHer",
};
globalThis.ChatRoomCharacter = [Player];
globalThis.ChatRoomData = null;
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ServerSend = () => {};
globalThis.CharacterSetActivePose = () => {};

let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(m);
globalThis.ChatRoomSendEmote = () => {};

// Capture exactly what BC's own registry is handed, in order — the same shape
// Screens/Online/ChatRoom/Commands.js stores.
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);

const { commands } = await import("./harness-bundle.mjs");
commands.installCommands();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};

const byTag = (tag) => registered.find((c) => c.Tag === tag);

// --- both tags reach BC ----------------------------------------------------------------------
check("/hypno is registered", !!byTag("hypno"), true);
check("/echs is registered", !!byTag("echs"), true);
check("they are two separate registry entries", byTag("hypno") !== byTag("echs"), true);

// --- the alias is the same command, not a stub ------------------------------------------------
// Tolerates a missing registration on purpose: if the alias is dropped the checks above
// already say so, and this suite should report that as FAIL lines rather than throwing a
// TypeError over the top of them.
const tags = (c) => (c?.Subcommands ?? []).map((s) => s.Tag);
check("/echs carries the same subcommands as /hypno", tags(byTag("echs")), tags(byTag("hypno")));
check("  and there is more than a handful of them", tags(byTag("echs")).length > 5, true);
check("both describe the add-on by its full name", [byTag("hypno"), byTag("echs")].map((c) => c?.Description), [
	"Erotic Chat Hypnosis Suite — session control, diagnostics and test commands",
	"Erotic Chat Hypnosis Suite — session control, diagnostics and test commands",
]);

// --- nothing mutable is shared between them ---------------------------------------------------
// BC keeps these objects; if the two entries share any of them, a field BC sets on one appears
// on the other. Checked by identity, because equality is exactly what they SHOULD have.
check("the Subcommands arrays are distinct", byTag("hypno")?.Subcommands !== byTag("echs")?.Subcommands, true);
const sub = (c, t) => (c?.Subcommands ?? []).find((s) => s.Tag === t);
const shared = tags(byTag("hypno")).filter((t) => sub(byTag("hypno"), t) === sub(byTag("echs"), t));
check("no subcommand object is shared between the two", shared, []);

// Prove it, rather than trusting the identity check: write onto BC's copy of one and read the
// other. This is what BC doing anything at all to a registration would look like.
if (byTag("hypno") && byTag("echs")) {
	byTag("hypno").Subcommands[0].__bcTouched = true;
	check("touching BC's /hypno entry does not reach /echs", byTag("echs").Subcommands[0].__bcTouched, undefined);
	delete byTag("hypno").Subcommands[0].__bcTouched;
}

// --- the alias actually runs ------------------------------------------------------------------
local = [];
byTag("echs")?.Action("");
const menu = local.join("\n");
check("bare /echs prints the menu", menu.includes("Erotic Chat Hypnosis Suite (ECHS)"), true);
check("  and the menu says the two tags are the same command", menu.includes("/echs is the same command as /hypno"), true);

local = [];
sub(byTag("echs"), "commands")?.Action("");
check("/echs commands runs the real handler", local.join("\n").includes("Typed commands"), true);

console.log(`alias: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
