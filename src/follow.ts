import { log, warn } from "./log";
import { tellPlayer } from "./notify";
import { removeEffect, hasOwnEffect } from "./effects";
import { sendHiddenMessage, registerHiddenHandler } from "./messaging";

// Follow / leash — the design doc's Feature List, Tier 1, gated at Entranced.
//
// THE MECHANISM (v1.1.0, rebuilt 2026-11-01). Technique from LSCG's src/Modules/leashing.ts
// (its "compulsion" grab type, and the arm and ear grabs), read and reimplemented here. No LSCG
// code is used (rule 7). Every BC function below was checked against the live R133 client.
//
// BC moves a leashed player between rooms by itself, and the room move stays BC's own code:
//   1. The leader joins a room. ChatRoomSync calls ChatRoomPingLeashedPlayers, which sends an
//      AccountBeep of BeepType "Leash" to everyone in their ChatRoomLeashList. The server fills
//      in the room, and a Leash beep is not limited to friends.
//   2. The follower's ServerHandleLeashBeep acts only if ChatRoomLeashPlayer is the sender
//      (read before its first await) and ChatRoomCanBeLeashedBy(sender, Player) is true. It then
//      leaves the room and joins the leader's.
//   3. ChatRoomCanLeave is false while the follower is held, so they cannot walk out alone.
//
// v0.77.0 to v1.0.1 met step 2 by injecting a "Leash" effect onto the invisible Emoticon item
// and leaving the hypnotist to click BC's Hold Leash. That failed twice over: nothing told the
// hypnotist to click it, and a client without ECHS strips the injected effect (Asset.AllowEffect
// is client-local), so only an ECHS hypnotist ever got the option. Now, as LSCG does it:
//   - SUBJECT: while compelled, ChatRoomCanBeLeashedBy answers true for the leader with no leash
//     item; ServerHandleLeashBeep stands the leader in as ChatRoomLeashPlayer for its synchronous
//     check, then puts the real value back; ChatRoomCanLeave is false while the leader is here.
//   - HYPNOTIST: the subject's client tells theirs ("follow-on"), and theirs adds a Leash beep to
//     the subject on every ChatRoomPingLeashedPlayers.
//
// SUBJECT-AUTHORITATIVE (Rule 1). The hypnotist's client only sends beeps, and a beep pulls
// nobody unless the subject's own client has a compulsion on, from that sender. Nothing the
// hypnotist sends can turn one on. A hypnotist without ECHS sends no beep: the follow is still
// felt but cannot cross rooms, and the subject is told so when no acknowledgement comes back.

/** How long the subject waits for the hypnotist's ECHS to acknowledge "follow-on". */
const ACK_TIMEOUT_MS = 8_000;

// --- Subject side ------------------------------------------------------------------------

/** Whether a follow compulsion is currently on the subject. */
let followActive = false;
/** Who the subject is compelled to follow, or null when we cannot tell who spoke. Only this
 * member's beeps pull us. */
let followTarget: number | null = null;
/** Set when "follow-on" is sent; the acknowledgement clears it. */
let ackTimer: ReturnType<typeof setTimeout> | null = null;
/** The room a beep is taking us to, until we are in it. BC only checks the room it has already
 * synced, so a second beep for the same room mid-join would pull us back out (LSCG found this). */
let followingTo: string | null = null;

export function isFollowActive(): boolean {
	return followActive;
}

export function followTargetId(): number | null {
	return followTarget;
}

function characterFor(member: number | null): any {
	if (member == null || typeof ChatRoomCharacter === "undefined" || !Array.isArray(ChatRoomCharacter)) return null;
	return ChatRoomCharacter.find((c: any) => c?.MemberNumber === member) ?? null;
}

/** Nickname, else account name, else the number. Read off the character, as trust.ts does. */
function nameOf(member: number | null): string {
	const C = characterFor(member);
	const nick = typeof C?.Nickname === "string" ? C.Nickname.trim() : "";
	return nick || (typeof C?.Name === "string" && C.Name) || (member != null ? `#${member}` : "them");
}

/** Does the room we are in let anyone be led out of it? BC's own test (ChatRoomCanBeLeashedBy). */
export function roomAllowsLeashing(): boolean {
	const data: any = typeof ChatRoomData !== "undefined" ? ChatRoomData : null;
	return !Array.isArray(data?.BlockCategory) || !data.BlockCategory.includes("Leashing");
}

/** BC's own "allow others to leash you" (Preferences > Immersion, on by default).
 * ServerHandleLeashBeep returns at once unless it is truthy, so with it off nothing moves them. */
