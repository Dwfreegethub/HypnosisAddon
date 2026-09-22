import { log, warn } from "./log";
import { applyEffect, removeEffect, hasOwnEffect } from "./effects";

// Follow / leash — the design doc's Feature List, Tier 1 ("works on anyone, BC native
// systems"), gated at Entranced.
//
// THE MECHANISM, verified against the live client (ChatRoom.js / Inventory.js, R-master):
// the cross-room follow is BC's OWN leash, so it works even when the hypnotist has no add-on.
// Whoever HOLDS a leash pings and beeps their leashed targets on every room change
// (ChatRoomPingLeashedPlayers), and that beep carries the destination and pulls the target
// along. To be leashable, ChatRoomCanBeLeashedBy wants an appearance item carrying the
// "Leash" effect — which the subject usually will not have — so the hypnotic half is to
// inject that effect onto the always-worn Emoticon carrier (the same trick effects.ts uses
// for Freeze). That makes the subject leashable ON COMMAND; the hypnotist then takes the
// leash through BC's ordinary UI and BC does the rest.
//
// SUBJECT-AUTHORITATIVE (Rule 1). The add-on never reaches into the hypnotist's client to
// grab a leash — it only makes the subject's own body leashable and lets BC lead. And it
// SCOPES that: while the compulsion is on, installFollow's hook lets ONLY the active
// hypnotist actually take the leash, so becoming leashable does not mean anyone in the room
// can pick it up. The subject's client decides, from its own session state, every time.

const LEASH_EFFECT = "Leash";

/** Whether a follow compulsion is currently on the subject. */
let followActive = false;
/** The hypnotist the subject is compelled to follow — the only member the leash-hold hook
 * will honour while the compulsion is on. Null means "not scoped" (compulsion off). */
let followTarget: number | null = null;

export function isFollowActive(): boolean {
	return followActive;
}

export function followTargetId(): number | null {
	return followTarget;
}

/** Put the follow compulsion on: make the subject leashable and remember who may lead them.
 *
 * Takes the leader rather than reading it from the session, so this module never has to
 * import session.ts (session.ts imports US, for teardown — the leaf rule). The caller in
 * voice.ts already knows the hypnotist and passes it. A null leader still applies the
 * compulsion — the subject feels it — but no one is scoped to lead, which is the honest
 * state when we cannot tell who spoke (e.g. a self-fired trigger with no room). */
export function applyFollow(leader: number | null): void {
	followActive = true;
	followTarget = leader;
	applyEffect(LEASH_EFFECT);
	log(`follow compulsion on, leader ${leader ?? "unknown"}`);
}

/** Take the follow compulsion off: strip the leashability and break any live leash the leader
 * had on us, so waking does not leave the subject still trotting after them.
 *
 * The one teardown, used by the spoken release, by a trigger release, and by every session
 * exit path (endSession / totalStop / recovery). Unconditional and idempotent: it is safe to
 * call when nothing is on, which is what a total-clear path needs. */
export function releaseFollow(): void {
	const had = followActive || hasOwnEffect(LEASH_EFFECT);
	removeEffect(LEASH_EFFECT);
	// Break a leash the leader currently holds on us. Only when it points at THEM: a real
	// collar leashed by someone else is not ours to cut, and a woken subject who is genuinely
	// another player's pet should stay that way. ChatRoomLeashPlayer is BC's record of who
	// leads us; clearing it is what ChatRoomBreakLeash does, minus the toast.
	try {
		if (
			typeof ChatRoomLeashPlayer !== "undefined" &&
			ChatRoomLeashPlayer != null &&
			followTarget != null &&
			ChatRoomLeashPlayer === followTarget
		) {
			ChatRoomLeashPlayer = null;
			if (typeof CharacterRefreshLeash === "function") CharacterRefreshLeash(Player);
		}
	} catch (err) {
		warn("follow: could not clear leash state", err);
	}
	followActive = false;
	followTarget = null;
	if (had) log("follow compulsion off");
}

/** Session teardown alias — same body, named for the exit paths that call it. */
export const clearFollow = releaseFollow;

/** Hook the leash-hold handshake so that, while the compulsion is on, only the scoped
 * hypnotist can actually take the leash. Without this, injecting the Leash effect would let
 * anyone in the room pick the subject up — a consent hole the design does not intend.
 *
 * ChatRoomDoHoldLeash(SenderCharacter) is what runs on OUR client when someone sends a
 * HoldLeash; BC's own body sets ChatRoomLeashPlayer to the sender if they may leash us. We
 * gate that: an off-target grab while compelled is refused the same way BC refuses an
 * unleashable target — a RemoveLeash sent back so the would-be holder drops it — and BC's
 * body never runs. Every other case (compulsion off, or the sender IS the leader) falls
 * straight through to next(), so ordinary leashing outside a session is untouched. */
export function installFollow(modApi: {
	hookFunction: (name: string, priority: number, fn: (args: any[], next: (args: any[]) => any) => any) => void;
}): void {
	modApi.hookFunction("ChatRoomDoHoldLeash", 10, (args: any[], next: (args: any[]) => any) => {
		const sender = args?.[0];
		if (followActive && followTarget != null && sender?.MemberNumber !== followTarget) {
			log(`follow: refused leash grab by ${sender?.MemberNumber} — only ${followTarget} may lead`);
			try {
				ServerSend("ChatRoomChat", { Content: "RemoveLeash", Type: "Hidden", Target: sender?.MemberNumber });
				if (typeof CharacterRefreshLeash === "function") CharacterRefreshLeash(Player);
			} catch (err) {
				warn("follow: could not refuse leash grab", err);
			}
			return undefined;
		}
		return next(args);
	});
}
