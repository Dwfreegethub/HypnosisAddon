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

// --- rung "floored", the v0.75.0 default: max(trusted, capped) -------------------------------
// The two halves of DW's ask, stated as checks that can each fail on their own.
//
// HALF ONE — a stranger is no longer worth zero. This is the whole point: rung 2 multiplies
// the claim by a trust that a new pair does not have, so the ladder used to be invisible on a
// first meeting.
check("floored: a stranger gets the capped value, not nothing", session.honourSkill("floored", 80, 0), 30);
check("  which is strictly more than the old default gave", session.honourSkill("floored", 80, 0) > session.honourSkill("trusted", 80, 0), true);

// HALF TWO — it must never LOWER anything. Two ways that could have gone wrong, both pinned:
// a plain switch to rung 3 would cut a trusted expert from 80 to 30, and a claim of zero must
// stay exactly zero so an unskilled hypnotist is no worse off than before the ladder existed.
check("floored: an established pair keeps the FULL claim", session.honourSkill("floored", 80, 100), 80);
check("  where a plain capped rung would have cut it to the ceiling", session.honourSkill("capped", 80, 100), 30);
near("  and mid-trust takes the larger of the two", session.honourSkill("floored", 80, 70), 56);
check("no skill is still no skill — never a penalty", session.honourSkill("floored", 0, 0), 0);
check("  and a tiny claim is worth exactly itself, not less", session.honourSkill("floored", 3, 0), 3);

// The sweep the two checks above are only samples of: across every claim and every trust,
// "floored" is never below EITHER rung it is built from. Without the Math.max this fails.
let flooredViolations = [];
for (const claim of [0, 1, 3, 12, 29, 30, 31, 50, 80, 99, 100]) {
	for (const trust of [0, 1, 12.5, 29, 30, 31, 50, 75, 99, 100]) {
		const f = session.honourSkill("floored", claim, trust);
		if (f < session.honourSkill("trusted", claim, trust) - 1e-9) flooredViolations.push(`below trusted at claim=${claim} trust=${trust}`);
		if (f < session.honourSkill("capped", claim, trust) - 1e-9) flooredViolations.push(`below capped at claim=${claim} trust=${trust}`);
		if (f > claim + 1e-9) flooredViolations.push(`above the claim at claim=${claim} trust=${trust}`);
	}
}
check("floored is never below either rung it is built from, and never above the claim", flooredViolations, []);

// --- the descriptor bands (placeholder prose; the band boundaries are what is pinned) --------
check("below 20, no read at all", session.skillDescriptor(19), null);
check("20-49 gives a read", /\S/.test(session.skillDescriptor(20) ?? ""), true);
check("  distinct from the 50-79 band", session.skillDescriptor(20) !== session.skillDescriptor(50), true);
check("  distinct from the 80+ band", session.skillDescriptor(50) !== session.skillDescriptor(80), true);
check("80 is the top band", /sit down/.test(session.skillDescriptor(80) ?? ""), true);

// --- the setting cycles the OFFERED rungs only ------------------------------------------------
check("default is 'floored' as of v0.75.0", storage.getSkillHonour(), "floored");
check("  and 'trusted' is still offered, so an explicit choice survives", storage.SKILL_HONOUR_OFFERED.some((r) => r.key === "trusted"), true);
check("cycle: trusted -> capped", storage.nextSkillHonour("trusted"), "capped");
check("  capped -> floored", storage.nextSkillHonour("capped"), "floored");
check("  floored -> ignore (wraps, four only)", storage.nextSkillHonour("floored"), "ignore");
check("  ignore -> trusted", storage.nextSkillHonour("ignore"), "trusted");
check("the CNC rung is never reached by the cycle", storage.nextSkillHonour("full"), "ignore");
check("  and is not in the offered list", storage.SKILL_HONOUR_OFFERED.some((r) => r.key === "full"), false);
storage.setSkillHonour("full"); // a hand-set CNC rung still sticks if chosen deliberately
check("the CNC rung can still be set directly", storage.getSkillHonour(), "full");
// Every offered rung has a label, or the settings button falls back to a hard-coded string
// and silently misreports which rung the player is on.
check("every rung carries a label", storage.SKILL_HONOUR_RUNGS.every((r) => typeof r.label === "string" && r.label.length > 0), true);

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

// --- the default rung, end to end: what a first meeting actually costs now --------------------
// The claim arrives over the wire and the roll is read back, rather than calling honourSkill()
// directly — this is the path that has to move, and it is the number DW asked to see.
//
// Zero trust, zero experience, no relationship, arousal off. Agree was 25 flat before v0.75.0.
// An expert claiming 80 is honoured at the ceiling 30, worth 30 * SKILL_ADDITIVE_WEIGHT = 10.5.
session.safeword();
storage.setSkillHonour("floored");
attempt(80);
near("default rung: a skilled stranger now moves Agree to 35.5", session.inductionChance(HYP, "agree"), 35.5);

// The same attempt from someone with NO practice must land exactly where it did before the
// ladder existed. This is the check that would catch a skill term that subtracts.
session.safeword();
attempt(0);
check("an unskilled stranger is unchanged at 25", session.inductionChance(HYP, "agree"), 25);
check("  and the chances line says nothing about skill", session.describeChances(HYP).some((l) => /honoured skill/.test(l)), false);

// Rule 4 holds through all of it: skill reaches depthFull and never depthEarned, so a stranger
// winning on declared skill still cannot plant anything that outlives the session.
session.safeword();
attempt(80);
check("the earned chance ignores skill entirely", session.inductionChance(HYP, "agree", true), 25);
near("  while the full chance carries it", session.inductionChance(HYP, "agree"), 35.5);
session.safeword();
storage.setSkillHonour("floored");

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

// --- /hypno chance explains WHY skill is absent, rather than going silent --------------------
// DW ran `!skill 80` then `/hypno chance` idle, saw no skill line, and it read as broken. The
// claim rides in on the attempt, so idle there is nothing to honour — but silence about that is
// a silent omission that looks like a failure (rule 5).
session.safeword();
storage.resetSettings();
storage.setFeature("hypnoEnabled", true);
storage.setSkillHonour("trusted");
check("idle, no attempt: chance says skill waits for an attempt",
	session.describeChances(HYP).some((l) => /not counted until someone attempts/.test(l)), true);
storage.setSkillHonour("ignore");
check("idle on rung Ignore: chance says it is ignored, not pending",
	session.describeChances(HYP).some((l) => /ignored by your setting/.test(l)), true);
// Mid-attempt the note is gone and the honoured line (or nothing, on Ignore) stands instead.
storage.setSkillHonour("capped");
attempt(80);
check("mid-attempt: no 'waits for an attempt' note",
	session.describeChances(HYP).some((l) => /not counted until someone attempts/.test(l)), false);
check("  the honoured line is there instead",
	session.describeChances(HYP).some((l) => /honoured skill/.test(l)), true);
session.safeword();

console.log(`skill: ${pass}/${pass + fail} passed`);
if (fail) process.exit(1);
