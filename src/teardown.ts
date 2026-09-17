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
