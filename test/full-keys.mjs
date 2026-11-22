// Full keys reach further (v1.16.2, job6.md stage 3). Each check says what failure looks like.
//
//   1. Full keys set the Triggers tab's choices, trust fading and the Depth tab, through her own
//      setters; moderate and minimal keys are refused all of them and nothing changes.
//   2. Numbers (a depth, the trigger duration) take a whole number in range and nothing else.
//   3. Only the offered skill rungs; chemical reach only where she could open it herself.
//   4. Reset to defaults clears every depth she or anyone changed.
//   5. Her snapshot carries all of it, and the keyholder's side keeps more than the old 20.
const ME = 1, KAY = 200, MOE = 300, MIN = 400;
globalThis.Player = {
	MemberNumber: ME, Name: "Missy", Nickname: "", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 },
	Appearance: [{ Asset: { Name: "Emoticon", Group: { Name: "Emoticon" } }, Property: { Effect: [] } }],
	IsOwnedByCharacter: () => false,
};
globalThis.Asset = [{ Name: "Emoticon", AllowEffect: [] }];
globalThis.ChatRoomCharacter = [Player, { MemberNumber: KAY, Name: "Kay" }, { MemberNumber: MOE, Name: "Moe" }, { MemberNumber: MIN, Name: "Min" }];
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

const { keyholder, storage, messaging, remote, menu, depth } = await import("./harness-bundle.mjs");
remote.installRemote({ hookFunction: () => {} });

let pass = 0, fail = 0;
const check = (name, ok, failure) => { if (ok) pass++; else { fail++; console.log(`FAIL ${name} — expected ${failure}`); } };
const deliver = (from, message) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: from, Dictionary: [{ message }] });
const req = (from, body) => { hidden = []; local = []; deliver(from, { type: "remote-request", feature: "settings", ...body }); return hidden.filter((m) => m.to === from).at(-1); };
const choose = (from, key, value) => req(from, { action: "choose", key, value });
storage.setFeature("hypnoEnabled", true);
storage.setKeyholder(KAY, "Kay", "full");
storage.setKeyholder(MOE, "Moe", "moderate");
storage.setKeyholder(MIN, "Min", "minimal");

// 1. Full keys: each choice, through her setters.
let r = choose(KAY, "triggerScope", "friends");
check("full: who can fire triggers", storage.getTriggerScope() === "friends" && r?.settingsResult?.ok === true, `friends, got ${storage.getTriggerScope()} ${JSON.stringify(r?.settingsResult)}`);
check("  she is told who changed it", local.some((l) => /Kay \(your keyholder\) set Who else can fire triggers/.test(l)), `a line for her, got ${JSON.stringify(local)}`);
check("  and it is in her remote changes", storage.listRemoteChanges().some((c) => c.by === KAY && /Who else can fire/.test(c.what)), "a remote change noted");
choose(KAY, "triggerLifespan", "60");
check("full: trigger lifespan", storage.getTriggerLifespan() === 60, `60, got ${storage.getTriggerLifespan()}`);
choose(KAY, "triggerDecay", "fast");
check("full: trigger fade", storage.getTriggerDecayRate() === "fast", `fast, got ${storage.getTriggerDecayRate()}`);
choose(KAY, "dropTriggers", "once");
check("full: drop triggers", storage.getDropMode() === "once", `once, got ${storage.getDropMode()}`);
choose(KAY, "trustDecay", "slow");
check("full: trust fading", storage.getDecayRate() === "slow", `slow, got ${storage.getDecayRate()}`);
choose(KAY, "chemicalScope", "none");
check("full: chemicals count", storage.getChemicalScope() === "none", `none, got ${storage.getChemicalScope()}`);
choose(KAY, "skillHonour", "capped");
check("full: a hypnotist's skill", storage.getSkillHonour() === "capped", `capped, got ${storage.getSkillHonour()}`);
r = choose(KAY, "depth:sightControl", "55");
check("full: a depth", depth.requiredDepth("sightControl") === 55 && /now 55/.test(r?.settingsResult?.text ?? ""), `55, got ${depth.requiredDepth("sightControl")} ${JSON.stringify(r?.settingsResult)}`);
r = choose(KAY, "triggerDuration", "45");
check("full: trigger duration", storage.getTriggerDuration() === 45 && /45 min/.test(r?.settingsResult?.text ?? ""), `45, got ${storage.getTriggerDuration()}`);
choose(KAY, "reach:triggerControl", "arousal");
check("full: chemical reach on an earned-only gate", storage.getChemicalReach("triggerControl") === true, "opened");
choose(KAY, "reach:triggerControl", "earned");
check("  and back", storage.getChemicalReach("triggerControl") === false, "closed");

// Moderate and minimal: refused, nothing changes. Even the most closed option is not an "off".
for (const [who, name] of [[MOE, "moderate"], [MIN, "minimal"]]) {
	const cases = [
		["triggerScope", "hypnotist", () => storage.getTriggerScope(), "friends"],
		["triggerLifespan", "15", () => String(storage.getTriggerLifespan()), "60"],
		["triggerDecay", "never", () => storage.getTriggerDecayRate(), "fast"],
		["dropTriggers", "off", () => storage.getDropMode(), "once"],
		["trustDecay", "never", () => storage.getDecayRate(), "slow"],
		["chemicalScope", "both", () => storage.getChemicalScope(), "none"],
		["skillHonour", "ignore", () => storage.getSkillHonour(), "capped"],
		["depth:sightControl", "80", () => String(depth.requiredDepth("sightControl")), "55"],
		["triggerDuration", "0", () => String(storage.getTriggerDuration()), "45"],
		["depthDefaults", "defaults", () => String(depth.requiredDepth("sightControl")), "55"],
	];
	for (const [key, value, get, kept] of cases) {
		const res = choose(who, key, value);
		check(`${name}: ${key} refused`, get() === kept && res?.settingsResult?.ok === false && /needs full keys/.test(res.settingsResult.text), `${kept} kept and a needs-full refusal, got ${get()} ${JSON.stringify(res?.settingsResult)}`);
	}
}

