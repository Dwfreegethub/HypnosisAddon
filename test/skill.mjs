// Hypnotist skill — "declared and visible", rungs 1-3 (declared-skill-proposal.md).
//
// The one thing rule #1 forbids is the subject's client acting on a number the hypnotist's
// client handed it. This feature obeys that literally: the claim travels, and the subject's
// own rung decides how much of it counts. Everything below drives the real handlers — an
// attempt delivered over the wire, honoured on receipt — rather than poking internals, so
// what is asserted is what a roll would actually use.
//
// Rung 4 ("full") is defined and honoured but NOT offered by the settings cycle yet; its feel
// depends on dual fatigue, which is unbuilt (§4). The cycle is pinned to three here.
const HYP = 246108;
globalThis.Player = { MemberNumber: 1, Name: "Missy", ExtensionSettings: {}, ArousalSettings: { Active: "Hybrid", Progress: 0 } };
globalThis.ChatRoomCharacter = [Player, { MemberNumber: HYP, Name: "GameBot" }];
globalThis.localStorage = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };
globalThis.ServerPlayerExtensionSettingsSync = () => {};
globalThis.ServerPlayerIsInChatRoom = () => true;
globalThis.ChatRoomSendLocal = () => {};
globalThis.CharacterSetActivePose = () => {};
const sent = [];
globalThis.ServerSend = (_t, data) => { const m = data?.Dictionary?.[0]?.message; if (m) sent.push(m); };

const { session, storage, messaging } = await import("./harness-bundle.mjs");
session.installSession();

let pass = 0, fail = 0;
const check = (label, got, want) => {
	const ok = JSON.stringify(got) === JSON.stringify(want);
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ${JSON.stringify(want)}\n    got  ${JSON.stringify(got)}`);
};
const near = (label, got, want, tol = 0.05) => {
	const ok = Math.abs(got - want) <= tol;
	ok ? pass++ : fail++;
	if (!ok) console.log(`  FAIL ${label}\n    want ~${want}\n    got  ${got}`);
};
const attempt = (skill) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-attempt", hypnotistName: "GameBot", skill } }] });
const update = (phase, attempts) => messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-update", phase, attempts } }] });

storage.setFeature("hypnoEnabled", true);

// --- the honour function, each rung ----------------------------------------------------------
check("ignore honours nothing", session.honourSkill("ignore", 80, 100), 0);
check("capped clamps to the stranger ceiling", session.honourSkill("capped", 80, 0), 30);
check("  and does not exceed the claim when the claim is small", session.honourSkill("capped", 12, 0), 12);
check("full honours the whole claim", session.honourSkill("full", 80, 0), 80);
near("trusted scales by how well she knows him", session.honourSkill("trusted", 80, 70), 56);
check("  a stranger on trusted gets nothing", session.honourSkill("trusted", 80, 0), 0);
check("an unknown rung honours nothing", session.honourSkill("nonsense", 80, 100), 0);

// --- the descriptor bands (placeholder prose; the band boundaries are what is pinned) --------
check("below 20, no read at all", session.skillDescriptor(19), null);
check("20-49 gives a read", /\S/.test(session.skillDescriptor(20) ?? ""), true);
check("  distinct from the 50-79 band", session.skillDescriptor(20) !== session.skillDescriptor(50), true);
check("  distinct from the 80+ band", session.skillDescriptor(50) !== session.skillDescriptor(80), true);
check("80 is the top band", /sit down/.test(session.skillDescriptor(80) ?? ""), true);

// --- the setting cycles the three OFFERED rungs only -----------------------------------------
check("default is rung 2", storage.getSkillHonour(), "trusted");
check("cycle: trusted -> capped", storage.nextSkillHonour("trusted"), "capped");
check("  capped -> ignore (wraps, three only)", storage.nextSkillHonour("capped"), "ignore");
check("  ignore -> trusted", storage.nextSkillHonour("ignore"), "trusted");
check("  rung 4 is never reached by the cycle", storage.nextSkillHonour("full"), "ignore");
storage.setSkillHonour("full"); // a hand-set rung 4 still sticks if chosen deliberately
check("rung 4 can still be set directly", storage.getSkillHonour(), "full");

// --- the roll honours the claim, per the subject's rung --------------------------------------
// Rung capped, stranger: 80 claimed -> honoured 30. §2b's worked row is fight ~10.5, and the
// Fight invariant ties it to Ignore rather than letting it beat it.
storage.setSkillHonour("capped");
attempt(80);
near("capped: fight lands where §2b says", session.inductionChance(HYP, "fight"), 10.5);
near("  and ignore is the bound it ties to", session.inductionChance(HYP, "ignore"), 10.5);
check("  fight never beats ignore", session.inductionChance(HYP, "fight") <= session.inductionChance(HYP, "ignore"), true);

// The one place skill must not reach: the earned depth excludes it entirely.
check("earned-only fight is skill-free (back to the floor)", session.inductionChance(HYP, "fight", true), 5);
near("  while full fight still carries the skill", session.inductionChance(HYP, "fight"), 10.5);

// Rung ignore: the same claim does nothing at all.
session.safeword();
storage.setSkillHonour("ignore");
attempt(80);
check("ignore: fight is the bare floor", session.inductionChance(HYP, "fight"), 5);
check("  the chances line shows no skill", session.describeChances(HYP).some((l) => /honoured skill/.test(l)), false);

// Rung capped again, and the chances line names the honoured read.
session.safeword();
storage.setSkillHonour("capped");
attempt(80);
check("the chances line reports the honoured read", session.describeChances(HYP).some((l) => /honoured skill .*30\/100/.test(l)), true);

// --- transmit: the derived value rides on the attempt this client sends ----------------------
session.safeword();
storage.addSkill(100); // a lot of practice
sent.length = 0;
session.requestAttempt(HYP);
const outbound = sent.find((m) => m.type === "session-attempt");
check("an attempt carries a skill value", typeof outbound?.skill, "number");
check("  and it is the sender's own derived skill", outbound.skill, storage.skillValue());

// --- accrual: the hypnotist earns skill from what the subject reports back -------------------
// Mirrors experience: every roll +0.25, a success +1 more. Driven by attempts climbing and a
// transition into Hypnotized, read off the session-update, so it cannot double-count.
storage.resetSettings();
storage.setFeature("hypnoEnabled", true);
check("no practice to start", storage.skillCount(), 0);
update("AttemptFailed", 1);
near("a failed attempt is worth 0.25", storage.skillCount(), 0.25);
update("AttemptFailed", 2);
near("  a second, another 0.25", storage.skillCount(), 0.5);
update("Hypnotized", 3);
near("  a success is the attempt plus one", storage.skillCount(), 1.75);
update("Hypnotized", 3); // a repeat push of the same state
near("  a repeated Hypnotized push credits nothing", storage.skillCount(), 1.75);
const refusals = storage.skillCount();
messaging.handleIncomingHidden({ Type: "Hidden", Content: "HypnoMsg", Sender: HYP, Dictionary: [{ message: { type: "session-update", phase: "Idle", attempts: 0 } }] });
near("  a refusal (attempts 0) credits nothing", storage.skillCount(), refusals);

console.log(`skill: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
