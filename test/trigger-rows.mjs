// Trigger rows (v1.16.30, UI lab review F5; DW 2026-11-24: "the name of the tist should still be 1st"). Each
// row in /echs triggers, Settings > Planted and the popup reads "<who>: <what sets it off> → <what it does>
// · tags", so a subject can tell her triggers apart. Failure looks like the old rows: all alike.
const HYP = 246108, REI = 999, ZED = 555, OTHER_HYP = 424242;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }, { MemberNumber: REI, Name: "Rei" }, { MemberNumber: OTHER_HYP, Name: "Vex" }];
globalThis.ChatRoomData = { Name: "Somewhere" };
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
let toHyp = [];
globalThis.ServerSend = (type, data) => {
	const m = data?.Dictionary?.[0]?.message;
	if (type === "ChatRoomChat" && data?.Type === "Hidden" && m?.type === "trigger-status") toHyp.push(m.text);
};
const lastToHyp = () => toHyp[toHyp.length - 1] ?? "";
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.CharacterSetActivePose = () => {};
globalThis.ChatRoomSendEmote = () => {};
let said = [];
globalThis.ChatRoomSendLocal = (m) => said.push(String(m));
let spoken = [];
globalThis.ChatRoomSendChatMessage = (msg) => { spoken.push(msg); return true; };
const pendingTimers = [];
globalThis.setTimeout = (fn, ms = 0) => { pendingTimers.push({ fn, ms, live: true }); return pendingTimers.length; };
globalThis.clearTimeout = (id) => { if (typeof id === "number" && pendingTimers[id - 1]) pendingTimers[id - 1].live = false; };
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
const drainPaced = () => {
	for (let guard = 0; guard < 1000; guard++) {
		const i = pendingTimers.findIndex((t) => t.live && t.ms < 60_000);
		if (i < 0) return;
		pendingTimers[i].live = false;
		pendingTimers[i].fn();
	}
};

const { voice, storage, triggers, session, timers, popupSuggest } = await import("./harness-bundle.mjs");
// The things BC itself would do when an action is performed, which planting never reaches.
globalThis.ActivitySetArousal ??= () => {};
globalThis.ActivityExpression ??= () => {};
globalThis.CurrentTime ??= Date.now();

