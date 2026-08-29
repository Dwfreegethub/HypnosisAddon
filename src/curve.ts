// The one growth curve, shared by every accumulating stat.
//
// Design doc, "Trust & Experience Gain Curve": stats are stored as an INTERACTION COUNT
// and the 0–100 value is derived on read. Never store the value.
//
//   value(n) = 100n / (n + H)      H = interactions to reach 50
//
// Storing the count rather than the score buys four things, and the last is the reason:
//   - legible state: one integer per person, "40 exchanges → 62 trust"
//   - decay is subtraction from n
//   - the induction accelerator is addition to n
//   - RETUNING NEVER CORRUPTS SAVED DATA. Change H and every stored count rescales
//     correctly and automatically. Had we stored values, changing H would silently make
//     every saved number wrong. These constants are guesses, so this matters.
//
// The ratios are fixed by the shape and are NOT independently tunable: 50 costs 1×H,
// 75 costs 3×H, 90 costs 9×H, 95 costs 19×H, 99 costs 99×H. Making the top relatively
// harder means changing the exponent, not H.

/** Interactions to reach 50 trust. At the settled pace (one directed message per 5 min)
 * that's ~2 hours of conversation to 50, ~19 hours to 90, ~206 hours to 99. */
export const H_TRUST = 25;

/** Interactions to reach 50 experience. Experience accrues once per completed induction
 * rather than per message, so this is in sessions, not minutes — 25 sessions to 50.
 * Pure guess; nothing has been played against it yet. */
export const H_EXPERIENCE = 25;

/** Count → 0-100 value. */
export function valueFromCount(count: number, h: number): number {
	const n = Math.max(0, count);
	return (100 * n) / (n + h);
}

/** 0-100 value → the count that would produce it. Used to migrate stored values from
 * before counts existed. Clamped below 100 because the curve never actually reaches it —
 * value 100 has no finite count. */
export function countFromValue(value: number, h: number): number {
	const v = Math.max(0, Math.min(99.9, value));
	return (h * v) / (100 - v);
}
