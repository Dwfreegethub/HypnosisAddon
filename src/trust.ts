import { log } from "./log";
import {
	addInteractions,
	addExperience,
	trustWith,
	experienceValue,
	listTrust,
	getRelationshipOverride,
	RelationKind,
} from "./storage";
import { H_TRUST, valueFromCount } from "./curve";

// Trust accrual — the slow path. Conversation in the same room builds trust with the
// person you're talking to, rate-limited so intensity doesn't matter, only duration.
//
// Settled in the design doc: one interaction = one message from that person, at most one
// per 5 MINUTES per pair. Twelve an hour, so ~2 hours of conversation reaches trust 50 and
// ~19 hours reaches 90. The limit was originally sketched at 15 minutes and shortened to 5
// because the same curve then arrives in three times as many smaller steps — trust drifts
// up smoothly instead of jumping ~5 points at a time.

const RATE_LIMIT_MS = 5 * 60_000;

/** A message that names us, or is whispered to us, is aimed at us rather than the room —
 * the doc's "messages directed at each other count more than ambient chat". Worth double,
 * still inside the same rate-limit window so it can't be farmed. */
const DIRECTED_MULTIPLIER = 2;

/** What one successful induction is worth, in interactions. Lowered from 10 after real
 * play: at 10 an induction was worth ~50 minutes of conversation, so two sessions took a
 * near-stranger to 44 trust and talking stopped being worth doing. At 5 it is still a real
 * shortcut (~25 min) without replacing the slow path it is meant to accelerate. */
const INDUCTION_INTERACTIONS = 5;

// Experience from inductions. EVERY attempt grants some, because being the target of one
// is the practice whether or not it lands — and under the single-pool model the subject
// who fights an attempt off has to be able to get better at fighting. Granting only on
// success meant resistance could never improve, since improving required going under,
// which quietly contradicted the whole point of one shared pool.
//
// Success is worth more: three failed attempts total 0.75, a first-attempt success 1.25.
/** Per attempt, win or lose. */
const ATTEMPT_EXPERIENCE = 0.25;
/** Additional, on success only. */
const INDUCTION_EXPERIENCE = 1;

/** memberNumber → when we last counted an interaction with them. In-memory only: a reload
 * costing someone one window is a rounding error, and persisting it would mean writing to
 * storage on every chat message. */
const lastCounted = new Map<number, number>();

/** Called for every ordinary chat line from someone else in the room. */
export function noteConversation(sender: number, senderName: string, directed: boolean): void {
	if (!sender || sender === Player?.MemberNumber) return;
	const now = Date.now();
	const last = lastCounted.get(sender) ?? 0;
	if (now - last < RATE_LIMIT_MS) return;
	lastCounted.set(sender, now);
	const gain = directed ? DIRECTED_MULTIPLIER : 1;
	const entry = addInteractions(sender, senderName, gain);
	log(
		`trust +${gain} with ${entry.memberName} (${directed ? "directed" : "ambient"}) → ` +
			`${entry.interactions.toFixed(1)} interactions = ${valueFromCount(entry.interactions, H_TRUST).toFixed(1)}`,
	);
}

/** Called for every induction roll, whichever way it goes. Deliberately grants no TRUST —
 * an attempt that failed is not a relationship milestone, it's just practice. */
export function noteInductionAttempt(): void {
	const exp = addExperience(ATTEMPT_EXPERIENCE);
	log(`attempt experience +${ATTEMPT_EXPERIENCE} → ${exp.toFixed(1)}`);
}

/** Called additionally when an induction succeeds. Both halves of the accelerator: trust
 * with that specific hypnotist, and the deeper practice of actually going under. */
export function noteInductionSuccess(hypnotistId: number, hypnotistName: string): void {
	const entry = addInteractions(hypnotistId, hypnotistName, INDUCTION_INTERACTIONS);
	const exp = addExperience(INDUCTION_EXPERIENCE);
	log(
		`induction accelerator: +${INDUCTION_INTERACTIONS} interactions with ${entry.memberName} → ` +
			`trust ${trustWith(hypnotistId).toFixed(1)}; experience → ${exp.toFixed(1)}`,
	);
}

export interface TrustStatRow {
	name: string;
	/** 0-100 value, already formatted. */
	trust: string;
	/** The count behind it, plus when it last moved — both matter for judging pace. */
	detail: string;
}

