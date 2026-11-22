// A full keyholder starts or extends her Extreme lock (v1.16.3, job6.md §6), and the keys lock (v1.16.3,
// DW 2026-11-22). Each check says what failure looks like.
//
//   1. Extreme: full keys only; she sees the wizard's warning in the popup; nothing happens unless she
//      accepts. Accepted: the wizard's lock (the trial). Asked again while locked: 30 more days.
//      If it changed while she was deciding, nothing changes.
//   2. Keys lock: her BC owner holding full keys sets it outright; any other full keyholder needs her
//      Accept; below full: refused. While it holds she can't add, remove or change keyholders, nor
//      give keys on request. Any full keyholder lifts it. 7 days without its setter ends it; reset ends it.
//   3. The keyholder's side keeps who locked her keys; the requests go as remote-request settings.
const ME = 1, KAY = 200, OLIVE = 300, MOE = 400, SAM = 500;
const makeEl = (tag) => {
	const el = {
		tagName: tag.toUpperCase(), id: "", className: "", style: {}, children: [], parent: null, listeners: {}, type: "",
		_text: "",
		get textContent() { return this._text + this.children.map((c) => c.textContent).join(""); },
		set textContent(v) { this.children = []; this._text = String(v); },
		appendChild(k) { k.parent = this; this.children.push(k); return k; },
		remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } },
		addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); },
		click() { for (const fn of this.listeners.click ?? []) fn({ type: "click" }); },
	};
	return el;
};
const body = makeEl("body");
const walk = (n, id) => { if (n.id === id) return n; for (const c of n.children) { const f = walk(c, id); if (f) return f; } return null; };
globalThis.document = { body, createElement: makeEl, getElementById: (id) => walk(body, id) };
globalThis.Player = { MemberNumber: ME, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
	IsOwnedByCharacter: (c) => c?.MemberNumber === OLIVE };
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
const kay = { MemberNumber: KAY, Name: "Kay" }, olive = { MemberNumber: OLIVE, Name: "Olive" }, moe = { MemberNumber: MOE, Name: "Moe" }, sam = { MemberNumber: SAM, Name: "Sam" };
globalThis.ChatRoomCharacter = [Player, kay, olive, moe, sam];
globalThis.ChatRoomData = { Name: "Some Room" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
let hidden = [];
globalThis.ServerSend = (type, data) => { if (type === "ChatRoomChat" && data?.Type === "Hidden") hidden.push({ to: data.Target, ...data?.Dictionary?.[0]?.message }); };
let local = [];
globalThis.ChatRoomSendLocal = (m) => local.push(String(m?.textContent ?? m));
globalThis.ChatRoomSendEmote = () => {};
globalThis.setTimeout = () => 0;
globalThis.clearTimeout = () => {};
globalThis.setInterval = () => 1;
globalThis.clearInterval = () => {};
const registered = [];
globalThis.CommandCombine = (cmd) => registered.push(cmd);

const { keyholder, keylock, storage, messaging, remote, commands, ask, extreme } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });
commands.installCommands();

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const box = () => document.getElementById(ask.ASK_ID);
const button = (label) => { const find = (n) => (n.tagName === "BUTTON" && n.textContent === label ? n : n.children.map(find).find(Boolean)); return box() ? find(box()) : null; };
const req = (from, body) => { hidden = []; local = []; deliver(from, { type: "remote-request", feature: "settings", ...body }); return hidden.filter((m) => m.to === from).at(-1); };
const result = (who) => hidden.filter((m) => m.to === who && m.settingsResult).at(-1)?.settingsResult;
const echs = (args) => { local = []; registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "keyholder").Action(args); return local.join(" | "); };
const answer = async (label) => { hidden = []; local = []; button(label).click(); await settle(); };
const DAY = 86_400_000;
storage.setFeature("hypnoEnabled", true);
storage.setKeyholder(KAY, "Kay", "full");
storage.setKeyholder(MOE, "Moe", "moderate");

