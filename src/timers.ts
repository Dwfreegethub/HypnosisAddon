// A tiny keyed timer registry, deliberately importing NOTHING.
//
// It exists to break a cycle. The auto-release for a fired trigger is scheduled in
// voice.ts (which owns the undo logic) but has to be cancelled by session.ts when a
// safeword or wake clears the effects out from under it. voice.ts already imports
// session.ts, so having session.ts import voice.ts back would make the two modules
// circular — the same trap the pose helpers hit, solved the same way: put the shared
// state in a leaf module both can depend on.

const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** When each pending timer is due, in absolute ms.
 *
 * A setTimeout knows its delay but will not tell you, and a reconnecting subject has to
 * serve out the REMAINDER of a trigger rather than a fresh full duration — otherwise
 * dropping and rejoining would silently reset every clock holding them. */
const deadlines = new Map<string, number>();

/** Schedule work under a key, replacing any pending work for that same key. Re-firing a
 * trigger therefore restarts its clock rather than stacking a second timer. */
export function scheduleTimer(key: string, delayMs: number, fn: () => void): void {
	cancelTimer(key);
	deadlines.set(key, Date.now() + delayMs);
	timers.set(
		key,
		setTimeout(() => {
			timers.delete(key);
			deadlines.delete(key);
			fn();
		}, delayMs),
	);
}

/** Absolute due time for a pending timer, or 0 if nothing is pending under that key. */
export function timerDeadline(key: string): number {
	return deadlines.get(key) ?? 0;
}

/** Every key currently in force, whether or not a clock is running on it. */
export function activeTimerKeys(): string[] {
	return [...activeKeys];
}

export function cancelTimer(key: string): void {
	const existing = timers.get(key);
	if (existing) {
		clearTimeout(existing);
		timers.delete(key);
	}
	deadlines.delete(key);
}

/** Keys whose effects are currently in force.
 *
 * Separate from the timer map on purpose: a duration of 0 means "hold until released", so
 * there is no pending timer even though the effects very much are applied. Reading
 * "is a timer pending" as "is it in force" would therefore be wrong in exactly the case
 * that matters most — the one where a subject is stuck with no clock running.
 *
 * Lives here, in the module that imports nothing, for the same reason the timers do:
 * session.ts and commands.ts both need it, and voice.ts (which owns triggers) already
 * imports session.ts. */
const activeKeys = new Set<string>();

export function markActive(key: string): void {
	activeKeys.add(key);
}

export function clearActive(key: string): void {
	activeKeys.delete(key);
}

export function isActive(key: string): boolean {
	return activeKeys.has(key);
}

/** Drop everything pending. Called when the effects a timer would undo have already been
 * cleared — a later timer firing against nothing is at best noise, and a marker left
 * standing would claim something is holding the subject when nothing is. */
export function clearAllTimers(): void {
	for (const timer of timers.values()) clearTimeout(timer);
	timers.clear();
	deadlines.clear();
	activeKeys.clear();
}
