import { log } from "./log";
import { sendHiddenMessage, HypnoMessage } from "./messaging";
import { getFeatures, getEchsIconSpot } from "./storage";
import { SPIRAL_ICON } from "./icon";

// The ECHS icon over other players in a room (v1.7.0; Biker 10-22 and 11-02, Lianne 11-07; DW
// 2026-11-08: on by default, the spiral, the viewer picks where).
//
// WHERE. Every FUSAM add-on was checked for where it draws over characters (docs/addon-icon-survey.md).
// The top row's only unused slot is x 228-258, between BC+ (190-226) and WCE's text (from about 260).
// The second choice, below the top row on the far left (x 10-50, y 45-85), is also unused. A clash
// depends on which add-ons the VIEWER runs, so the viewer picks (storage.getEchsIconSpot).
//
// WHO. Found with the two messages every build already exchanges (state-query / state-response,
// remote.ts), never a new type: a client that does not know a type prints it as raw text. On
// joining a room this client asks everyone once; everyone answers it, and its own ask tells them
// about it. Both carry the version and whether to show the icon. Anyone who sends either message
// runs ECHS; an older build sends no flag and counts as showing it (on by default).
//
// RULE 1: whether YOU show is your client's to say (showEchsIcon). Off, it still answers, because
// the hypnotist's panel needs to know ECHS is running, but it says not to draw the icon.
//
// BC's hide-icons button is honoured for free: BC only calls ChatRoomDrawCharacterStatusIcons when
// every icon is shown (R132 ChatRoomCharacterView.js:362).

/** In BC's character space (500 wide, 1000 tall), multiplied by the room zoom. */
export const ICON_SPOTS: Record<string, { x: number; y: number }> = {
	top: { x: 228, y: 2 },
	left: { x: 15, y: 50 },
};
export const ICON_SIZE = 30;

type Peer = { version: string; show: boolean };
const peers = new Map<number, Peer>();
let roomKey = "";
let lastAnnounceAt = 0;
let announcedShow: boolean | null = null;
/** Asks sent to someone who arrived, so an older build that never asks the room is still found. */
const askedAfterJoin = new Set<number>();
const REANNOUNCE_MS = 60_000;
// What /echs icons reports (v1.7.1, after DW saw no icon at all on v1.7.0). Rule 5: the draw hook
// used to swallow every error, which made a broken icon and a missing one look the same.
const diag = { hooked: [] as string[], hookFailed: [] as string[], calls: 0, drawn: 0, lastError: "", lastErrorAt: 0, lastSkip: "" };
const ARRIVAL_ASK_MS = 4000;

function me(): number | undefined {
	return typeof Player === "object" ? Player?.MemberNumber : undefined;
}

/** What goes on every state-query and state-response this client sends. */
export function presenceFields(): { version: string; showIcon: boolean } {
	return { version: __VERSION__, showIcon: getFeatures().showEchsIcon !== false };
}

/** Someone sent a state-query or state-response, so they run ECHS. */
export function notePeer(sender: number, message: HypnoMessage): void {
	if (sender === me()) return;
	const version = typeof message.version === "string" ? message.version.slice(0, 20) : "";
	const known = peers.get(sender);
	peers.set(sender, { version: version || known?.version || "", show: message.showIcon !== false });
}

export function peerFor(member: number): Peer | undefined {
	return peers.get(member);
}

/** Ask the whole room once. Everyone answers us; our ask tells them about us. */
function announce(): void {
	if (typeof ServerPlayerIsInChatRoom === "function" && !ServerPlayerIsInChatRoom()) return;
	lastAnnounceAt = Date.now();
	announcedShow = getFeatures().showEchsIcon !== false;
	sendHiddenMessage({ type: "state-query", presence: true, ...presenceFields() });
	log(`ECHS icon: asked the room who runs ECHS (showing ours: ${announcedShow})`);
}

/** A room sync. A new room clears who we knew; the same room re-asks at most once a minute. */
export function onRoomSync(): void {
	const key = typeof ChatRoomData === "object" && ChatRoomData ? String(ChatRoomData.Name ?? "") : "";
	if (key !== roomKey) {
		roomKey = key;
		peers.clear();
		askedAfterJoin.clear();
		announce();
		return;
	}
	if (Date.now() - lastAnnounceAt >= REANNOUNCE_MS) announce();
}

/** Someone arrived. A current build asks the room itself; an older one does not, so if we have not
 * heard from them in a few seconds, ask them directly. */
export function onMemberJoin(member: number | undefined): void {
	if (typeof member !== "number" || member === me() || askedAfterJoin.has(member)) return;
	askedAfterJoin.add(member);
	setTimeout(() => {
		if (!peers.has(member) && isInRoom(member)) sendHiddenMessage({ type: "state-query", presence: true, ...presenceFields() }, member);
	}, ARRIVAL_ASK_MS);
}

function isInRoom(member: number): boolean {
	return Array.isArray(ChatRoomCharacter) && ChatRoomCharacter.some((c: any) => c?.MemberNumber === member);
}

/** Should C have the icon on this screen, and with what version? Null for no icon. */
export function iconFor(C: any): Peer | null {
	if (!C || typeof C.MemberNumber !== "number") return null;
	if (C.MemberNumber === me()) {
		return getFeatures().showEchsIcon !== false ? { version: __VERSION__, show: true } : null;
	}
	const peer = peers.get(C.MemberNumber);
	return peer && peer.show ? peer : null;
}

