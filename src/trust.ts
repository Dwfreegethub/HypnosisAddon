import { log } from "./log";
import { addInteractions, addExperience, trustWith, experienceValue, listTrust } from "./storage";
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

/** What one successful induction is worth, in interactions. At H_TRUST=25 this moves a
 * stranger from 0 to ~29 trust in a single session, which is the "significant accelerator"
 * the doc asks for. Trades directly against the conversation pace — raise it and
 * conversation stops mattering, lower it and inductions stop feeling like a shortcut. */
const INDUCTION_INTERACTIONS = 10;

/** What one completed induction is worth toward subject experience. Being hypnotized is
 * the practice, so it's one per session regardless of how it went. */
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

/** Called once when an induction succeeds. Both halves of the accelerator: trust with that
 * specific hypnotist, and the subject's own general experience of being hypnotized. */
export function noteInductionSuccess(hypnotistId: number, hypnotistName: string): void {
	const entry = addInteractions(hypnotistId, hypnotistName, INDUCTION_INTERACTIONS);
	const exp = addExperience(INDUCTION_EXPERIENCE);
	log(
		`induction accelerator: +${INDUCTION_INTERACTIONS} interactions with ${entry.memberName} → ` +
			`trust ${trustWith(hypnotistId).toFixed(1)}; experience → ${exp.toFixed(1)}`,
	);
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