// 1. Extreme.
let r = req(MOE, { action: "extreme" });
check("moderate keys can't start Extreme", !box() && !extreme.extremeLocked() && /needs full keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
req(KAY, { action: "extreme" });
check("full keys: she sees the Extreme warning", !!box() && /Kay asks to put you under Extreme/.test(box().textContent) && extreme.EXTREME_WARNING.every((w) => box().textContent.includes(w)), `the warning, got ${box()?.textContent}`);
check("  nothing yet", !extreme.extremeLocked(), "unlocked");
await answer("Decline");
check("Decline: no Extreme", !extreme.extremeLocked() && /declined/.test(result(KAY)?.text ?? ""), JSON.stringify(result(KAY)));
keyholder.resetKeyholderViews();
req(KAY, { action: "extreme" });
await answer("Start Extreme");
const lock1 = storage.getExtremeLock();
check("Accept: the trial lock", lock1?.stage === "trial" && Math.abs(lock1.until - (Date.now() + storage.EXTREME_TRIAL_DAYS * DAY)) < 5000 && result(KAY)?.ok === true, JSON.stringify(lock1));
check("  she is told", local.some((l) => /Kay put you under Extreme \(you agreed\)/.test(l) && /safeword/.test(l)), JSON.stringify(local));
check("  in her remote changes", storage.listRemoteChanges().some((c) => c.by === KAY && /started your Extreme lock/.test(c.what)), "noted");
r = req(KAY, { action: "extreme" });
check("asking again at once: refused", !box() && /asked them recently/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
keyholder.resetKeyholderViews();
req(KAY, { action: "extreme" });
check("locked: she is asked to extend", /extend your Extreme lock by 30 days/.test(box()?.textContent ?? ""), box()?.textContent);
await answer("Extend by 30 days");
const lock2 = storage.getExtremeLock();
check("Accept: 30 days more, as a month", lock2.stage === "month" && lock2.until === lock1.until + 30 * DAY, `${lock1.until}+30d, got ${JSON.stringify(lock2)}`);
// Changed while she decided: asked to extend, but it ended before she answered.
keyholder.resetKeyholderViews();
req(KAY, { action: "extreme" });
storage.clearExtremeLock();
await answer("Extend by 30 days");
check("changed while deciding: nothing", !extreme.extremeLocked() && /changed while they were deciding/.test(result(KAY)?.text ?? ""), JSON.stringify(result(KAY)));
// Lost full keys while deciding.
keyholder.resetKeyholderViews();
req(KAY, { action: "extreme" });
storage.setKeyholder(KAY, "Kay", "moderate");
await answer("Start Extreme");
check("keys lowered while deciding: nothing", !extreme.extremeLocked() && /no longer hold their full keys/.test(result(KAY)?.text ?? ""), JSON.stringify(result(KAY)));
storage.setKeyholder(KAY, "Kay", "full");

// 2. The keys lock. Olive is her BC owner.
r = req(OLIVE, { action: "lock-keys" });
check("owner without keys: not a keyholder", !keylock.keysLocked() && /not made you their keyholder/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
storage.setOwnerKeyMode("moderate");
r = req(OLIVE, { action: "lock-keys" });
check("owner with moderate keys: refused", !keylock.keysLocked() && !box() && /needs full keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
storage.setOwnerKeyMode("full");
r = req(OLIVE, { action: "lock-keys" });
check("owner with full keys: locked at once, no popup", keylock.keysLockHolder()?.id === OLIVE && !box() && r?.settingsResult?.ok === true, JSON.stringify(r?.settingsResult));
check("  she is told her owner did it", local.some((l) => /Olive \(your owner\) locked who holds your keys/.test(l)), JSON.stringify(local));
check("  the reply names who", r?.settings?.keysLock === "Olive", JSON.stringify(r?.settings?.keysLock));
let said = echs("add Sam minimal");
check("locked: can't give keys", keyholder.keyModeFor(SAM) === null && /Olive locked who holds your keys/.test(said), `Sam none, got "${said}"`);
said = echs("remove Moe");
check("  can't take keys back", keyholder.keyModeFor(MOE) === "moderate", `Moe kept, got "${said}"`);
said = echs("owner off");
check("  can't change her owner's keys", storage.getOwnerKeyMode() === "full", `full kept, got "${said}"`);
hidden = []; local = [];
deliver(SAM, { type: "remote-request", feature: "settings", action: "request-keys", level: "minimal" });
check("  can't be given keys on request", !box() && /who holds their keys is locked/i.test(hidden.find((m) => m.to === SAM)?.keyRequestResult?.text ?? "") && local.some((l) => /Sam asked for your keys/.test(l)), JSON.stringify(hidden));
said = echs("");
check("  still lists her keyholders", /Kay/.test(said), said);
r = req(MOE, { action: "unlock-keys" });
check("moderate keys can't unlock it", keylock.keysLocked() && /needs full keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
r = req(KAY, { action: "unlock-keys" });
check("any full keyholder unlocks it", !keylock.keysLocked() && r?.settingsResult?.ok === true && local.some((l) => /Kay \(your keyholder\) unlocked who holds your keys \(Olive had locked it\)/.test(l)), JSON.stringify(local));
said = echs("add Sam minimal");
check("  and she can give keys again", keyholder.keyModeFor(SAM) === "minimal", said);
echs("remove Sam");

// Not her owner: a popup.
req(KAY, { action: "lock-keys" });
check("a full keyholder who isn't her owner: she is asked", /Kay asks to lock who holds your keys/.test(box()?.textContent ?? "") && !keylock.keysLocked(), box()?.textContent);
await answer("Decline");
check("  Decline: not locked", !keylock.keysLocked(), "unlocked");
keyholder.resetKeyholderViews();
req(KAY, { action: "lock-keys" });
await answer("Lock my keys");
check("  Accept: locked by Kay", keylock.keysLockHolder()?.id === KAY && local.some((l) => /Kay locked who holds your keys/.test(l) && !/your owner/.test(l)), JSON.stringify(local));

// 7 days, and reset.
const t0 = Date.now();
storage.setKeyLock(KAY, "Kay", t0, "keys");
ChatRoomCharacter = [Player, olive];
local = [];
check("6 days without Kay: still locked", keylock.keysLocked(t0 + 6 * DAY) === true, "locked");
check("7 days: ends, and she is told", keylock.keysLocked(t0 + 7 * DAY + 1) === false && local.some((l) => /keys lock has ended/.test(l)), JSON.stringify(local));
check("  the settings lock is a separate thing", storage.getKeyLock("settings") === null, "no settings lock");
ChatRoomCharacter = [Player, kay, olive, moe, sam];
storage.setKeyLock(KAY, "Kay", Date.now(), "keys");
registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "reset").Action("confirm");
check("/echs reset confirm ends it", !keylock.keysLocked(), "unlocked");

// 2b. Her BC owner (Olive) at full keys takes other keyholders' keys back, without asking (DW 2026-11-22).
storage.setFeature("hypnoEnabled", true);
storage.setKeyholder(KAY, "Kay", "full");
storage.setKeyholder(MOE, "Moe", "moderate");
storage.setOwnerKeyMode("full");
r = req(OLIVE, { action: "read" });
check("her owner sees her other keyholders", JSON.stringify(r?.settings?.keyholders) === JSON.stringify([{ id: KAY, name: "Kay", mode: "full" }, { id: MOE, name: "Moe", mode: "moderate" }]), JSON.stringify(r?.settings?.keyholders));
r = req(KAY, { action: "read" });
check("  a full keyholder who isn't her owner sees them too (v1.16.4)", JSON.stringify(r?.settings?.keyholders) === JSON.stringify([{ id: MOE, name: "Moe", mode: "moderate" }]), JSON.stringify(r?.settings?.keyholders));
r = req(MOE, { action: "read" });
check("  moderate keys don't", r?.settings && r.settings.keyholders === undefined, JSON.stringify(r?.settings?.keyholders));
r = req(MOE, { action: "remove-keyholder", id: KAY });
check("  nor can moderate keys remove anyone", keyholder.keyModeFor(KAY) === "full" && !box() && /needs full keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
// Kay (full, not her owner): she is asked.
req(KAY, { action: "remove-keyholder", id: MOE });
check("a full keyholder: she is asked", /Kay asks to take Moe's keys back/.test(box()?.textContent ?? "") && keyholder.keyModeFor(MOE) === "moderate", box()?.textContent);
await answer("Decline");
check("  Decline: Moe keeps them", keyholder.keyModeFor(MOE) === "moderate" && /declined/.test(result(KAY)?.text ?? ""), JSON.stringify(result(KAY)));
keyholder.resetKeyholderViews();
req(KAY, { action: "remove-keyholder", id: MOE });
await answer("Take Moe's keys back");
check("  Accept: Moe's keys gone", keyholder.keyModeFor(MOE) === null && result(KAY)?.ok === true && local.some((l) => /Kay took Moe's keys back \(you agreed\)/.test(l)), JSON.stringify(local));
storage.setKeyholder(MOE, "Moe", "moderate");
storage.setKeyLock(OLIVE, "Olive", Date.now(), "keys");
keyholder.resetKeyholderViews();
r = req(KAY, { action: "remove-keyholder", id: MOE });
check("  not while her keys lock holds", keyholder.keyModeFor(MOE) === "moderate" && !box() && /only their owner/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
storage.clearKeyLock("keys");
storage.setOwnerKeyMode("moderate");
r = req(OLIVE, { action: "remove-keyholder", id: MOE });
check("owner with moderate keys: refused", keyholder.keyModeFor(MOE) === "moderate" && r?.settingsResult?.ok === false && r?.settings?.keyholders === undefined, JSON.stringify(r?.settingsResult));
storage.setOwnerKeyMode("full");
r = req(OLIVE, { action: "remove-keyholder", id: MOE });
check("owner at full: removed at once, no popup", keyholder.keyModeFor(MOE) === null && !box() && r?.settingsResult?.ok === true, JSON.stringify(r?.settingsResult));
check("  she is told", local.some((l) => /Olive \(your owner\) took Moe's keys back/.test(l)), JSON.stringify(local));
check("  Moe is told they hold none", hidden.some((m) => m.to === MOE && m.keyLevel === "none"), JSON.stringify(hidden));
check("  noted", storage.listRemoteChanges().some((c) => c.by === OLIVE && /took Moe's keys back/.test(c.what)), "noted");
storage.setKeyLock(KAY, "Kay");
r = req(OLIVE, { action: "remove-keyholder", id: KAY });
check("not the one holding her settings lock", keyholder.keyModeFor(KAY) === "full" && /keep their keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
storage.clearKeyLock();
r = req(OLIVE, { action: "remove-keyholder", id: 999 });
check("someone who holds none: refused", r?.settingsResult?.ok === false && /doesn't hold their keys/.test(r.settingsResult.text), JSON.stringify(r?.settingsResult));

// 3. The keyholder's side.
keyholder.resetKeyholderViews();
deliver(KAY, { type: "state-response", version: "1.16.3", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keysLock: "Olive" } });
check("who locked her keys is kept", keyholder.settingsOf(KAY)?.keysLock === "Olive", JSON.stringify(keyholder.settingsOf(KAY)));
hidden = [];
keyholder.requestLockKeys(KAY);
keyholder.requestUnlockKeys(KAY);
keyholder.requestExtreme(KAY);
deliver(KAY, { type: "state-response", version: "1.16.3", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyholders: [{ id: MOE, name: "Moe", mode: "minimal" }, { id: "x", name: "Bad", mode: "full" }, { id: 7, name: "Odd", mode: "boss" }] } });
check("her keyholders kept, cleaned", JSON.stringify(keyholder.settingsOf(KAY)?.keyholders) === JSON.stringify([{ id: MOE, name: "Moe", mode: "minimal" }]), JSON.stringify(keyholder.settingsOf(KAY)?.keyholders));
keyholder.requestRemoveKeyholder(KAY, MOE);
check("requests go as remote-request settings", hidden.filter((m) => m.to === KAY && m.type === "remote-request" && m.feature === "settings").map((m) => m.action).join() === "lock-keys,unlock-keys,extreme,remove-keyholder", JSON.stringify(hidden));

console.log(`keyholder-extreme: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