/** Draw the icon for C, after BC's own icons. Hovering shows whose it is and the version. */
export function drawIcon(C: any, charX: number, charY: number, zoom: number): void {
	// Our own setting changed since we last told the room: tell it again. Checked on our own
	// character's frame only, so it costs one comparison a frame.
	if (C?.MemberNumber === me() && announcedShow !== null && announcedShow !== (getFeatures().showEchsIcon !== false)) announce();
	const spot = ICON_SPOTS[getEchsIconSpot()];
	if (!spot) return void (diag.lastSkip = "your ECHS icons setting is Off");
	if (!SPIRAL_ICON) return void (diag.lastSkip = "the spiral image could not be built");
	const peer = iconFor(C);
	if (!peer) return;
	diag.drawn++;
	const size = ICON_SIZE * zoom;
	const x = charX + spot.x * zoom;
	const y = charY + spot.y * zoom;
	// A light disc behind it, so the dark spiral reads on a dark background.
	DrawCircle(x + size / 2, y + size / 2, size / 2, Math.max(1, zoom), "#2c2352", "rgba(255, 255, 255, 0.85)");
	DrawImageResize(SPIRAL_ICON, x + size * 0.12, y + size * 0.12, size * 0.76, size * 0.76);
	if (typeof MouseIn === "function" && MouseIn(x, y, size, size)) {
		// Nickname first, as BC shows it; read straight off the character, as trust.ts does.
		const name = String(C.Nickname || C.Name || `#${C.MemberNumber}`);
		const text = `${name}: ECHS ${peer.version ? `v${peer.version}` : "(an older version)"}`;
		DrawRect(x + size / 2 - 150, y + size + 6, 300, 40, "rgba(0, 0, 0, 0.75)");
		DrawTextFit(text, x + size / 2, y + size + 26, 290, "White");
	}
}

/** Hook one BC function, and remember whether it took, for /echs icons. One failing must not stop
 * the others: before, a throw on the first left the draw hook uninstalled without a word. */
function hook(modApi: any, name: string, priority: number, fn: (args: any[], next: (a: any[]) => any) => any): void {
	try {
		modApi.hookFunction(name, priority, fn);
		diag.hooked.push(name);
	} catch (err) {
		diag.hookFailed.push(`${name}: ${String((err as any)?.message ?? err).slice(0, 120)}`);
	}
}

/** /echs icons: why a spiral is or is not showing, on this screen. */
export function describeIcons(): string[] {
	const lines: string[] = [];
	lines.push(`ECHS icons: hooked ${diag.hooked.join(", ") || "nothing"}${diag.hookFailed.length ? `; FAILED ${diag.hookFailed.join("; ")}` : ""}.`);
	lines.push(`Drawn ${diag.drawn} times in ${diag.calls} calls since the page loaded.${diag.calls === 0 ? " BC (or another add-on) never asked us to draw: tell DW which add-ons you run." : ""}`);
	if (diag.lastError) lines.push(`Last drawing error, ${Math.round((Date.now() - diag.lastErrorAt) / 1000)}s ago: ${diag.lastError}`);
	if (diag.lastSkip) lines.push(`Not drawn because ${diag.lastSkip}.`);
	lines.push(
		`Yours shows to others: ${getFeatures().showEchsIcon !== false ? "yes" : "no"}. Where you see them: ${getEchsIconSpot()}. ` +
			`BC icons shown: ${typeof ChatRoomHideIconState === "number" ? (ChatRoomHideIconState === 0 ? "yes" : `no (state ${ChatRoomHideIconState})`) : "unknown"}. ` +
			`Game ${typeof GameVersion === "string" ? GameVersion : "?"}.`,
	);
	const here = Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter.filter((c: any) => c?.MemberNumber !== me()) : [];
	if (!here.length) lines.push("Nobody else is in the room.");
	for (const c of here) {
		const p = peers.get(c.MemberNumber);
		lines.push(`  ${c.Nickname || c.Name} (#${c.MemberNumber}): ${p ? `ECHS ${p.version ? `v${p.version}` : "(older)"}${p.show ? "" : ", chose to hide it"}` : "not heard from (no ECHS, or not answered yet)"}`);
	}
	return lines;
}

export function installBadge(modApi: any): void {
	hook(modApi, "ChatRoomSync", 10, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		try {
			onRoomSync();
		} catch (err) {
			log("ECHS icon: room sync failed", err);
		}
		return result;
	});
	hook(modApi, "ChatRoomSyncMemberJoin", 10, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		onMemberJoin(args[0]?.SourceMemberNumber ?? args[0]?.Character?.MemberNumber);
		return result;
	});
	// After BC's own icons, so ours is drawn over nothing of theirs (it sits in their gap anyway).
	hook(modApi, "ChatRoomDrawCharacterStatusIcons", 0, (args: any[], next: (a: any[]) => any) => {
		const result = next(args);
		diag.calls++;
		try {
			const [C, x, y, zoom] = args;
			if (typeof x === "number" && typeof y === "number") drawIcon(C, x, y, typeof zoom === "number" ? zoom : 1);
			else diag.lastSkip = `BC passed no position (${typeof x}, ${typeof y})`;
		} catch (err) {
			// A drawing fault must never break BC's room drawing, but it is kept for /echs icons.
			diag.lastError = String((err as any)?.stack ?? err).slice(0, 300);
			diag.lastErrorAt = Date.now();
		}
		return result;
	});
}

/** Tests only. */
export function resetBadgeForTests(): void {
	peers.clear();
	askedAfterJoin.clear();
	roomKey = "";
	lastAnnounceAt = 0;
	announcedShow = null;
}
