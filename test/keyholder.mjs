// Keyholders (v1.14.0, job5.md): changing someone's ECHS settings for them. Each check says what
// failure looks like.
//
//   1. Rule 1: her client decides. A stranger is refused and nothing changes; a keyholder's change
//      goes through the same path as her own click (setFeature + onToggle), she is told who changed
//      what, and it is logged.
//   2. "take" may only switch off; "grant" may switch on; a box that needs another needs it on first;
//      anything not on the four tabs is unreachable.
//   3. Her BC owner holds keys only while she allows it; named and owner together give the wider.
//   4. It works through her Extreme lock, and a keyholder can end the lock. Her own edits of the list
//      are refused under the lock.
//   5. The wire: requests on remote-request (feature "settings"), replies on state-response; her
//      answer to anyone's state-query says, to that asker alone, whether they hold her keys.
//   6. The keyholder's side keeps what arrives (cleaned), and the popup's Keys tab shows it; a click
//      there sends a request, it does not type.
const ME = 1, KAY = 200, OWNER = 300, STRANGER = 400;
const kay = { MemberNumber: KAY, Name: "Kay" };
const owner = { MemberNumber: OWNER, Name: "Olive" };
const stranger = { MemberNumber: STRANGER, Name: "Sam" };
globalThis.Player = {
	MemberNumber: ME, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
	IsOwnedByCharacter: (C) => C?.MemberNumber === OWNER,
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, kay, owner, stranger];
globalThis.ChatRoomData = { Name: "Some Room" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let hidden = [];
globalThis.ServerSend = (type, data) => {
	if (type === "ChatRoomChat" && data?.Type === "Hidden") hidden.push({ to: data.Target, ...data?.Dictionary?.[0]?.message });
};
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m?.textContent ?? m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);

const { keyholder, storage, messaging, session, remote, commands, menu } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });
session.installSession();
commands.installCommands();

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const lastTo = (who) => hidden.filter((m) => m.to === who).at(-1);
const req = (from, body) => { hidden = []; deliver(from, { type: "remote-request", feature: "settings", ...body }); return lastTo(from); };
const echs = (args) => { local = []; registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "keyholder").Action(args); return local.join(" | "); };
const f = () => storage.getFeatures();

// 1. A stranger is refused, nothing changes.
storage.setFeature("hypnoEnabled", true);
storage.setFeature("sightControl", true);
let r = req(STRANGER, { action: "set", key: "sightControl", value: false });
check("stranger refused", r?.settingsResult?.ok === false && /not made you their keyholder/.test(r.settingsResult.text), `a refusal to Sam, got ${JSON.stringify(r?.settingsResult)}`);
check("  and nothing changed", f().sightControl === true, "sight still on");
check("  and no settings sent to a stranger", r?.settings === undefined, "no snapshot in the refusal");

// 3. Owner only while allowed.
check("owner not a keyholder by default", keyholder.keyModeFor(OWNER) === null, "no key mode for the owner until she allows it");
echs("owner take");
check("owner allowed: take", keyholder.keyModeFor(OWNER) === "take", `take for the owner, got ${keyholder.keyModeFor(OWNER)}`);
echs("owner off");
check("owner off again", keyholder.keyModeFor(OWNER) === null, "no key mode after owner off");
check("never herself", keyholder.keyModeFor(ME) === null, "no key mode for herself");

// Named, take.
let said = echs("add Kay");
check("add Kay: take", keyholder.keyModeFor(KAY) === "take" && /Kay is your keyholder/.test(said) && /end your Extreme lock/.test(said), `Kay as take, with the warning, got "${said}"`);
check("  Kay is told she holds keys", hidden.some((m) => m.to === KAY && m.type === "state-response" && m.keyholder === "take"), "a state-response to Kay saying take");

// 5. The state-query answer.
hidden = [];
deliver(KAY, { type: "state-query", version: "1.14.0" });
check("answer to Kay says keyholder", lastTo(KAY)?.keyholder === "take", `keyholder "take" in the answer to Kay, got ${lastTo(KAY)?.keyholder}`);
deliver(STRANGER, { type: "state-query", version: "1.14.0" });
check("answer to Sam says nothing", !("keyholder" in (lastTo(STRANGER) ?? {})), "no keyholder field for Sam");

// Read: only the four tabs' boxes.
r = req(KAY, { action: "read" });
const keys = r?.settings?.boxes?.map((b) => b.key) ?? [];
const rows = menu.remoteRows();
check("read: every reachable box", keys.length === rows.length && rows.every((x) => keys.includes(x.key)), `${rows.length} boxes, got ${keys.length}`);
check("  and only those tabs", rows.every((x) => menu.REMOTE_TABS.includes(x.tab)) && rows.some((x) => x.key === "hypnoEnabled") && rows.some((x) => x.key === "suppressClothing"), "rows from Permissions, Trance Defaults, Awareness, Triggers");