// 2. Numbers: whole, plain, in range.
for (const bad of ["100", "-5", "4.5", "045", "1e1", "", "abc", " 50"]) {
	const res = choose(KAY, "depth:sightControl", bad);
	check(`depth "${bad}" refused`, depth.requiredDepth("sightControl") === 55 && res?.settingsResult?.ok === false, `55 kept, got ${depth.requiredDepth("sightControl")}`);
}
choose(KAY, "depth:sightControl", "0");
const atZero = depth.requiredDepth("sightControl");
choose(KAY, "depth:sightControl", "99");
check("depth 0 and 99 allowed", atZero === 0 && depth.requiredDepth("sightControl") === 99, `0 then 99, got ${atZero} then ${depth.requiredDepth("sightControl")}`);
r = choose(KAY, "triggerDuration", "1441");
check("duration past a day refused", storage.getTriggerDuration() === 45 && r?.settingsResult?.ok === false, "45 kept");
r = choose(KAY, "depth:notAGate", "10");
check("an unknown gate is unreachable", r?.settingsResult?.ok === false && /not something a keyholder can change/.test(r.settingsResult.text), `refused, got ${JSON.stringify(r?.settingsResult)}`);

// 3. The CNC skill rung is not offered; reach only on the two gates she could open herself.
r = choose(KAY, "skillHonour", "full");
check("skill can beat my resistance: refused", storage.getSkillHonour() === "capped" && r?.settingsResult?.ok === false, `capped kept, got ${storage.getSkillHonour()}`);
r = choose(KAY, "reach:carryForward", "arousal");
check("reach on carry-forward: unreachable", storage.getChemicalReach("carryForward") === false && r?.settingsResult?.ok === false, "refused");
r = choose(KAY, "reach:sightControl", "arousal");
check("reach on an ordinary gate: unreachable", r?.settingsResult?.ok === false, "refused");

// 4. Reset to defaults.
choose(KAY, "depth:speechRestriction", "70");
check("reads as changed", menu.remoteChoices().find((c) => c.key === "depthDefaults").get() === "changed", "changed");
r = choose(KAY, "depthDefaults", "defaults");
check("reset: every depth back", depth.requiredDepth("sightControl") === depth.DEPTH_GATES.find((g) => g.key === "sightControl").depth && depth.requiredDepth("speechRestriction") === 20, `defaults, got ${depth.requiredDepth("sightControl")}/${depth.requiredDepth("speechRestriction")}`);
check("  she is told plainly", local.some((l) => /Kay \(your keyholder\) reset your Depth requirements to their defaults/.test(l)), `a line, got ${JSON.stringify(local)}`);
r = choose(KAY, "depthDefaults", "defaults");
check("  again: already", r?.settingsResult?.ok === true && /already/.test(r.settingsResult.text), `already, got ${JSON.stringify(r?.settingsResult)}`);
r = choose(KAY, "depthDefaults", "changed");
check("  'changed' can't be picked", r?.settingsResult?.ok === false, "refused");

// 5. The snapshot, and the keyholder's side keeping it.
r = req(KAY, { action: "read" });
const sent = r?.settings?.choices ?? [];
const keysSent = new Set(sent.map((c) => c.key));
check("snapshot carries the new choices", ["triggerScope", "triggerDuration", "trustDecay", "depth:sightControl", "reach:triggerControl", "chemicalScope", "skillHonour", "depthDefaults"].every((k) => keysSent.has(k)), `all of them, got ${[...keysSent].join(",")}`);
check("  the old choices come first (a v1.16.1 keyholder keeps 20)", sent.slice(0, 11).every((c) => !/^(depth|reach):|trigger|trust|chemical|skill/.test(c.key)), `the original 11 first, got ${sent.slice(0, 11).map((c) => c.key).join(",")}`);
check("  fits the keyholder's 80", sent.length > 20 && sent.length <= 80 && sent.every((c) => c.key.length <= 40 && c.value.length <= 40), `21-80 short choices, got ${sent.length}`);
check("  every choice on a reachable tab", menu.remoteChoices().every((c) => menu.REMOTE_TABS.includes(c.tab)), "each tab in REMOTE_TABS");
deliver(KAY, { type: "state-response", version: "1.16.2", keyholder: "grant", keyLevel: "full", settings: r.settings });
check("the keyholder's side keeps them all", keyholder.settingsOf(KAY)?.choices.length === sent.length, `${sent.length}, got ${keyholder.settingsOf(KAY)?.choices.length}`);
const dur = menu.remoteChoices().find((c) => c.key === "triggerDuration");
check("labels: duration 0 reads as until released", menu.remoteChoiceLabel(dur, "0") === "until released", menu.remoteChoiceLabel(dur, "0"));
check("labels: a depth names its tier", /^40 \(.+\)$/.test(menu.remoteChoiceLabel(menu.remoteChoices().find((c) => c.key === "depth:sightControl"), "40")), "40 (tier)");

console.log(`full-keys: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
