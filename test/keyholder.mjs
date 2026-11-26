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

const { keyholder, storage, messaging, session, remote, commands, menu, popup } = await import("./harness-bundle.mjs");
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
echs("owner minimal");
check("owner allowed: minimal", keyholder.keyModeFor(OWNER) === "minimal", `minimal for the owner, got ${keyholder.keyModeFor(OWNER)}`);
echs("owner off");
check("owner off again", keyholder.keyModeFor(OWNER) === null, "no key mode after owner off");
check("never herself", keyholder.keyModeFor(ME) === null, "no key mode for herself");

// Named, take.
let said = echs("add Kay");
check("add Kay: minimal", keyholder.keyModeFor(KAY) === "minimal" && /Kay is your keyholder/.test(said) && /end your Extreme lock/.test(said), `Kay as take, with the warning, got "${said}"`);
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
check("take: switch on refused", f().postureControl === false && r?.settingsResult?.ok === false && /needs full keys/.test(r.settingsResult.text), `posture still off and a refusal, got ${JSON.stringify(r?.settingsResult)}`);
// v1.16.37 (DW): minimal keys can switch things off, but not on the General tab.
storage.setFeature("showEchsIcon", true);
r = req(KAY, { action: "set", key: "showEchsIcon", value: false });
check("minimal: a General box off is refused", f().showEchsIcon === true && r?.settingsResult?.ok === false, `on kept, got ${JSON.stringify(r?.settingsResult)}`);
r = req(KAY, { action: "set", key: "extremeLockUntil", value: false });
check("unreachable key refused", /not something a keyholder can change/.test(r?.settingsResult?.text ?? ""), `a refusal for a key off the four tabs, got ${JSON.stringify(r?.settingsResult)}`);

// Grant.
echs("add Kay full");
check("Kay now full", keyholder.keyModeFor(KAY) === "full", "full");
storage.setFeature("commandPulse", false);
r = req(KAY, { action: "set", key: "commandPulse", value: true });
check("full: a General box works (v1.16.37)", f().commandPulse === true && r?.settingsResult?.ok === true, `on, got ${JSON.stringify(r?.settingsResult)}`);
storage.setFeature("commandPulse", false);
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
echs("owner full");
check("owner full", keyholder.keyModeFor(OWNER) === "full", "full for the owner");
check("named minimal stays minimal", keyholder.keyModeFor(KAY) === "minimal", "Kay minimal");

// 4. Extreme.
storage.startExtremeLock("trial", Date.now());
said = echs("remove Kay");
check("under Extreme: her list is read-only", keyholder.keyModeFor(KAY) === "minimal" && /Locked by Extreme/.test(said), `Kay kept and a refusal, got "${said}"`);
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

// 7. The Trance Defaults choices (v1.14.1): Kay is "take" here.
storage.setScreenEffect("heavy");
storage.setTranceEyes("Dizzy");
storage.setPulseColor("pink");
r = req(KAY, { action: "read" });
const sent7 = new Map((r?.settings?.choices ?? []).map((c) => [c.key, c.value]));
check("read: the four choices", sent7.get("screenEffect") === "heavy" && sent7.get("tranceEyes") === "Dizzy" && sent7.get("pulseColor") === "pink" && sent7.has("tranceEyeColor"), `the choices in the snapshot, got ${JSON.stringify(r?.settings?.choices)}`);
r = req(KAY, { action: "choose", key: "screenEffect", value: "light" });
check("take: a lighter spiral is refused", storage.getScreenEffect() === "heavy" && r?.settingsResult?.ok === false && /"None"/.test(r.settingsResult.text), `heavy kept and a refusal naming None, got ${JSON.stringify(r?.settingsResult)}`);
local = [];
r = req(KAY, { action: "choose", key: "screenEffect", value: "none" });
check("take: spiral off works", storage.getScreenEffect() === "none" && f().tranceScreenFade === false && r?.settingsResult?.ok === true, `screen effect none, got ${storage.getScreenEffect()} / ${JSON.stringify(r?.settingsResult)}`);
check("  she is told", local.some((l) => l.includes("Kay (your keyholder) set Screen effect to None")), `a line naming Kay, got ${JSON.stringify(local)}`);
check("  and it is logged", storage.listRemoteChanges().at(-1)?.what === "set Screen effect to None", `a log entry, got ${JSON.stringify(storage.listRemoteChanges().at(-1))}`);
r = req(KAY, { action: "choose", key: "tranceEyes", value: "" });
check("take: eyes back to Unchanged works", storage.getTranceEyes() === "" && r?.settingsResult?.ok === true, `eyes unchanged, got ${storage.getTranceEyes()}`);
r = req(KAY, { action: "choose", key: "pulseColor", value: "blue" });
check("take: pulse colour needs grant", storage.getPulseColor() === "pink" && /needs moderate keys/.test(r?.settingsResult?.text ?? ""), `pink kept, got ${JSON.stringify(r?.settingsResult)}`);
echs("add Kay full");
r = req(KAY, { action: "choose", key: "screenEffect", value: "medium" });
check("grant: spiral on works", storage.getScreenEffect() === "medium" && r?.settingsResult?.ok === true, `medium, got ${storage.getScreenEffect()}`);
r = req(KAY, { action: "choose", key: "pulseColor", value: "custom" });
check("custom pulse colour unreachable", storage.getPulseColor() === "pink" && r?.settingsResult?.ok === false, `pink kept, got ${JSON.stringify(r?.settingsResult)}`);
r = req(KAY, { action: "choose", key: "pulseColor", value: "blue" });
check("grant: pulse colour works", storage.getPulseColor() === "blue" && r?.settingsResult?.ok === true, "blue");
r = req(KAY, { action: "choose", key: "echsIconSpot", value: "off" });
check("other choices unreachable", /not something a keyholder can change/.test(r?.settingsResult?.text ?? ""), `a refusal, got ${JSON.stringify(r?.settingsResult)}`);
r = req(STRANGER, { action: "choose", key: "screenEffect", value: "none" });
check("a stranger cannot choose", storage.getScreenEffect() === "medium" && r?.settingsResult?.ok === false, "medium kept");
echs("add Kay");

