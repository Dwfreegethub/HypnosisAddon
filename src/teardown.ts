// A tiny registry of cleanups to run whenever a trance is torn down — safeword, the hard floor,
// a normal wake, or a timeout.
//
// It exists to break a cycle, exactly like timers.ts. The trigger RECORDING state lives in
// triggers.ts, which imports session.ts; so session.ts's teardown cannot reach in to cancel a
// half-built recording without importing triggers.ts back and making the two circular — the same
// trap the pose helpers and the auto-release timer hit. Instead the owning module registers a
// cleanup here, and session.ts runs them all when it stops a trance. Imports NOTHING, for the
// same reason timers.ts does.

const cleanups = new Set<() => void>();
const wakeListeners = new Set<(hypnotistId: number | null) => void>();
const totalStopListeners = new Set<() => void>();

/** Run on an ORDINARY end of a trance — a wake, a timeout — and not on the safeword or the hard
 * floor, which have their own hook below. Delayed compulsions arm here (triggers.ts). */
export function onWake(listener: (hypnotistId: number | null) => void): void {
	wakeListeners.add(listener);
}
export function runWake(hypnotistId: number | null): void {
	for (const listener of wakeListeners) {
		try {
			listener(hypnotistId);
		} catch {
			// As runTeardown: a listener is a small state change and must not break a wake.
		}
	}
}

/** Run on the safeword and the hard floor only. Nothing that was waiting for a wake may go off
 * after someone has said stop (rule 2). */
export function onTotalStop(listener: () => void): void {
	totalStopListeners.add(listener);
}
export function runTotalStop(): void {
	for (const listener of totalStopListeners) {
		try {
			listener();
		} catch {
			// Never let a listener stand between the safeword and finishing.
		}
	}
}

/** Register a cleanup to run on every trance teardown. Registered at module load, so it is
 * always in force. The callback must be a trivial state reset — see runTeardown on why. */
export function onTeardown(cleanup: () => void): void {
	cleanups.add(cleanup);
}

/** Run every registered cleanup. Guarded so one throwing cleanup cannot stop the rest or the
 * teardown around it — the safeword must always finish (rule 2), and a cleanup here is only
 * ever a small state reset that should not throw in the first place. */
export function runTeardown(): void {
	for (const cleanup of cleanups) {
		try {
			cleanup();
		} catch {
			// Deliberately swallowed: a cleanup is a trivial reset, and nothing it could throw is
			// worth leaving the trance half torn down over.
		}
	}
}
