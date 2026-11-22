import { log } from "./log";
import { tellPlayer } from "./notify";
import { getKeyLock, touchKeyLock, clearKeyLock, LockKind } from "./storage";

// The keyholder lock (v1.16.2, job6.md §5, DW 2026-11-22). A full keyholder asks; she accepts in the
// ask.ts popup. While it holds, her settings are read-only to HER, as under Extreme, and her
// keyholders can still change them. Any of her full keyholders can unlock it.
//
// It ends on its own when the keyholder who locked it has not been in a room with her for
// KEY_LOCK_IDLE_MS (DW: 7 days), so a keyholder who stops playing cannot leave her locked for good.
// Read lazily, like the Extreme lock's expiry: every check notes whether they are here now.
//
// NOT locked by it (rule 2, and DW): the safeword; /echs reset confirm, which wipes everything,
// this lock included; switching ECHS off (Hypnosis Enabled, off only); her keyholder list, except
// that the one who locked it keeps full keys while it holds.
//
// The KEYS lock (v1.16.3, DW 2026-11-22) is the same machinery for a narrower thing: she can't give or
// take back keys. Her BC owner (holding full keys) sets it without asking; any other full keyholder
// needs her Accept. Same unlocking and the same 7 days.

export const KEY_LOCK_IDLE_MS = 7 * 24 * 60 * 60 * 1000;
/** Being in the room is noted at most this often, so a check from a draw loop doesn't save every frame. */
const SEEN_SAVE_MS = 60_000;

function lockerHere(by: number): boolean {
	const room = typeof ChatRoomCharacter !== "undefined" && Array.isArray(ChatRoomCharacter) ? ChatRoomCharacter : [];
	return room.some((c: any) => c?.MemberNumber === by);
}

/** Who set this lock, or null. Ends the lock (and says so) once its keyholder has been gone
 * KEY_LOCK_IDLE_MS. */
export function keyLockHolder(now: number = Date.now(), kind: LockKind = "settings"): { id: number; name: string } | null {
	const l = getKeyLock(kind);
	if (!l) return null;
	if (lockerHere(l.by)) {
		if (now - l.seenAt > SEEN_SAVE_MS) touchKeyLock(now, kind);
		return { id: l.by, name: l.byName };
	}
	if (now - l.seenAt >= KEY_LOCK_IDLE_MS) {
		clearKeyLock(kind);
		log(`keyholder ${kind} lock by ${l.by} ended: not seen for 7 days`);
		tellPlayer(
			kind === "settings"
				? `Your keyholder lock has ended: ${l.byName} hasn't been in a room with you for 7 days. Your settings are yours to change again.`
				: `Your keys lock has ended: ${l.byName} hasn't been in a room with you for 7 days. You can give and take back keys again.`,
		);
		return null;
	}
	return { id: l.by, name: l.byName };
}

export function keyLocked(now: number = Date.now()): boolean {
	return keyLockHolder(now) !== null;
}

/** Who locked who holds her keys (v1.16.3), or null. */
export function keysLockHolder(now: number = Date.now()): { id: number; name: string } | null {
	return keyLockHolder(now, "keys");
}
export function keysLocked(now: number = Date.now()): boolean {
	return keysLockHolder(now) !== null;
}
/** What she is told when giving or taking back keys is refused. */
export function keysLockRefusal(): string {
	const h = keysLockHolder();
	return `${h?.name ?? "Your keyholder"} locked who holds your keys: you can't give or take back keys until a full keyholder unlocks it. /echs safeword always works.`;
}

/** What she is told when a change of her own is refused. */
export function keyLockRefusal(): string {
	const h = keyLockHolder();
	return `${h?.name ?? "Your keyholder"} locked your settings: only your keyholders can change them. Any of your full keyholders can unlock them. /echs safeword always works.`;
}

/** The settings screen's banner. */
export function keyLockBannerText(): string {
	const h = keyLockHolder();
	return `Read-only: ${h?.name ?? "your keyholder"} locked your settings. Any full keyholder can unlock them. /echs safeword always works.`;
}
