// A tiny keyed timer registry, deliberately importing NOTHING.
//
// It exists to break a cycle. The auto-release for a fired trigger is scheduled in
// voice.ts (which owns the undo logic) but has to be cancelled by session.ts when a
// safeword or wake clears the effects out from under it. voice.ts already imports
// session.ts, so having session.ts import voice.ts back would make the two modules
// circular — the same trap the pose helpers hit, solved the same way: put the shared
// state in a leaf module both can depend on.

const timers = new Map<string, ReturnType<typeof setTimeout>>();

/** Schedule work under a key, replacing any pending work for that same key. Re-firing a
 * trigger therefore restarts its clock rather than stacking a second timer. */
export function scheduleTimer(key: string, delayMs: number, fn: () => void): void {
	cancelTimer(key);
	timers.set(
		key,
		setTimeout(() => {
			timers.delete(key);
			fn();
		}, delayMs),
	);
}

export function cancelTimer(key: string): void {
	const existing = timers.get(key);
	if (existing) {
		clearTimeout(existing);
		timers.delete(key);
	}
}

/** Drop everything pending. Called when the effects a timer would undo have already been
 * cleared — a later timer firing against nothing is at best noise. */
export function clearAllTimers(): void {
	for (const timer of timers.values()) clearTimeout(timer);
	timers.clear();
}
