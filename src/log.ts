const TAG = "[HypnosisAddon]";

export function log(...args: unknown[]): void {
	console.log(TAG, ...args);
}

/** Build flag: are we still the only people running this?
 *
 * Lives here because log.ts is the one module everything imports and that imports nothing,
 * so a build-time switch can be read from anywhere without risking a cycle.
 *
 * What it gates, and why each one is a testing affordance rather than a feature:
 *
 * - `/hypno triggers full`, which reveals the subject's own trigger phrases. That defeats the
 *   hiding it sits next to — a subject who can read their own trigger word can simply decide
 *   not to react to it. Once testing is over this goes false, `full` stops existing, and
 *   `/hypno triggers` alone is the command, showing phrases or not according to the player's
 *   own "Show trigger words" setting.
 * - `/hypno trance` and its `test-trance` handler, which force a session with no consent step.
 * - `/hypno depth`, which sets a number the gates read.
 * - `/hypno agetrigger` and its `test-age` handler, which wind a trigger's decay clock back.
 *   The only one of these that WRITES to stored data, which is why it refuses in three places
 *   rather than one.
 * - `/bot` and `/hypno bot`, the channel to the test bot.
 *
 * Flipping this to false is a release step. It announces itself in the console at startup
 * so it cannot quietly ship switched on. */
export const TESTING_MODE = true;