// 8. The Inductions tab (v1.14.1): Kay is "take" again.
storage.setToyMode(true);
storage.setDeepestTier("blank");
storage.setDefaultStance("agree");
r = req(KAY, { action: "read" });
const sent8 = new Map((r?.settings?.choices ?? []).map((c) => [c.key, c.value]));
check("read: the Inductions choices", ["maxAttempts", "inductionSeconds", "defaultStance", "awayStance", "toyMode", "toyScope", "deepestTier"].every((k) => sent8.has(k)) && sent8.get("toyMode") === "on" && sent8.get("deepestTier") === "blank", `all seven, got ${JSON.stringify(r?.settings?.choices)}`);
check("  every choice belongs to a reachable tab", menu.remoteChoices().every((c) => menu.REMOTE_TABS.includes(c.tab)), "Inductions or Trance Defaults");
r = req(KAY, { action: "choose", key: "toyMode", value: "off" });
check("take: toy mode off works", storage.getToyMode() === false && r?.settingsResult?.ok === true, `toy mode off, got ${JSON.stringify(r?.settingsResult)}`);
r = req(KAY, { action: "choose", key: "toyMode", value: "on" });
check("take: toy mode on refused", storage.getToyMode() === false && r?.settingsResult?.ok === false, "toy mode stays off");
r = req(KAY, { action: "choose", key: "deepestTier", value: "deep" });
check("take: Blank to Deep refused", storage.getDeepestTier() === "blank" && /"Never deeper"/.test(r?.settingsResult?.text ?? ""), `blank kept, got ${JSON.stringify(r?.settingsResult)}`);
r = req(KAY, { action: "choose", key: "deepestTier", value: "never" });
check("take: Never deeper works", storage.getDeepestTier() === "never", `never, got ${storage.getDeepestTier()}`);
r = req(KAY, { action: "choose", key: "defaultStance", value: "prompt" });
check("take: back to Ask me works", storage.getDefaultStance() === "prompt", `prompt, got ${storage.getDefaultStance()}`);
r = req(KAY, { action: "choose", key: "inductionSeconds", value: "10" });
check("take: induction time needs grant", storage.getInductionSeconds() === 60 && /needs moderate keys/.test(r?.settingsResult?.text ?? ""), `60 kept, got ${JSON.stringify(r?.settingsResult)}`);
echs("add Kay full");
r = req(KAY, { action: "choose", key: "inductionSeconds", value: "10" });
check("grant: induction time works", storage.getInductionSeconds() === 10 && r?.settingsResult?.ok === true, `10, got ${storage.getInductionSeconds()}`);
r = req(KAY, { action: "choose", key: "maxAttempts", value: "3" });
check("grant: attempts works", storage.getMaxAttempts() === 3, `3, got ${storage.getMaxAttempts()}`);
r = req(KAY, { action: "choose", key: "maxAttempts", value: "99" });
check("an attempt count off the list refused", storage.getMaxAttempts() === 3 && r?.settingsResult?.ok === false, "3 kept");
r = req(KAY, { action: "choose", key: "toyScope", value: "everyone" });
check("grant: toy mode is for works", storage.getToyScope() === "everyone" && r?.settingsResult?.ok === true, `everyone, got ${storage.getToyScope()}`);
local = [];
r = req(KAY, { action: "choose", key: "toyMode", value: "on" });
check("grant: toy mode on works, and she is told", storage.getToyMode() === true && local.some((l) => l.includes("Kay (your keyholder) set Toy mode to On")), `on and told, got ${JSON.stringify(local)}`);
echs("add Kay");

