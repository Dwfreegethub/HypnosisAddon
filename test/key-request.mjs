// Asking for someone's keys (v1.16.1, job6.md §3). Each check says what failure looks like.
//
//   1. The popup (ask.ts): Accept, Decline, and no answer in 30 s is a Decline; one at a time.
//   2. Her side decides (rule 1): nothing changes unless she clicks Accept; one ask per person every
//      few minutes; refused under her own locks (and she is told it came); refused when they already
//      hold that much; the level is checked.
//   3. The asker's side: only people whose ECHS can answer; a short wait between asks; the answer is
//      said in chat; /echs keyholder request types through to the same path.
const ME = 1, KAY = 200, OLIVE = 300, SAM = 400, OLD = 500;
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
const kay = { MemberNumber: KAY, Name: "Kay" }, olive = { MemberNumber: OLIVE, Name: "Olive" }, sam = { MemberNumber: SAM, Name: "Sam" }, old = { MemberNumber: OLD, Name: "Oldie" };
globalThis.ChatRoomCharacter = [Player, kay, olive, sam, old];
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

const { keyholder, storage, messaging, remote, commands, ask, badge } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });
commands.installCommands();

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const lastTo = (who) => hidden.filter((m) => m.to === who).at(-1);
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const box = () => document.getElementById(ask.ASK_ID);
const button = (label) => { const find = (n) => (n.tagName === "BUTTON" && n.textContent === label ? n : n.children.map(find).find(Boolean)); return box() ? find(box()) : null; };
const askFor = (from, level) => { hidden = []; local = []; deliver(from, { type: "remote-request", feature: "settings", action: "request-keys", level }); };
const echs = (args) => { local = []; registered.find((c) => c.Tag === "echs").Subcommands.find((s) => s.Tag === "keyholder").Action(args); return local.join(" | "); };
storage.setFeature("hypnoEnabled", true);

// 1-2. Kay asks for moderate keys; Missy accepts.
askFor(KAY, "moderate");
check("a request shows the popup", !!box() && /Kay asks for your keys/.test(box().textContent) && /moderate keys/.test(box().textContent), `a box naming Kay and moderate, got ${box()?.textContent}`);
check("  with the countdown", /No answer in 30 s declines/.test(box()?.textContent ?? ""), "the 30 s countdown");
check("  and nothing changed yet", keyholder.keyModeFor(KAY) === null, "no keys before she answers");
check("  and no answer sent yet", hidden.length === 0, `nothing sent to Kay yet, got ${JSON.stringify(hidden)}`);
button("Give moderate keys").click();
await settle();
check("Accept: Kay holds moderate keys", keyholder.keyModeFor(KAY) === "moderate", `moderate, got ${keyholder.keyModeFor(KAY)}`);
check("  the box is gone", !box(), "no box");
check("  Kay is told it worked", hidden.some((m) => m.to === KAY && m.keyRequestResult?.ok === true && /gave you moderate keys/.test(m.keyRequestResult.text)), `a result to Kay, got ${JSON.stringify(hidden)}`);
check("  and that she holds the keys", hidden.some((m) => m.to === KAY && m.keyLevel === "moderate"), "a keyLevel announcement");
check("  Missy is told what she gave", local.some((l) => /You gave Kay moderate keys/.test(l)), `a line for Missy, got ${JSON.stringify(local)}`);

// Asking for what they already hold, or less.
askFor(KAY, "minimal");
check("already holds that much: refused, no box", !box() && /already hold their keys \(moderate\)/.test(lastTo(KAY)?.keyRequestResult?.text ?? ""), `a refusal, got ${JSON.stringify(lastTo(KAY))}`);

// Decline.
askFor(OLIVE, "full");
check("Olive's request shows", /Olive asks/.test(box()?.textContent ?? ""), "a box for Olive");
// One at a time: Sam asks while Olive's box is up.
askFor(SAM, "minimal");
check("busy: a second request is refused", /answering another question/.test(lastTo(SAM)?.keyRequestResult?.text ?? "") && /Olive asks/.test(box()?.textContent ?? ""), `Sam told to wait and Olive's box kept, got ${JSON.stringify(lastTo(SAM))}`);
hidden = [];
button("Decline").click();
await settle();
check("Decline: no keys", keyholder.keyModeFor(OLIVE) === null && !box(), "Olive holds nothing");
check("  Olive is told", lastTo(OLIVE)?.keyRequestResult?.ok === false && /declined/.test(lastTo(OLIVE).keyRequestResult.text), `declined, got ${JSON.stringify(lastTo(OLIVE))}`);
// Too soon.
askFor(OLIVE, "full");
check("asking again at once is refused", !box() && /asked them recently/.test(lastTo(OLIVE)?.keyRequestResult?.text ?? ""), `too soon, got ${JSON.stringify(lastTo(OLIVE))}`);

