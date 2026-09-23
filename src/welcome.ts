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
 * it can never fire again. Called once per load from startStartupBanner()'s poll below, right
 * after the banner, once identity is known and a chat log exists: settings are safe to read by
 * then (reading before login caches defaults over good data: the v0.17.0 trap) and there is
 * somewhere to print. Do not add another poll for it.
 *
 * Until v0.84.3 it rode startRecovery()'s poll instead, which stops for good 20 s after load
 * when there is no room yet. Logging in and browsing the room list takes longer than that, so
 * on an ordinary fresh login the notice never fired and the silence it exists to break stayed. */
export function maybeShowFirstRunNotice(): void {
	if (wasWelcomeShown()) return;
	// Fire whenever the add-on is SILENT — no hypnotist-actionable permission granted. That is
	// both a fresh install and "hypnoEnabled on but nothing else", the same silence for a
	// different reason. A user who has actually configured a permission is marked shown WITHOUT a
	// notice, so they are neither greeted nor ever nagged. ("Hypnotist only" — enabled off on
	// purpose, fully set up — is already excluded upstream: normalise() back-fills welcomeShown
	// for anyone whose starterState shows they finished setup.)
	if (!hasAnyPermissionGranted()) {
		tellPlayer("Erotic Chat Hypnosis Suite (ECHS) — nothing is switched on yet. Click the spiral to set up.");
		tellPlayer("Your reactions are visible to the room by default; Trance Defaults turns that off.");
	}
	markWelcomeShown();
}

// --- The startup banner -----------------------------------------------------------------

/** How often to look for a chat log to print the startup banner into. */
const BANNER_POLL_MS = 1_000;
/** After this long with no room, the page is not "starting up" any more and the banner is
 * dropped rather than appearing in the middle of someone's evening. */
const BANNER_GIVE_UP_MS = 10 * 60_000;

let bannerShown = false;

/** One local line naming the build, printed into the player's own chat log the first time
 * they are in a room after a page load.
 *
 * Why this exists when there is already a bottom-right watermark (main.ts): the watermark is
 * a DOM element a player stops seeing within a day, and it cannot be quoted back. A chat line
 * can — "what does the first line of your chat say?" is the shortest way to find out which
 * build a tester is actually running, which the userscript managers have already been caught
 * getting wrong once (the second @version line, v0.75.0).
 *
 * Local only, via tellPlayer: it goes to this player's chat log and to nobody else. The room
 * must never see it. Once per page load, not per room change — leaving and re-entering rooms
 * is ordinary play, not a startup.
 *
 * Deliberately says nothing about what is switched on. The first-run notice above owns that,
 * and this line has to read the same for every player whatever their settings. */
export function showStartupBanner(): void {
	if (bannerShown) return;
	bannerShown = true;
	tellPlayer(`Erotic Chat Hypnosis Suite (ECHS) · v${__VERSION__} · /hypno help`);
}

/** Wait for a chat log, then show the banner once, and the first-run notice after it if due.
 *
 * Its own poll rather than riding startRecovery()'s, which looks like the obvious host and is
 * not: that poll stops for good at its no-room fallback (20 s after load), and logging in then
 * browsing the room list for half a minute is the ordinary way to arrive — so the banner would
 * simply never print for most sessions. This waits for the one thing it actually needs, which
 * is somewhere to print, and stops the moment it has printed.
 *
 * ChatRoomSendLocal only reaches a chat log that exists; called from the lobby it is swallowed
 * with no error, which is the silent failure this gate is here to avoid.
 *
 * The first-run notice rides this poll for the same reason (see maybeShowFirstRunNotice). It
 * reads settings where the banner reads none, so the gate also asks for a known member number,
 * the same test startRecovery() uses. Being in a room should already imply it; checking costs
 * nothing and keeps the notice off the v0.17.0 trap if it ever does not. If the page sits in the
 * lobby past the give-up, nothing is marked shown and the notice simply waits for the next load. */
export function startStartupBanner(): void {
	const startedAt = Date.now();
	const tick = () => {
		const known = typeof Player?.MemberNumber === "number" && Player.MemberNumber > 0;
		const ready = known && typeof ServerPlayerIsInChatRoom === "function" && ServerPlayerIsInChatRoom();
		if (ready) {
			clearInterval(poll);
			showStartupBanner();
			maybeShowFirstRunNotice();
			return;
		}
		if (Date.now() - startedAt > BANNER_GIVE_UP_MS) clearInterval(poll);
	};
	const poll = setInterval(tick, BANNER_POLL_MS);
	tick();
}

// --- The loaded toast --------------------------------------------------------------------

/** How long the "loaded" toast sits at full strength before it starts to fade. */
export const LOADED_TOAST_HOLD_MS = 5_000;
/** How long the fade itself takes. */
export const LOADED_TOAST_FADE_MS = 1_500;

/** A small "ECHS v… loaded" note in the bottom-right corner that fades out and removes itself.
 *
 * It used to stay for the whole session: a permanent watermark over the corner of the game.
 * That was the only place a tester could read their version when it went in; since v0.81.0 the
 * startup chat line above and the settings title both say it, and the chat line can be quoted
 * back, so the corner no longer has to hold it. What is left for this note is "the script ran",
 * at the moment of loading, and then it gets out of the way.
 *
 * Removed on a plain timer as well as on transitionend: a background tab may never run the
 * transition, and a toast that waits on an event that never comes is the permanent watermark
 * again. Clicks pass through it throughout. */
export function showLoadedToast(): void {
	if (typeof document === "undefined" || !document.body) return;
	const el = document.createElement("div");
	el.textContent = `ECHS v${__VERSION__} loaded`;
	Object.assign(el.style, {
		position: "fixed",
		bottom: "4px",
		right: "4px",
		zIndex: "9999",
		padding: "2px 6px",
		background: "rgba(0,0,0,0.6)",
		color: "#fff",
		fontSize: "10px",
		fontFamily: "monospace",
		borderRadius: "3px",
		pointerEvents: "none",
		opacity: "1",
		transition: `opacity ${LOADED_TOAST_FADE_MS}ms ease`,
	});
	document.body.appendChild(el);
	setTimeout(() => {
		el.style.opacity = "0";
		setTimeout(() => el.remove(), LOADED_TOAST_FADE_MS + 100);
	}, LOADED_TOAST_HOLD_MS);
}