function agoText(timestamp: number): string {
	if (!timestamp) return "never";
	const mins = Math.floor((Date.now() - timestamp) / 60_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

/** Per-person rows for the settings screen's Stats tab, strongest first. Shows the
 * interaction count next to the value deliberately: the count is what's actually stored
 * and what makes the pace legible ("5.8 interactions" says more about speed than "18.8"). */
// --- BC relationships as a trust floor ------------------------------------------------
//
// The doc had "relationship → starting trust" and "trust decay" as two separate todo items.
// They are one mechanic: without a floor, an owner who goes away for three weeks comes back
// having to re-earn the right to hypnotise you, which is wrong in a way that is not even
// interesting — the relationship is still there, in BC's own data, the whole time.
//
// Same shape as the arousal chemical floor already in session.ts, and combined into the
// same max() rather than bolted on beside it.

export type AccessCategory =
	/** Ordinary in-session suggestions. */
	| "session"
	/** Arousal levels and orgasms. */
	| "arousal"
	/** Lies to the subject about their own state — the clothing illusion. */
	| "deceptive"
	/** Outlives the session: triggers, carry-forward. */
	| "persistent";

interface Relation {
	kind: RelationKind;
	floor: number;
	/** Which categories this floor is allowed to lift. A relationship you have not built on
	 * gets you in the door, not all the way through the house. */
	reaches: AccessCategory[];
}

/** DW's values. A friend gets a foot in the door and earns the rest; a lover additionally
 * gets the arousal features; an owner gets everything.
 *
 * Owner sits at 65 — exactly the trigger and carry-forward threshold, so ownership alone
 * confers those, while the clothing illusion's 70 still wants a little real history. */
const RELATIONS: Record<Exclude<RelationKind, "none">, Relation> = {
	friend: { kind: "friend", floor: 15, reaches: ["session"] },
	lover: { kind: "lover", floor: 30, reaches: ["session", "arousal"] },
	owner: { kind: "owner", floor: 65, reaches: ["session", "arousal", "deceptive", "persistent"] },
};

function characterFor(memberId: number): any {
	return (typeof ChatRoomCharacter !== "undefined" ? ChatRoomCharacter : []).find(
		(c: any) => c?.MemberNumber === memberId,
	);
}

/** What BC says this person is to us — or what `/hypno relate` has been told to pretend.
 *
 * Highest wins: an owner who is also on the friend list is an owner. Friend is checked off
 * Player.FriendList, which is a plain list of member numbers, so it works for someone who
 * is not in the room; owner and lover need the loaded character. */
export function relationshipWith(memberId: number): RelationKind {
	const override = getRelationshipOverride(memberId);
	if (override) return override;
	const C = characterFor(memberId);
	try {
		if (C && Player?.IsOwnedByCharacter?.(C)) return "owner";
		if (C && C.IsLoverOfCharacter?.(Player)) return "lover";
		if (Player?.FriendList?.includes?.(memberId)) return "friend";
	} catch {
		/* relationship lookups are a bonus, never a requirement */
	}
	return "none";
}

/** Access for a threshold check: the highest of what has been earned and what a
 * relationship confers, for the categories that relationship is allowed to lift.
 *
 * The arousal floor is deliberately NOT here — it belongs to session.ts, applies only to
 * session-scoped effects, and must never reach anything persistent or deceptive. This
 * function is the relationship half; effectiveAccess() combines both. */
export function accessFor(memberId: number, category: AccessCategory): number {
	const earned = trustWith(memberId);
	const kind = relationshipWith(memberId);
	if (kind === "none") return earned;
	const relation = RELATIONS[kind];
	if (!relation.reaches.includes(category)) return earned;
	return Math.max(earned, relation.floor);
}

/** For diagnostics and the help screen. */
export function describeRelationship(memberId: number): string {
	const kind = relationshipWith(memberId);
	if (kind === "none") return "no BC relationship";
	const r = RELATIONS[kind];
	const pretend = getRelationshipOverride(memberId) ? " (test override)" : "";
	return `${kind}${pretend} — floor ${r.floor}, reaches ${r.reaches.join(", ")}`;
}

export function trustStatRows(): TrustStatRow[] {
	return listTrust()
		.slice()
		.sort((a, b) => b.interactions - a.interactions)
		.map((t) => ({
			name: `${t.memberName} [${t.memberId}]`,
			trust: trustWith(t.memberId).toFixed(1),
			detail: `${t.interactions.toFixed(1)} interactions · ${agoText(t.lastUpdated)}`,
		}));
}

/** Human-readable dump for /hypno logtrust. */
export function describeTrust(): string[] {
	const all = listTrust();
	const header = `experience: ${experienceValue().toFixed(1)}`;
	if (!all.length) return [header, "no trust data stored yet"];
	return [
		header,
		...all
			.slice()
			.sort((a, b) => b.interactions - a.interactions)
			.map(
				(t) =>
					`${t.memberName} [${t.memberId}]: trust ${trustWith(t.memberId).toFixed(1)} ` +
					`(${t.interactions.toFixed(1)} interactions)`,
			),
	];
}
