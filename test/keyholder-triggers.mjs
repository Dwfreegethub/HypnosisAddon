// A full keyholder sees what is planted in her, and may remove some of it (v1.16.2, job6.md §4).
// Each check says what failure looks like.
//
//   1. Only full keys get the list; it names the planter, says what each does, and shows the word
//      only to the one who planted it, or to anyone if she lets herself see her trigger words.
//      A trigger is named on the wire by a hash, never its word.
//   2. Removal (DW 2026-11-22): only if she trusts the keyholder MORE than the planter; never one she
//      planted in herself; never while it holds her; never under her Extreme lock; their own planting
//      they may always take back. Below full keys: refused. She is told who removed what.
//   3. The keyholder's side cleans what arrives.
const ME = 1, KAY = 200, HYP = 300, MOE = 400;
globalThis.Player = {
	MemberNumber: ME, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
	IsOwnedByCharacter: () => false,
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: KAY, Name: "Kay" }, { MemberNumber: HYP, Name: "Hyp" }, { MemberNumber: MOE, Name: "Moe" }];
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
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.CommandCombine = () => {};

const { keyholder, storage, messaging, remote, timers } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const req = (from, body) => { hidden = []; local = []; deliver(from, { type: "remote-request", feature: "settings", ...body }); return hidden.filter((m) => m.to === from).at(-1); };
const plant = (phrase, by, byName) => storage.saveTrigger({ key: phrase, phrase, actions: ["kneel"], installedBy: by, installedByName: byName, installedAt: Date.now(), plantedDepth: 80, plantedChemical: false, reinforcedAt: Date.now(), firings: 0 });
const has = (phrase) => storage.listTriggers().some((t) => t.phrase === phrase);
const listFor = (from) => req(from, { action: "read" })?.settings?.planted;
const id = (phrase) => keyholder.triggerId(phrase);
const remove = (from, phrase) => req(from, { action: "remove-trigger", id: id(phrase) });

storage.setFeature("hypnoEnabled", true);
storage.setFeature("showTriggerWords", false);
storage.setKeyholder(KAY, "Kay", "full");
storage.setKeyholder(MOE, "Moe", "moderate");
plant("ember glow", HYP, "Hyp");
plant("kay word", KAY, "Kay");
plant("my own", ME, "Missy");

// 1. The list.
let list = listFor(KAY);
check("full keys get the list", Array.isArray(list) && list.length === 3, `3 entries, got ${JSON.stringify(list)}`);
const hypEntry = list?.find((e) => e.by === "Hyp");
check("  someone else's word is hidden", hypEntry && hypEntry.word === "" && hypEntry.does.length === 1, `no word but what it does, got ${JSON.stringify(hypEntry)}`);
check("  their own word is shown", list?.find((e) => e.by === "Kay")?.word === "kay word", "kay word");
check("  hers says themselves", list?.some((e) => e.by === "themselves"), "planted by themselves");
check("  no word anywhere on the wire", !JSON.stringify(list).includes("ember") && !JSON.stringify(list).includes("my own"), `no hidden words, got ${JSON.stringify(list)}`);
check("  ids are hashes", list?.every((e) => /^[0-9a-f]{8}$/.test(e.id)) && hypEntry?.id === id("ember glow"), "8 hex each");
check("moderate keys get no list", listFor(MOE) === undefined, "no planted field");
storage.setFeature("showTriggerWords", true);
check("words shown when she shows herself hers", listFor(KAY)?.find((e) => e.by === "Hyp")?.word === "ember glow", "ember glow");
storage.setFeature("showTriggerWords", false);

