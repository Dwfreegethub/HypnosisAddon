import { tellPlayer } from "./notify";
import { wasWelcomeShown, markWelcomeShown, hasAnyPermissionGranted } from "./storage";

// The first-run notice. Every permission — including hypnoEnabled — defaults off, and the
// wizard and starter offer only appear if you open settings, so a fresh install is completely
// silent and indistinguishable from a broken one. This closes that discovery gap with one
// notice, printed once per install into the local chat log. See design.md "THE FIRST-RUN
// NOTICE" for the full spec and reasoning.
//
// What it must NOT do (all deliberate): not auto-enable anything, not pre-tick, not reach the
// room, and not nag — once per install, never per-load and never per-version (alpha bumps the
// version constantly, so a version-keyed notice would fire on every update).

/** Show the first-run notice if it is due, and record that the user has now met the add-on so
 * it can never fire again. Called once per load from startRecovery()'s identity-and-room-known
 * branch — the one place that already waits until settings are safe to read (reading before
 * login caches defaults over good data: the v0.17.0 trap) and a chat log exists to print into.
 * Do not add a second poll. */
export function maybeShowFirstRunNotice(): void {
	if (wasWelcomeShown()) return;
	// Fire whenever the add-on is SILENT — no hypnotist-actionable permission granted. That is
	// both a fresh install and "hypnoEnabled on but nothing else", the same silence for a
	// different reason. A user who has actually configured a permission is marked shown WITHOUT a
	// notice, so they are neither greeted nor ever nagged. ("Hypnotist only" — enabled off on
	// purpose, fully set up — is already excluded upstream: normalise() back-fills welcomeShown
	// for anyone whose starterState shows they finished setup.)
	if (!hasAnyPermissionGranted()) {
		tellPlayer(`Erotic Chat Hypnosis Suite (ECHS) v${__VERSION__} — nothing is switched on yet. Click the spiral to set up.`);
		tellPlayer("Your reactions are visible to the room by default; Trance Defaults turns that off.");
	}
	markWelcomeShown();
}