// 9. Three levels (v1.16.0, job6.md §1). Moderate shapes the trance: Trance Defaults and Awareness
// boxes on, and the choices marked moderate; not Permissions, Triggers boxes, toy mode or auto-answer.
said = echs("add Kay moderate");
check("add Kay moderate", keyholder.keyModeFor(KAY) === "moderate" && /moderate keys/.test(said), `moderate, got "${said}"`);
hidden = [];
deliver(KAY, { type: "state-query" });
check("  the answer says moderate, and grant for an older keyholder", lastTo(KAY)?.keyLevel === "moderate" && lastTo(KAY)?.keyholder === "grant", `keyLevel moderate + keyholder grant, got ${JSON.stringify(lastTo(KAY))}`);
storage.setFeature("tranceCannotSpeak", false);
r = req(KAY, { action: "set", key: "tranceCannotSpeak", value: true });
check("moderate: a Trance Defaults box on works", f().tranceCannotSpeak === true && r?.settingsResult?.ok === true, `on, got ${JSON.stringify(r?.settingsResult)}`);
storage.setFeature("suppressBondage", false);
r = req(KAY, { action: "set", key: "suppressBondage", value: true });
check("moderate: an Awareness box on works", f().suppressBondage === true, "on");
storage.setFeature("postureControl", false);
r = req(KAY, { action: "set", key: "postureControl", value: true });
check("moderate: a Permissions box on is refused", f().postureControl === false && /needs full keys/.test(r?.settingsResult?.text ?? ""), `off kept, got ${JSON.stringify(r?.settingsResult)}`);
storage.setFeature("selfTrigger", false);
r = req(KAY, { action: "set", key: "selfTrigger", value: true });
check("moderate: a Triggers box on is refused", f().selfTrigger === false, "off kept");
r = req(KAY, { action: "set", key: "tranceCannotSpeak", value: false });
check("moderate: switching off still works", f().tranceCannotSpeak === false, "off");
// v1.16.37 (DW): the General tab is full keys only, switching off included. Failure: a moderate (or
// minimal) keyholder turns off her "release if you disconnect" or her ECHS spiral.
storage.setFeature("releaseOnDisconnect", true);
r = req(KAY, { action: "set", key: "releaseOnDisconnect", value: false });
check("moderate: a General box off is refused", f().releaseOnDisconnect === true && /General tab, which needs full keys/.test(r?.settingsResult?.text ?? ""), `on kept, got ${JSON.stringify(r?.settingsResult)}`);
storage.setFeature("commandPulse", false);
r = req(KAY, { action: "set", key: "commandPulse", value: true });
check("moderate: a General box on is refused", f().commandPulse === false, "off kept");
check("General's boxes are offered to keyholders, on the General tab", ["releaseOnDisconnect", "commandPulse", "showEchsIcon"].every((k) => menu.remoteRows().find((r) => r.key === k)?.tab === "General"), "all three under General");
check("  and nothing else is", menu.remoteRows().filter((r) => r.tab === "General").length === 3, "three");
r = req(KAY, { action: "choose", key: "inductionSeconds", value: "30" });
check("moderate: induction time works", storage.getInductionSeconds() === 30, `30, got ${storage.getInductionSeconds()}`);
r = req(KAY, { action: "choose", key: "deepestTier", value: "deep" });
check("moderate: sink deeper works", storage.getDeepestTier() === "deep", `deep, got ${storage.getDeepestTier()}`);
r = req(KAY, { action: "choose", key: "screenEffect", value: "heavy" });
check("moderate: the spiral works", storage.getScreenEffect() === "heavy", "heavy");
storage.setToyMode(false);
r = req(KAY, { action: "choose", key: "toyMode", value: "on" });
check("moderate: toy mode on is refused", storage.getToyMode() === false && /needs full keys/.test(r?.settingsResult?.text ?? ""), `off kept, got ${JSON.stringify(r?.settingsResult)}`);
storage.setDefaultStance("prompt");
r = req(KAY, { action: "choose", key: "defaultStance", value: "agree" });
check("moderate: auto-Agree is refused", storage.getDefaultStance() === "prompt", "Ask me kept");
storage.setToyScope("lovers");
r = req(KAY, { action: "choose", key: "toyScope", value: "everyone" });
check("moderate: who toy mode is for is refused", storage.getToyScope() === "lovers" && r?.settingsResult?.ok === false, `lovers kept, got ${JSON.stringify(r?.settingsResult)}`);
{
	const table = [
		keyholder.keyLevelAllows("minimal", true, false), keyholder.keyLevelAllows("minimal", false, true),
		keyholder.keyLevelAllows("moderate", false, true), keyholder.keyLevelAllows("moderate", false, false),
		keyholder.keyLevelAllows("full", false, false),
	].join();
	check("levels: keyLevelAllows table", table === "true,false,true,false,true", `off for all, moderate only where moderateOk, full everything; got ${table}`);
}

