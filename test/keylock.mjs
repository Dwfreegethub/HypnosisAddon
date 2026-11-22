// The keyholder lock (v1.16.2, job6.md §5). Each check says what failure looks like.
//
//   1. A full keyholder asks; she answers in the popup. Decline or no answer in 30 s: nothing locks.
//      Below full: refused without asking her. One ask per keyholder every few minutes.
//   2. Locked: her settings are read-only to her (the screen, /echs decay and triggerdecay, import);
//      keyholders still change them. Her keyholder list stays hers, except the one who locked it
//      keeps full keys. Asking her for keys still works.
//   3. Any full keyholder unlocks; moderate keys can't. She is told who.
//   4. It ends on its own after 7 days without the locking keyholder in a room with her; being in
//      the room together keeps it. /echs reset confirm ends it with everything else.
//   5. The keyholder's side: who locked her is kept; lock and unlock go as remote-request settings.
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
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }], IsOwnedByCharacter: () => false };
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

const { keyholder, keylock, storage, messaging, remote, commands, ask, menu } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });
commands.installCommands();

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const lastTo = (who) => hidden.filter((m) => m.to === who).at(-1);
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const box = () => document.getElementById(ask.ASK_ID);
const button = (label) => { const find = (n) => (n.tagName === "BUTTON" && n.textContent === label ? n : n.children.map(find).find(Boolean)); return box() ? find(box()) : null; };
const req = (from, body) => { hidden = []; local = []; deliver(from, { type: "remote-request", feature: "settings", ...body }); return lastTo(from); };
const sub = (tag) => registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === tag);
const echs = (tag, args) => { local = []; sub(tag).Action(args); return local.join(" | "); };
const result = (who) => hidden.filter((m) => m.to === who && m.settingsResult).at(-1)?.settingsResult;
storage.setFeature("hypnoEnabled", true);
storage.setKeyholder(KAY, "Kay", "full");
storage.setKeyholder(OLIVE, "Olive", "full");
storage.setKeyholder(MOE, "Moe", "moderate");