let pass = 0, fail = 0;
const check = (label, ok, failure) => {
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label} — expected ${failure}`);
};
globalThis.ActivityExpression ??= () => {};
for (const k of Object.keys(storage.getFeatures())) if (!/extreme|lock/i.test(k)) storage.setFeature(k, true);
storage.setFeature("showTriggerWords", false);
storage.setDropMode("unlimited");
storage.setTriggerScope("hypnotist");
const say = (line) => { voice.handleSpokenLine(HYP, line); drainPaced(); };
session.forceTrance(HYP, 80, 80);
say("Missy, when you hear sleepy doll, you will drop into trance");
say("Missy, remember trigger");
say("Missy, when anyone kisses you, kneel");
say("Missy, this trigger works once");
say("Missy, remember trigger");
say("Missy, whenever anyone gags you, put your hands behind your back");
say("Missy, this trigger holds while you wear it");
say("Missy, remember trigger");
say("Missy, your trigger word is velvet");
for (const s of ["kneel", "you cannot speak", "you cannot see", "you feel very aroused"]) say(`Missy, ${s}`);
say("Missy, remember trigger");
const all = () => voice.sweptTriggers();
const row = (n, reveal = false) => voice.triggerRow(all()[n], reveal, all());
const find = (re) => all().findIndex((t) => re.test(voice.triggerRow(t, true, all())));
check("four planted", all().length === 4, `4 triggers, got ${all().length}: ${toHyp.join(" | ").slice(0, 400)}`);

// Name first, then what sets it off → what it does.
const kiss = find(/kisses/), gag = find(/gags/), doll = find(/sleepy doll/), velvet = find(/velvet/);
check("name first", row(kiss).startsWith("GameBot: "), `"GameBot: …", got "${row(kiss)}"`);
check("a compulsion says its when and does", /when anyone kisses you → kneel/.test(row(kiss)), `"when anyone kisses you → kneel", got "${row(kiss)}"`);
check("  works once", / · works once/.test(row(kiss)), `" · works once", got "${row(kiss)}"`);
check("an item hold says so", /when anyone gags you → .* · holds while worn/.test(row(gag)), `"… · holds while worn", got "${row(gag)}"`);
// The word stays hidden unless she shows trigger words; what it does is shown.
check("the word is hidden", /^GameBot: a word \(hidden\) → you drop/.test(row(doll)) && !/sleepy/.test(row(doll)), `"a word (hidden) → you drop…", got "${row(doll)}"`);
check("  and shown when she asks", /^GameBot: "sleepy doll" → /.test(row(doll, true)), `"sleepy doll" in quotes, got "${row(doll, true)}"`);
check("the list follows her setting", !voice.describeTriggerList(false).some((l) => /sleepy doll/.test(l)), "no word in /echs triggers with the setting off");
// Long lists stay one line.
const extra = all()[velvet].actions.length - 2;
check("two actions then +N more", extra > 0 && row(velvet).includes(` +${extra} more`) && row(velvet).split(";").length === 2, `two named then "+${extra} more", got "${row(velvet)}"`);
// The strength is gone from the row, kept in the detail view.
check("no strength in the row", all().every((t) => !/full strength|\(\d+, /.test(voice.triggerRow(t, false, all()))), "no \"full strength (80, Blank)\" in any row");
check("  it is in the detail", /Strength now: full strength/.test(voice.describeTriggerDetail(kiss + 1, false).join(" ")), "the strength in /echs triggers <n>");
// Rows are told apart: no two the same.
const rows = all().map((t) => voice.triggerRow(t, false, all()));
check("no two rows the same", new Set(rows).size === rows.length, `distinct rows, got ${JSON.stringify(rows)}`);
// Two planters with one name: the number tells them apart.
const t0 = all()[kiss];
const twin = { ...t0, installedBy: OTHER_HYP };
check("same name: numbers shown", voice.triggerRow(t0, false, [t0, twin]).startsWith(`GameBot (#${HYP}): `), `"GameBot (#${HYP}): …", got "${voice.triggerRow(t0, false, [t0, twin])}"`);
check("  otherwise not", !/#/.test(row(kiss)), `no number, got "${row(kiss)}"`);
// Holding her now.
session.safeword();
storage.setDropMode("unlimited");
voice.handleSpokenLine(HYP, "velvet");
drainPaced();
check("holding you now", / · holding you now$/.test(row(find(/velvet/))), `" · holding you now", got "${row(find(/velvet/))}"`);

// "My triggers list" (v1.16.30, DW): Full, Who only, Hidden.
const { menu } = await import("./harness-bundle.mjs");
check("Full by default", storage.getTriggerView() === "full", `full, got ${storage.getTriggerView()}`);
storage.setTriggerView("who");
const whoRows = all().map((t) => voice.triggerRow(t, false, all()));
check("Who only: name first, then strength", whoRows.every((r) => /^GameBot: (full strength|\d+\/\d+|a vague|faded|expired)/.test(r)), `"GameBot: full strength…", got ${JSON.stringify(whoRows)}`);
check("  nothing of what they do", whoRows.every((r) => !/→|kneel|speak/.test(r)), `no "→" or actions, got ${JSON.stringify(whoRows)}`);
check("  the detail still says", /What it does:/.test(voice.describeTriggerDetail(1, false).join(" ")), "the detail view still available");
check("  the Planted tab stays", menu.visibleTabNames().includes("Planted"), `Planted shown, got ${menu.visibleTabNames()}`);
storage.setTriggerView("hidden");
const hiddenList = voice.describeTriggerList(false);
check("Hidden: a count only", hiddenList.length === 1 && /You have 4 triggers planted/.test(hiddenList[0]) && !/GameBot|kneel|→/.test(hiddenList[0]), `one count line, got ${JSON.stringify(hiddenList)}`);
check("  no detail", !/What it does|When:|Word:/.test(voice.describeTriggerDetail(1, false).join(" ")), `no detail, got ${JSON.stringify(voice.describeTriggerDetail(1, false))}`);
check("  no Planted tab", !menu.visibleTabNames().includes("Planted"), `no Planted, got ${menu.visibleTabNames()}`);
check("  a keyholder can change it", menu.remoteChoices().some((c) => c.key === "triggerView"), "triggerView among the keyholder choices");
session.safeword();
check("  the safeword still lets go", !all().some((t) => voice.isTriggerInEffect(t)), "nothing holding her after the safeword");
storage.setTriggerView("full");
check("back to Full: rows again", /→/.test(voice.describeTriggerList(false)[1] ?? ""), "the full rows back");

console.log(`trigger-rows: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