// 2. Removal: trust.
check("equal trust: not removable", listFor(KAY)?.find((e) => e.by === "Hyp")?.removable === false, "not removable");
let r = remove(KAY, "ember glow");
check("  and refused", has("ember glow") && r?.settingsResult?.ok === false && /don't trust you more than Hyp/.test(r.settingsResult.text), `kept, got ${JSON.stringify(r?.settingsResult)}`);
storage.addInteractions(HYP, "Hyp", 20);
storage.addInteractions(KAY, "Kay", 10);
r = remove(KAY, "ember glow");
check("trusts the planter more: refused", has("ember glow") && r?.settingsResult?.ok === false, "kept");
storage.addInteractions(KAY, "Kay", 30);
check("trusts Kay more: removable", listFor(KAY)?.find((e) => e.by === "Hyp")?.removable === true, "removable");
r = remove(MOE, "ember glow");
check("moderate keys: refused", has("ember glow") && /needs full keys/.test(r?.settingsResult?.text ?? ""), `kept, got ${JSON.stringify(r?.settingsResult)}`);

// Holding her right now: refused, as her own forget is (the safeword is the way out of that).
timers.markActive(`trigger:${HYP}:ember glow`);
r = remove(KAY, "ember glow");
check("while it holds her: refused", has("ember glow") && /holding them right now/.test(r?.settingsResult?.text ?? ""), `kept, got ${JSON.stringify(r?.settingsResult)}`);
timers.clearActive(`trigger:${HYP}:ember glow`);

// Extreme first, while it would otherwise be allowed.
storage.startExtremeLock("trial", Date.now());
r = remove(KAY, "ember glow");
check("under Extreme: refused", has("ember glow") && /Extreme lock is on/.test(r?.settingsResult?.text ?? ""), `kept, got ${JSON.stringify(r?.settingsResult)}`);
check("  and shown as not removable", listFor(KAY)?.every((e) => e.removable === false), "none removable");
storage.clearExtremeLock();

r = remove(KAY, "ember glow");
check("removed", !has("ember glow") && r?.settingsResult?.ok === true, `gone, got ${JSON.stringify(r?.settingsResult)}`);
check("  she is told, without the hidden word", local.some((l) => /Kay \(your keyholder\) removed a trigger Hyp planted in you\./.test(l)) && !local.some((l) => l.includes("ember")), `a line, got ${JSON.stringify(local)}`);
check("  noted in her remote changes", storage.listRemoteChanges().some((c) => c.by === KAY && /removed a trigger/.test(c.what)), "noted");
check("  the reply carries the fresh list", r?.settings?.planted?.length === 2, `2 left, got ${JSON.stringify(r?.settings?.planted)}`);
r = remove(KAY, "ember glow");
check("again: no longer there", r?.settingsResult?.ok === false && /no longer there/.test(r.settingsResult.text), `gone already, got ${JSON.stringify(r?.settingsResult)}`);

// Her own, and Kay's own.
r = remove(KAY, "my own");
check("her own: refused", has("my own") && /planted this in themselves/.test(r?.settingsResult?.text ?? ""), `kept, got ${JSON.stringify(r?.settingsResult)}`);
storage.addInteractions(HYP, "Hyp", 200); // trust in Kay no longer beats Hyp, but Kay's own is Kay's
r = remove(KAY, "kay word");
check("their own planting: removable whatever the trust", !has("kay word") && r?.settingsResult?.ok === true, `gone, got ${JSON.stringify(r?.settingsResult)}`);
check("  she is told they took theirs back", local.some((l) => /removed a trigger they planted in you/.test(l)), JSON.stringify(local));

// A bad id.
r = req(KAY, { action: "remove-trigger", id: "my own" });
check("a word as the id: nothing", has("my own") && r?.settingsResult?.ok === false, "kept");

// 3. The keyholder's side.
keyholder.resetKeyholderViews();
deliver(KAY, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: { boxes: [], choices: [], extreme: false, mode: "grant", level: "full", planted: [
	{ id: "0a1b2c3d", word: "w".repeat(300), when: "", does: ["kneel", 5, "x".repeat(500)], strength: "full strength", once: "yes", holding: false, by: "Hyp", removable: true, why: "" },
	{ id: "not-hex!", word: "", does: [], by: "Bad" },
	null,
] } });
const got = keyholder.settingsOf(KAY)?.planted;
check("kept, cleaned", got?.length === 1 && got[0].word.length === 100 && got[0].does.length === 3 && got[0].does[1] === "" && got[0].does[2].length === 120 && got[0].once === false && got[0].removable === true, `one clean entry, got ${JSON.stringify(got)}`);
hidden = [];
keyholder.requestRemoveTrigger(KAY, "0a1b2c3d");
const sent = hidden.find((m) => m.to === KAY);
check("a removal goes as remote-request settings", sent?.type === "remote-request" && sent.feature === "settings" && sent.action === "remove-trigger" && sent.id === "0a1b2c3d", `the request, got ${JSON.stringify(sent)}`);

console.log(`keyholder-triggers: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