// 1. Asking.
let r = req(MOE, { action: "lock" });
check("moderate keys can't ask", !box() && !keylock.keyLocked() && /needs full keys/.test(r?.settingsResult?.text ?? ""), `refused, no box, got ${JSON.stringify(r?.settingsResult)}`);
req(KAY, { action: "lock" });
check("full keys: she is asked", !!box() && /Kay asks to lock your settings/.test(box().textContent) && /7 days/.test(box().textContent) && /safeword/.test(box().textContent), `a box, got ${box()?.textContent}`);
check("  nothing locked yet", !keylock.keyLocked() && !hidden.some((m) => m.settingsResult), "unlocked, no answer sent");
hidden = [];
button("Decline").click();
await settle();
check("Decline: not locked", !keylock.keyLocked() && result(KAY)?.ok === false && /declined/.test(result(KAY).text), `declined, got ${JSON.stringify(result(KAY))}`);
r = req(KAY, { action: "lock" });
check("asking again at once: refused", !box() && /asked them recently/.test(r?.settingsResult?.text ?? ""), `too soon, got ${JSON.stringify(r?.settingsResult)}`);
req(OLIVE, { action: "lock" });
hidden = []; local = [];
ask.tickAsk(Date.now() + ask.ASK_TIMEOUT_MS + 1);
await settle();
check("no answer: not locked", !box() && !keylock.keyLocked() && /didn't answer in time/.test(result(OLIVE)?.text ?? "") && local.some((l) => /timed out/.test(l)), `timed out, got ${JSON.stringify(result(OLIVE))} ${JSON.stringify(local)}`);

keyholder.resetKeyholderViews(); // forget who asked when
req(KAY, { action: "lock" });
hidden = []; local = [];
button("Lock my settings").click();
await settle();
check("Accept: locked by Kay", keylock.keyLockHolder()?.id === KAY && result(KAY)?.ok === true, `locked, got ${JSON.stringify(keylock.keyLockHolder())} ${JSON.stringify(result(KAY))}`);
check("  she is told", local.some((l) => /Kay locked your settings/.test(l) && /safeword/.test(l)), JSON.stringify(local));
check("  the reply names the locker", lastTo(KAY)?.settings?.keyLock === "Kay", `keyLock Kay, got ${lastTo(KAY)?.settings?.keyLock}`);
r = req(OLIVE, { action: "lock" });
check("already locked: refused", /already locked by Kay/.test(r?.settingsResult?.text ?? "") && !box(), JSON.stringify(r?.settingsResult));

// 2. Locked.
check("her settings are locked", menu.settingsLocked() === true && menu.ownLocked() === false, "settingsLocked, not her own lock");
check("she can still switch ECHS off", menu.fixedRowLocked("hypnoEnabled", false) === false, "off allowed");
check("  but not back on, nor anything else", menu.fixedRowLocked("hypnoEnabled", true) === true && menu.fixedRowLocked("lockedWhileHypnotized", true) === true, "locked");
const rate = storage.getDecayRate();
let said = echs("decay", "fast");
check("/echs decay refused", storage.getDecayRate() === rate && /Kay locked your settings/.test(said), `kept, got "${said}"`);
said = echs("triggerdecay", "fast");
check("/echs triggerdecay refused", /Kay locked your settings/.test(said), `refused, got "${said}"`);
said = echs("import", "{}");
check("/echs import refused", /Kay locked your settings/.test(said), `refused, got "${said}"`);
storage.setFeature("sightControl", false);
r = req(OLIVE, { action: "set", key: "sightControl", value: true });
check("a keyholder still changes them", storage.getFeatures().sightControl === true && r?.settingsResult?.ok === true, JSON.stringify(r?.settingsResult));
said = echs("keyholder", "remove Kay");
check("can't take the locker's keys", keyholder.keyModeFor(KAY) === "full" && /Kay locked your settings/.test(said), `Kay kept, got "${said}"`);
said = echs("keyholder", "add Kay moderate");
check("can't lower the locker's keys", keyholder.keyModeFor(KAY) === "full", `Kay full, got ${keyholder.keyModeFor(KAY)}`);
said = echs("keyholder", "add Sam minimal");
check("can still give others keys", keyholder.keyModeFor(SAM) === "minimal", `Sam minimal, got "${said}"`);
said = echs("keyholder", "remove Sam");
check("  and take them back", keyholder.keyModeFor(SAM) === null, `Sam gone, got "${said}"`);
said = echs("keyholder", "owner off");
check("owner keys free when the locker is named full", storage.getOwnerKeyMode() === null, `owner off, got "${said}"`);
deliver(SAM, { type: "remote-request", feature: "settings", action: "request-keys", level: "minimal" });
check("someone can still ask for her keys", !!box() && /Sam asks for your keys/.test(box().textContent), `a box, got ${box()?.textContent}`);
button("Decline").click();
await settle();

// 3. Unlocking.
r = req(MOE, { action: "unlock" });
check("moderate keys can't unlock", keylock.keyLocked() && /needs full keys/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
r = req(OLIVE, { action: "unlock" });
check("another full keyholder unlocks", !keylock.keyLocked() && r?.settingsResult?.ok === true && menu.settingsLocked() === false, JSON.stringify(r?.settingsResult));
check("  she is told who, and who had locked it", local.some((l) => /Olive \(your keyholder\) unlocked your settings \(Kay had locked them\)/.test(l)), JSON.stringify(local));
check("  the reply says unlocked", lastTo(OLIVE)?.settings?.keyLock === "", `empty, got ${JSON.stringify(lastTo(OLIVE)?.settings?.keyLock)}`);
r = req(OLIVE, { action: "unlock" });
check("unlock when unlocked: says so", /not locked/.test(r?.settingsResult?.text ?? ""), JSON.stringify(r?.settingsResult));
said = echs("keyholder", "remove Kay");
check("unlocked: Kay's keys can be taken back", keyholder.keyModeFor(KAY) === null, `gone, got "${said}"`);
storage.setKeyholder(KAY, "Kay", "full");

// 4. Running out.
const t0 = Date.now();
storage.setKeyLock(KAY, "Kay", t0);
check("in the room together: kept and noted", keylock.keyLockHolder(t0 + 8 * 86400000)?.id === KAY && storage.getKeyLock().seenAt === t0 + 8 * 86400000, `still locked, seen now, got ${JSON.stringify(storage.getKeyLock())}`);
ChatRoomCharacter = [Player, olive];
local = [];
check("6 days apart: still locked", keylock.keyLocked(t0 + 14 * 86400000) === true, "locked");
check("7 days apart: ends", keylock.keyLocked(t0 + 15 * 86400000 + 1) === false && storage.getKeyLock() === null, "ended and cleared");
check("  she is told why", local.some((l) => /hasn't been in a room with you for 7 days/.test(l)), JSON.stringify(local));
ChatRoomCharacter = [Player, kay, olive, moe, sam];
storage.setKeyLock(KAY, "Kay");
// The locker holds full keys only as her BC owner: her owner's keys stay full.
storage.removeKeyholder(KAY);
Player.IsOwnedByCharacter = (c) => c?.MemberNumber === KAY;
storage.setOwnerKeyMode("full");
said = echs("keyholder", "owner moderate");
check("locker as owner: owner keys stay full", storage.getOwnerKeyMode() === "full" && /owner's keys stay full/.test(said), `full kept, got "${said}"`);
echs("reset", "confirm");
check("/echs reset confirm ends it", storage.getKeyLock() === null && !keylock.keyLocked(), "no lock");

// 5. The keyholder's side.
keyholder.resetKeyholderViews();
deliver(KAY, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyLock: "Olive" } });
check("who locked her is kept", keyholder.settingsOf(KAY)?.keyLock === "Olive", JSON.stringify(keyholder.settingsOf(KAY)));
deliver(KAY, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", keyLock: "" } });
check("  and unlocked reads as none", keyholder.settingsOf(KAY)?.keyLock === undefined, JSON.stringify(keyholder.settingsOf(KAY)));
hidden = [];
keyholder.requestLock(KAY);
keyholder.requestUnlock(KAY);
check("lock and unlock go as remote-request settings", hidden.filter((m) => m.to === KAY && m.type === "remote-request" && m.feature === "settings").map((m) => m.action).join() === "lock,unlock", JSON.stringify(hidden));

console.log(`keylock: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
