const TAG = "[HypnosisAddon]";

export function log(...args: unknown[]): void {
	console.log(TAG, ...args);
}

/** Build flag: are we still the only people running this?
 *
 * Lives here because log.ts is the one module everything imports and that imports nothing,
 * so a build-time switch can be read from anywhere without risking a cycle.
 *
 * What it currently gates: `/hypno triggers full`, which reveals the subject's own trigger
 * phrases. That defeats the hiding it sits next to — a subject who can read their own
 * trigger word can simply decide not to react to it — so it is a testing affordance, not a
 * feature. Once testing is over this goes false, `full` stops existing, and `/hypno
 * triggers` alone is the command, showing phrases or not according to the player's own
 * "Show trigger words" setting.
 *
 * Flipping this to false is a release step. It announces itself in the console at startup
 * so it cannot quietly ship switched on. */
export const TESTING_MODE = true;