// 1/2. Take: off works through onToggle; on is refused.
local = [];
r = req(KAY, { action: "set", key: "sightControl", value: false });
check("take: switch off works", f().sightControl === false && r?.settingsResult?.ok === true, `sight off and ok, got ${f().sightControl} / ${JSON.stringify(r?.settingsResult)}`);
check("  she is told who and what", local.some((l) => l.includes("Kay (your keyholder) turned off Sight")), `a line naming Kay and Sight, got ${JSON.stringify(local)}`);
check("  and it is logged", storage.listRemoteChanges().at(-1)?.what === "turned off Sight (dimmed, very dark, or blind)" && storage.listRemoteChanges().at(-1)?.by === KAY, `a log entry, got ${JSON.stringify(storage.listRemoteChanges().at(-1))}`);
r = req(KAY, { action: "set", key: "postureControl", value: true });
check("take: switch on refused", f().postureControl === false && r?.settingsResult?.ok === false && /only switch their settings off/.test(r.settingsResult.text), `posture still off and a refusal, got ${JSON.stringify(r?.settingsResult)}`);
r = req(KAY, { action: "set", key: "extremeLockUntil", value: false });
check("unreachable key refused", /not something a keyholder can change/.test(r?.settingsResult?.text ?? ""), `a refusal for a key off the four tabs, got ${JSON.stringify(r?.settingsResult)}`);

// Grant.
echs("add Kay grant");
check("Kay now grant", keyholder.keyModeFor(KAY) === "grant", "grant");
r = req(KAY, { action: "set", key: "postureControl", value: true });
check("grant: switch on works", f().postureControl === true && r?.settingsResult?.ok === true, "posture on");
r = req(KAY, { action: "set", key: "compelTouchOthers", value: true });
check("needs its parent on first", f().compelTouchOthers === false && /needs "Made to Act/.test(r?.settingsResult?.text ?? ""), `refused while Made to Act is off, got ${JSON.stringify(r?.settingsResult)}`);

// The hard floor through the same path: hypnosis off ends a trance.
session.forceTrance(KAY, 40, 40);
check("fixture: under", session.isHypnotized(), "a trance to end");
req(KAY, { action: "set", key: "hypnoEnabled", value: false });
check("hypnosis off by a keyholder ends the trance (onToggle ran)", !session.isHypnotized() && f().hypnoEnabled === false, "no trance and hypnosis off");
req(KAY, { action: "set", key: "hypnoEnabled", value: true });

// Owner + named: the wider.
echs("add Kay");
echs("owner grant");
check("owner grant", keyholder.keyModeFor(OWNER) === "grant", "grant for the owner");
check("named take stays take", keyholder.keyModeFor(KAY) === "take", "Kay take");

// 4. Extreme.
storage.startExtremeLock("trial", Date.now());
said = echs("remove Kay");
check("under Extreme: her list is read-only", keyholder.keyModeFor(KAY) === "take" && /Locked by Extreme/.test(said), `Kay kept and a refusal, got "${said}"`);
r = req(KAY, { action: "read" });
check("snapshot says locked", r?.settings?.extreme === true, "extreme: true in the snapshot");
storage.setFeature("speechRestriction", true);
r = req(KAY, { action: "set", key: "speechRestriction", value: false });
check("keyholder changes go through the lock", f().speechRestriction === false && r?.settingsResult?.ok === true, "speech off under Extreme");
local = [];
r = req(KAY, { action: "end-extreme" });
check("keyholder ends the lock", storage.getExtremeLock() === null && /ended your Extreme lock/.test(local.join(" ")) && r?.settingsResult?.ok === true, `lock gone and she is told, got ${JSON.stringify(storage.getExtremeLock())}`);
r = req(STRANGER, { action: "end-extreme" });
storage.startExtremeLock("trial", Date.now());
r = req(STRANGER, { action: "end-extreme" });
check("a stranger cannot end it", storage.getExtremeLock() !== null && r?.settingsResult?.ok === false, "the lock kept");
storage.clearExtremeLock();

// Remove.
said = echs("remove Kay");
check("remove Kay", keyholder.keyModeFor(KAY) === null && /Removed/.test(said), `Kay gone, got "${said}"`);
check("  Kay is told she no longer holds keys", hidden.some((m) => m.to === KAY && m.keyholder === "none"), "a state-response saying none");
said = echs("");
check("bare command lists", /BC owner holds your keys \(grant\)/.test(said) && /Nobody else holds your keys/.test(said), `the list, got "${said}"`);

// 6. Keyholder side.
keyholder.resetKeyholderViews();
deliver(KAY, { type: "state-response", version: "1.14.0", keyholder: "grant" });
check("we hold Kay's keys", keyholder.heldKeys().map((h) => `${h.id}:${h.mode}`).join() === `${KAY}:grant`, `Kay grant, got ${JSON.stringify(keyholder.heldKeys())}`);
deliver(KAY, { type: "state-response", version: "1.14.0", keyholder: "grant", settings: { boxes: [{ key: "sightControl", on: true }, { key: "x".repeat(99), on: true }, null], extreme: true, mode: "grant" } });
const snap = keyholder.settingsOf(KAY);
check("snapshot kept, cleaned", snap?.boxes.length === 1 && snap.boxes[0].key === "sightControl" && snap.extreme === true, `one clean box, got ${JSON.stringify(snap)}`);
hidden = [];
keyholder.requestSetting(KAY, "sightControl", false);
const sent = lastTo(KAY);
check("a change goes as remote-request settings", sent?.type === "remote-request" && sent.feature === "settings" && sent.action === "set" && sent.key === "sightControl" && sent.value === false, `the request, got ${JSON.stringify(sent)}`);
check("  asking until answered", keyholder.askState(KAY) === "asking", "asking");
check("  silent after the wait", keyholder.askState(KAY, Date.now() + keyholder.SETTINGS_ASK_MS + 1) === "silent", "silent");
deliver(KAY, { type: "state-response", version: "1.14.0", keyholder: "none" });
check("told none: no longer held", keyholder.heldKeys().length === 0 && keyholder.settingsOf(KAY) === null, "nothing held");

console.log(`keyholder: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
