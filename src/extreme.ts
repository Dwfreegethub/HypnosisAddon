import { log } from "./log";
import { getExtremeLock, startExtremeLock, clearExtremeLock, EXTREME_TRIAL_DAYS, EXTREME_MONTH_DAYS } from "./storage";

// The Extreme progressive lock (v0.99.0, job2.md §4 and §5). Choosing Extreme in the setup wizard,
// and confirming its warning, makes the settings read-only for a week; after that the player is
// offered 30 days at a time, never anything permanent.
//
// DW's decisions, recorded so they are not "fixed" later:
//  - While locked, Hypnosis Enabled cannot be unticked. This CHANGES CLAUDE.md rule 2 for the length
//    of the lock (DW, 2026-09-29). The safeword still always ends a trance.
//  - Purge and Clear All on the Planted tab are locked too.
//  - Ways out early: /echs reset confirm (wipes everything), switching ECHS off in the userscript
//    manager, and the undocumented /echs exit_extreme (unlocks, keeps everything).
//  - When a period runs out the settings STAY read-only until the player answers the prompt.
//
// A leaf: storage only, so menu.ts and commands.ts can both read it without a cycle.

/** Is the Extreme lock holding the settings? True while it runs AND after it runs out until the
 * player answers, which is what "stays read-only until they choose" means. */
export function extremeLocked(): boolean {
	return getExtremeLock() !== null;
}

/** Has the current period run out, so the renewal prompt is owed? */
export function extremeExpired(now: number = Date.now()): boolean {
	const lock = getExtremeLock();
	return !!lock && now >= lock.until;
}

function dateText(ms: number): string {
	return new Date(ms).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

/** The read-only banner's words while the Extreme lock holds. */
export function extremeBannerText(now: number = Date.now()): string {
	const lock = getExtremeLock();
	if (!lock) return "";
	return now >= lock.until
		? "Read-only: your Extreme lock period has ended. Choose what happens next to unlock. /echs safeword always ends a trance."
		: `Read-only: Extreme lock until ${dateText(lock.until)}. /echs safeword always ends a trance.`;
}

/** Said when something a lock covers is refused. */
export function extremeRefusal(now: number = Date.now()): string {
	const lock = getExtremeLock();
	if (!lock) return "";
	return now >= lock.until
		? "Locked by Extreme: open your ECHS settings to choose whether to renew or unlock."
		: `Locked by Extreme until ${dateText(lock.until)}. /echs safeword always ends a trance.`;
}

/** The warning shown before Extreme is applied, one paragraph per entry. */
export const EXTREME_WARNING: string[] = [
	`Extreme locks your settings in read-only mode for ${EXTREME_TRIAL_DAYS} days. You will be able to view them, but not change them — that includes switching hypnosis off and removing planted triggers.`,
	"/echs safeword always ends a trance, locked or not.",
	"To unlock early you must run /echs reset confirm, which also erases all your trust, triggers and stats. You can also switch ECHS off in your userscript manager (Tampermonkey, or whatever loaded it).",
	`After the ${EXTREME_TRIAL_DAYS} days you choose: go back to editable settings, or commit to ${EXTREME_MONTH_DAYS} days at a time.`,
];

/** The renewal prompt for a period that has run out: its heading and its two choices. */
export function renewalPrompt(): { title: string; unlock: string; renew: string } | null {
	const lock = getExtremeLock();
	if (!lock) return null;
	return lock.stage === "trial"
		? { title: `Your ${EXTREME_TRIAL_DAYS}-day Extreme trial has ended. How was your experience?`, unlock: "Return to editable settings", renew: `Commit to ${EXTREME_MONTH_DAYS} days` }
		: { title: `Your ${EXTREME_MONTH_DAYS}-day Extreme lock has expired. Continue for another ${EXTREME_MONTH_DAYS} days?`, unlock: "Unlock and edit settings", renew: `Renew for ${EXTREME_MONTH_DAYS} days` };
}

/** The player's answer to the renewal prompt. Unlocking keeps every setting; renewing starts 30 days. */
export function answerRenewal(renew: boolean, now: number = Date.now()): string {
	if (renew) {
		const lock = startExtremeLock("month", now);
		log(`Extreme lock renewed until ${new Date(lock.until).toISOString()}`);
		return `Extreme renewed for ${EXTREME_MONTH_DAYS} days, until ${dateText(lock.until)}.`;
	}
	clearExtremeLock();
	log("Extreme lock ended by the player at renewal");
	return "Extreme lock ended. Your settings are editable again, and nothing in them has changed.";
}

/** Start the first-week lock: the wizard's Extreme confirmation. */
export function startExtremeTrial(now: number = Date.now()): string {
	const lock = startExtremeLock("trial", now);
	log(`Extreme trial lock until ${new Date(lock.until).toISOString()}`);
	return `Extreme applied. Your settings are read-only until ${dateText(lock.until)}.`;
}

/** /echs exit_extreme — undocumented on purpose (DW). Ends the lock now and keeps everything. */
export function exitExtreme(): string {
	if (!extremeLocked()) return "No Extreme lock is set.";
	clearExtremeLock();
	log("Extreme lock ended by /echs exit_extreme");
	return "Extreme lock ended. Your settings are editable again; trust, triggers and stats are untouched.";
}