export function playerAllowsLeashing(): boolean {
	return !!Player?.OnlineSharedSettings?.AllowPlayerLeashing;
}

const TRAPPING_EFFECTS = ["Tethered", "Mounted", "Enclose", "OneWayEnclose"];

/** Tied to furniture, mounted or shut in something: BC refuses to lead such a player, and so do we. */
function isTrapped(C: any): boolean {
	return (C?.Appearance ?? []).some((item: any) =>
		TRAPPING_EFFECTS.some((e) => item?.Asset?.Effect?.includes?.(e) || item?.Property?.Effect?.includes?.(e)),
	);
}

/** Why a follow cannot cross rooms from here, or null if it can. */
export function followBlocker(): string | null {
	if (!playerAllowsLeashing()) return "their game setting that lets others leash them is off";
	if (!roomAllowsLeashing()) return "this room blocks leashing";
	return null;
}

function clearAckTimer(): void {
	if (ackTimer) clearTimeout(ackTimer);
	ackTimer = null;
}

/** Tell the leader's ECHS we follow them, and expect an answer. */
function announceTo(leader: number): void {
	sendHiddenMessage({ type: "follow-on" }, leader);
	clearAckTimer();
	ackTimer = setTimeout(() => {
		ackTimer = null;
		if (!followActive || followTarget !== leader) return;
		tellPlayer(`${nameOf(leader)} isn't running ECHS, so the pull you feel cannot lead you into another room.`);
		log(`follow: no acknowledgement from ${leader}`);
	}, ACK_TIMEOUT_MS);
}

/** Put the follow compulsion on. Returns null when it holds, or why it cannot lead the subject
 * anywhere (rule 5), in which case nothing is put on.
 *
 * Takes the leader rather than reading it from the session, so this module never has to import
 * session.ts (session.ts imports US, for teardown — the leaf rule). `quiet` is for a restore after
 * a reload: the leader is told again when they are next seen in the room, not now. */
export function applyFollow(leader: number | null, opts: { quiet?: boolean } = {}): string | null {
	const blocker = followBlocker();
	if (blocker) {
		log(`follow: not applied, ${blocker}`);
		return blocker;
	}
	// A change of leader lets the old one know first.
	if (followActive && followTarget != null && followTarget !== leader) sendHiddenMessage({ type: "follow-off" }, followTarget);
	followActive = true;
	followTarget = leader;
	// The old mechanism's injected effect, if a save from v1.0.1 or earlier put it back.
	if (hasOwnEffect("Leash")) removeEffect("Leash");
	if (leader != null) {
		if (opts.quiet) reannounceIfLeaderHere();
		else announceTo(leader);
	}
	log(`follow compulsion on, leader ${leader ?? "unknown"}`);
	return null;
}

/** Take the follow compulsion off. The one teardown, used by the spoken release, by a trigger
 * release, and by every session exit path (endSession / totalStop / recovery). Unconditional and
 * idempotent: safe to call when nothing is on, which is what a total-clear path needs. */
export function releaseFollow(): void {
	const had = followActive;
	const leader = followTarget;
	followActive = false;
	followTarget = null;
	followingTo = null;
	clearAckTimer();
	if (leader != null) {
		try {
			sendHiddenMessage({ type: "follow-off" }, leader);
		} catch (err) {
			warn("follow: could not tell the leader", err);
		}
	}
	// Clean up after the old mechanism: its injected effect, and a BC leash pointing at the
	// leader. A real collar leashed by someone else is not ours to cut.
	try {
		if (hasOwnEffect("Leash")) removeEffect("Leash");
		if (leader != null && typeof ChatRoomLeashPlayer !== "undefined" && ChatRoomLeashPlayer === leader) {
			ChatRoomLeashPlayer = null;
			if (typeof CharacterRefreshLeash === "function") CharacterRefreshLeash(Player);
		}
	} catch (err) {
		warn("follow: could not clear leash state", err);
	}
	if (had) log("follow compulsion off");
}

/** Session teardown alias — same body, named for the exit paths that call it. */
export const clearFollow = releaseFollow;

/** The leader is in our room again (they reloaded, or we were just brought in after them): tell
 * their ECHS once more, since a reload of theirs forgets who follows them. Quiet and untimed. */
function reannounceIfLeaderHere(): void {
	if (!followActive || followTarget == null || !characterFor(followTarget)) return;
	sendHiddenMessage({ type: "follow-on", again: true }, followTarget);
}

// --- Hypnotist side ----------------------------------------------------------------------