// No answer: a Decline after 30 s.
askFor(SAM, "minimal");
check("Sam's request shows", /Sam asks/.test(box()?.textContent ?? ""), "a box for Sam");
ask.tickAsk(Date.now() + 10_000);
check("  the countdown moves", /No answer in 2\d s/.test(box()?.textContent ?? ""), `about 20 s left, got ${box()?.textContent}`);
hidden = []; local = [];
ask.tickAsk(Date.now() + ask.ASK_TIMEOUT_MS + 1);
await settle();
check("no answer in 30 s: declined, nothing given", !box() && keyholder.keyModeFor(SAM) === null, "no box, no keys");
check("  Sam is told it timed out", /didn't answer in time/.test(lastTo(SAM)?.keyRequestResult?.text ?? ""), `timed out, got ${JSON.stringify(lastTo(SAM))}`);
check("  Missy is told", local.some((l) => /timed out/.test(l)), `a line for Missy, got ${JSON.stringify(local)}`);

// Her locks: refused, and she is told.
keyholder.resetKeyholderViews();
storage.startExtremeLock("trial", Date.now());
askFor(SAM, "minimal");
check("under Extreme: refused, no box", !box() && /settings are locked/.test(lastTo(SAM)?.keyRequestResult?.text ?? ""), `locked, got ${JSON.stringify(lastTo(SAM))}`);
check("  and she is told it came", local.some((l) => /Sam asked for your keys/.test(l)), `a line, got ${JSON.stringify(local)}`);
storage.clearExtremeLock();
// A lock that begins while the box is up.
askFor(SAM, "minimal");
storage.startExtremeLock("trial", Date.now());
button("Give minimal keys").click();
await settle();
check("a lock begun mid-question: nothing given", keyholder.keyModeFor(SAM) === null && /locked before they could answer/.test(lastTo(SAM)?.keyRequestResult?.text ?? ""), `no keys, got ${JSON.stringify(lastTo(SAM))}`);
storage.clearExtremeLock();

// A level that is not one.
keyholder.resetKeyholderViews();
askFor(SAM, "grant");
check("an old or unknown level word is refused", !box() && /did not make sense/.test(lastTo(SAM)?.keyRequestResult?.text ?? ""), `refused, got ${JSON.stringify(lastTo(SAM))}`);

// 3. The asker's side.
keyholder.resetKeyholderViews();
badge.notePeer(SAM, { type: "state-response", version: "1.16.1" });
badge.notePeer(OLD, { type: "state-response", version: "1.16.0" });
check("can ask someone on 1.16.1", keyholder.canRequestKeys(SAM) === true, "true");
check("can't ask someone on an older ECHS", keyholder.canRequestKeys(OLD) === false && keyholder.canRequestKeys(KAY) === false, "false for 1.16.0 and for unknown");
hidden = [];
let said = keyholder.requestKeys(SAM, "full");
check("asking sends one remote-request", /Asked Sam for full keys/.test(said) && lastTo(SAM)?.action === "request-keys" && lastTo(SAM)?.level === "full" && lastTo(SAM)?.feature === "settings", `the request, got ${said} / ${JSON.stringify(lastTo(SAM))}`);
hidden = [];
said = keyholder.requestKeys(SAM, "full");
check("  a second ask at once is held back", /asked Sam recently/.test(said) && hidden.length === 0, `held back, got ${said}`);
said = keyholder.requestKeys(OLD, "minimal");
check("  an older ECHS is told, not sent", /need v1\.16\.1 or newer/.test(said), `a note, got ${said}`);
local = [];
deliver(SAM, { type: "state-response", version: "1.16.1", keyRequestResult: { ok: false, text: "Sam declined." } });
check("the answer is said in chat", local.some((l) => /Sam: Sam declined\./.test(l)), `a chat line, got ${JSON.stringify(local)}`);
check("  and kept for the Keys tab", keyholder.lastResult(SAM)?.text === "Sam declined.", "the result kept");
keyholder.resetKeyholderViews();
badge.notePeer(SAM, { type: "state-response", version: "1.16.1" });
hidden = [];
said = echs("request Sam moderate");
check("/echs keyholder request sends it", /Asked Sam for moderate keys/.test(said) && lastTo(SAM)?.level === "moderate", `sent, got ${said}`);
said = echs("request Nobody");
check("  an unknown name is said", /No one here matches/.test(said), `a note, got ${said}`);
storage.startExtremeLock("trial", Date.now());
keyholder.resetKeyholderViews();
badge.notePeer(SAM, { type: "state-response", version: "1.16.1" });
said = echs("request Sam");
check("  asking is not held by your own Extreme lock", /Asked Sam for minimal keys/.test(said), `sent at minimal, got ${said}`);
storage.clearExtremeLock();

console.log(`key-request: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