// Conversion: v1.14's saved words (DW: take -> minimal, grant -> MODERATE).
// Saved exactly as v1.14 wrote them (the setters store what they are given; this is plain JS).
storage.setKeyholder(KAY, "Kay", "take");
storage.setKeyholder(STRANGER, "Sam", "grant");
storage.setOwnerKeyMode("grant");
check("saved take reads as minimal", storage.listKeyholders().find((k) => k.id === KAY)?.mode === "minimal", "minimal");
check("saved grant reads as moderate", storage.listKeyholders().find((k) => k.id === STRANGER)?.mode === "moderate", "moderate");
check("saved owner grant reads as moderate", storage.getOwnerKeyMode() === "moderate", `moderate, got ${storage.getOwnerKeyMode()}`);
check("typed take/grant still work", storage.toKeyMode("take") === "minimal" && storage.toKeyMode("grant") === "moderate" && storage.toKeyMode("bogus") === null, "the old words map; others refused");
storage.removeKeyholder(STRANGER);
echs("owner full"); // as the sections below expect

// The popup's cycling "Give keys" button (job6.md §2): label = what a click types; a repeat click
// moves on, wrapping; someone who holds keys starts one above.
popup.resetKeyCycle();
check("cycle: nobody starts at minimal", popup.cycleLevel("500", null) === "minimal", "minimal");
const clicks = [popup.clickCycle("500", null), popup.clickCycle("500", null), popup.clickCycle("500", null), popup.clickCycle("500", null)];
check("cycle: repeat clicks go minimal, moderate, full, minimal", clicks.join() === "minimal,moderate,full,minimal", `the cycle, got ${clicks.join()}`);
check("cycle: a holder starts one above", popup.cycleLevel("501", "moderate") === "full", "full");
check("cycle: another button's first click types its own label", popup.clickCycle("501", "moderate") === "full", "full, not advanced");
echs("add Kay");

// Remove.
said = echs("remove Kay");
check("remove Kay", keyholder.keyModeFor(KAY) === null && /Removed/.test(said), `Kay gone, got "${said}"`);
check("  Kay is told she no longer holds keys", hidden.some((m) => m.to === KAY && m.keyholder === "none"), "a state-response saying none");
said = echs("");
check("bare command lists", /BC owner holds your keys \(full\)/.test(said) && /Nobody else holds your keys/.test(said), `the list, got "${said}"`);

// 6. Keyholder side.
keyholder.resetKeyholderViews();
deliver(KAY, { type: "state-response", version: "1.14.0", keyholder: "grant" });
check("we hold Kay's keys", keyholder.heldKeys().map((h) => `${h.id}:${h.mode}`).join() === `${KAY}:full`, `Kay full (an older subject's grant), got ${JSON.stringify(keyholder.heldKeys())}`);
deliver(KAY, { type: "state-response", version: "1.14.0", keyholder: "grant", settings: { boxes: [{ key: "sightControl", on: true }, { key: "x".repeat(99), on: true }, null], extreme: true, mode: "grant" } });
const snap = keyholder.settingsOf(KAY);
check("snapshot kept, cleaned", snap?.boxes.length === 1 && snap.boxes[0].key === "sightControl" && snap.extreme === true, `one clean box, got ${JSON.stringify(snap)}`);
check("  an older subject's snapshot has no choices", Array.isArray(snap?.choices) && snap.choices.length === 0, `no choices, got ${JSON.stringify(snap?.choices)}`);
deliver(KAY, { type: "state-response", version: "1.14.1", keyholder: "grant", settings: { boxes: [], choices: [{ key: "screenEffect", value: "heavy" }, { key: "tranceEyes", value: 7 }, { key: "y".repeat(99), value: "" }], extreme: false, mode: "grant" } });
check("choices kept, cleaned", JSON.stringify(keyholder.settingsOf(KAY)?.choices) === JSON.stringify([{ key: "screenEffect", value: "heavy" }]), `one clean choice, got ${JSON.stringify(keyholder.settingsOf(KAY)?.choices)}`);
hidden = [];
keyholder.requestChoice(KAY, "screenEffect", "none");
check("a choice goes as remote-request settings", JSON.stringify(lastTo(KAY)) === JSON.stringify({ to: KAY, type: "remote-request", feature: "settings", action: "choose", key: "screenEffect", value: "none" }), `the request, got ${JSON.stringify(lastTo(KAY))}`);
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
