import { log } from "./log";

// Is she at the keyboard? (v0.97.0, trust.md §12, DW 2026-09-27)
//
// Auto-stance and toy mode answer an induction without asking her, which is only safe while she is
// there to see it. DW: away means "no chat or input for 10 minutes". A key, a click or a touch
// anywhere in the tab counts, and typing is how a chat line gets written, so it counts too. Mouse
// movement alone does not: a nudged mouse is not someone reading the room.
//
// Plain browser events on this tab, not a BC API, and this client's own view of its own player, so
// nothing here is taken on anyone else's word (rule 1). A fresh load counts as being here: she has
// just logged in.

export const AWAY_AFTER_MS = 10 * 60_000;

let lastActivity = Date.now();

export function noteActivity(): void {
	lastActivity = Date.now();
}

export function isAway(): boolean {
	return Date.now() - lastActivity >= AWAY_AFTER_MS;
}

/** Minutes since her last input, for /hypno chance. */
export function idleMinutes(): number {
	return Math.floor((Date.now() - lastActivity) / 60_000);
}

export function installAwayWatch(): void {
	if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
	for (const type of ["keydown", "mousedown", "touchstart"]) {
		window.addEventListener(type, noteActivity, { capture: true, passive: true });
	}
	log("away watch installed: 10 minutes without a key, click or touch counts as away");
}
