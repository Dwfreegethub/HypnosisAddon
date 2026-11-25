import { tellPlayer } from "./notify";
import { log, warn, RELEASE_SUFFIX } from "./log";
import { getLastSeenVersion, setLastSeenVersion } from "./storage";

// The update notice (v1.15.0, DW 2026-11-21): the first time a player loads a NEW stable version,
// a BC beep pops up on their own screen with a short description of what changed, and one private
// chat line carries the same words with a link to the changelog, so it can still be read once the
// beep has faded.
//
// DW's decisions:
//   - ECHS shows it itself, through BC's own ServerShowBeep (R134 Server.js: message, duration,
//     options { onClick, silent, ... }, title). Nothing goes over the network; nobody else sees it.
//   - The text is written into the build (UPDATE_NOTE below), not fetched, so it cannot fail to load.
//   - Stable only. A dev build records the version silently: dev players would otherwise get a beep
//     for every small version.
//   - The beep plus a chat line with the changelog link.
//
// When it fires: the version is newer than the one this account last saw. lastSeenVersion is in the
// synced settings, so it is once per account, not once per device. A brand-new install records the
// version without a notice: the first-run notice owns that moment. A player who had ECHS before this
// feature existed has no lastSeenVersion; they count as having seen the version before it, so they
// get this release's notice too. A downgrade (going back a version) says nothing.
//
// RELEASE STEP: when dev goes to main, set UPDATE_NOTE to that release's version and one or two
// short sentences from the CHANGELOG headlines. If it names a different version from the build, the
// notice still fires but says only "ECHS was updated", which is right if nobody wrote the note.

/** The note for the release this build belongs to. Plain words: it goes into chat as HTML. */
export const UPDATE_NOTE: { version: string; text: string } = {
	version: "1.16.26",
	text: "A small fix: the Extreme warning in setup now says how long the lock lasts (7 days, then 30 days at a time) instead of \"undefined days\".",
};

export const CHANGELOG_URL = "https://github.com/Dwfreegethub/HypnosisAddon/blob/main/CHANGELOG.md";
/** How long the beep stays up, in ms. BC's own beeps use about 10 s; this one has more to read. */
export const UPDATE_BEEP_MS = 15_000;

/** -1, 0 or 1, comparing dotted version numbers ("1.14.1" < "1.15.0"). Non-numbers count as 0. */
export function compareVersions(a: string, b: string): number {
	const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
	const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (d) return d > 0 ? 1 : -1;
	}
	return 0;
}

/** The words for this version: the note if it was written for it, otherwise just that it updated. */
export function updateNoteText(version: string): string {
	return UPDATE_NOTE.version === version ? UPDATE_NOTE.text : `ECHS was updated to v${version}.`;
}

/** Is a notice due, and what should be recorded? Pure, for the suite. */
export function updateNoticeDue(current: string, lastSeen: string | undefined, freshInstall: boolean, dev: boolean): boolean {
	if (dev || freshInstall) return false;
	// Had ECHS before this feature: treat as having seen an older version.
	if (!lastSeen) return true;
	return compareVersions(current, lastSeen) > 0;
}

/** Show the notice if due, and record this version either way. Called once per load from the
 * startup banner's poll (welcome.ts), when there is a chat log to print into and settings are safe
 * to read. `freshInstall` is whether the first-run notice was still unshown when this load began. */
export function maybeShowUpdateNotice(freshInstall: boolean, current: string = __VERSION__, dev: boolean = RELEASE_SUFFIX !== ""): boolean {
	// A build without a real number (the suites' "test") can neither be compared nor recorded.
	if (!/^\d+(\.\d+)*$/.test(current)) return false;
	const lastSeen = getLastSeenVersion();
	const due = updateNoticeDue(current, lastSeen, freshInstall, dev);
	if (lastSeen !== current) setLastSeenVersion(current);
	if (!due) return false;
	const text = updateNoteText(current);
	log(`update notice for v${current} (last seen ${lastSeen ? `v${lastSeen}` : "none"})`);
	try {
		if (typeof ServerShowBeep === "function")
			ServerShowBeep(`${text} Click here for everything that changed.`, UPDATE_BEEP_MS, { onClick: () => window.open(CHANGELOG_URL, "_blank", "noopener") }, `ECHS updated to v${current}`);
	} catch (err) {
		warn("could not show the update beep:", err);
	}
	tellPlayer(`ECHS updated to v${current}: ${text} <a href="${CHANGELOG_URL}" target="_blank" rel="noopener">What's new</a>`);
	return true;
}