/** Who follows US: subjects whose ECHS said so. Beeped on every room change. It holds no power
 * of its own; each subject's client decides again when the beep arrives. */
const followers = new Set<number>();

export function followersOf(): number[] {
	return [...followers];
}

type ModApi = {
	hookFunction: (name: string, priority: number, fn: (args: any[], next: (args: any[]) => any) => any) => void;
};

export function installFollow(modApi: ModApi): void {
	// HYPNOTIST: a subject starts or stops following us.
	registerHiddenHandler("follow-on", (sender, message) => {
		const isNew = !followers.has(sender);
		followers.add(sender);
		sendHiddenMessage({ type: "follow-ack" }, sender);
		if (isNew && !message.again) {
			tellPlayer(`${nameOf(sender)} will follow you now. When you leave the room, the game brings them along.`);
		}
	});
	registerHiddenHandler("follow-off", (sender) => {
		if (followers.delete(sender)) tellPlayer(`${nameOf(sender)} no longer follows you.`);
	});
	// SUBJECT: the leader's ECHS heard us.
	registerHiddenHandler("follow-ack", (sender) => {
		if (sender === followTarget) clearAckTimer();
	});

	// HYPNOTIST: on every room change, call our followers after us, as BC does for a held leash.
	// BC's own list goes first and is left alone; anyone already on it is not beeped twice.
	modApi.hookFunction("ChatRoomPingLeashedPlayers", 10, (args, next) => {
		const result = next(args);
		const held = typeof ChatRoomLeashList !== "undefined" && Array.isArray(ChatRoomLeashList) ? ChatRoomLeashList : [];
		for (const member of followers) {
			if (held.includes(member)) continue;
			try {
				ServerSend("AccountBeep", { MemberNumber: member, BeepType: "Leash" });
			} catch (err) {
				warn("follow: could not call a follower", err);
			}
		}
		if (followers.size) log(`follow: called ${followers.size} follower(s) to ${ChatRoomData?.Name ?? "the new room"}`);
		return result;
	});

	// SUBJECT: the leader may lead us with no leash item, unless something BC itself respects
	// holds us in place. Everyone else gets BC's answer.
	modApi.hookFunction("ChatRoomCanBeLeashedBy", 10, (args, next) => {
		const [source, C] = args;
		if (
			followActive &&
			followTarget != null &&
			source === followTarget &&
			(C === Player || C?.IsPlayer?.()) &&
			roomAllowsLeashing() &&
			!isTrapped(C)
		) {
			return true;
		}
		return next(args);
	});

	// SUBJECT: BC follows only ChatRoomLeashPlayer's beep, and reads it before its first await, so
	// the leader stands in for that one check and the real value is put straight back.
	modApi.hookFunction("ServerHandleLeashBeep", 10, (args, next) => {
		const data = args[0];
		const fromLeader = followActive && followTarget != null && data?.MemberNumber === followTarget;
		if (!fromLeader) return next(args);
		if (followingTo !== null && data?.ChatRoomName === followingTo) return Promise.resolve();
		if (!playerAllowsLeashing()) {
			tellPlayer(`You feel the pull to follow ${nameOf(followTarget)}, but your setting that lets others leash you is off.`);
			return next(args);
		}
		const saved = ChatRoomLeashPlayer;
		ChatRoomLeashPlayer = followTarget;
		followingTo = typeof data?.ChatRoomName === "string" ? data.ChatRoomName : null;
		log(`follow: ${followTarget} went to ${data?.ChatRoomName}; following`);
		let result: any;
		try {
			result = next(args);
		} finally {
			if (ChatRoomLeashPlayer === followTarget) ChatRoomLeashPlayer = saved;
		}
		return Promise.resolve(result).finally(() => {
			followingTo = null;
		});
	});

	// SUBJECT: no walking out on the leader. Only while they are here: once they have gone, a
	// follow that failed (a locked or full room) must not strand us.
	modApi.hookFunction("ChatRoomCanLeave", 10, (args, next) => {
		if (followActive && followTarget != null && characterFor(followTarget) && roomAllowsLeashing()) return false;
		return next(args);
	});

	// SUBJECT: arriving in a room with the leader, or the leader arriving in ours.
	modApi.hookFunction("ChatRoomSync", 10, (args, next) => {
		const result = next(args);
		followingTo = null;
		reannounceIfLeaderHere();
		return result;
	});
	modApi.hookFunction("ChatRoomSyncMemberJoin", 10, (args, next) => {
		const result = next(args);
		if (followTarget != null && args[0]?.Character?.MemberNumber === followTarget) reannounceIfLeaderHere();
		return result;
	});
}
