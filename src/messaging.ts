import { log } from "./log";
import { getFeatures } from "./storage";

// Our namespace tag on the shared Type:"Hidden" ChatRoomChat channel — BCX uses
// "BCXMsg", LSCG uses "LSCGMsg". Ours must differ so we don't misparse (or get
// misparsed as) their traffic in the same room. See memory: bc-addon-conventions.
const HIDDEN_TAG = "HypnoMsg";

export interface HypnoMessage {
	type: string;
	[key: string]: unknown;
}

type Handler = (sender: number, message: HypnoMessage) => void;
const handlers = new Map<string, Handler>();

/** Register what happens when a message of this `type` arrives on our channel. Kept as
 * a plain dispatch table here (rather than each feature's own module reaching into
 * ChatRoomMessage directly) so messaging.ts stays a pure transport layer — feature
 * modules (remote.ts, etc.) register into it instead of it needing to import them back,
 * which would be circular since they already import sendHiddenMessage from here. */
export function registerHiddenHandler(type: string, handler: Handler): void {
	handlers.set(type, handler);
}

// Message types exempted from the Hidden Activities gate below. state-query/state-response
// only report a player's own permission flags to someone already looking at their profile
// and never apply anything by themselves. remote-request already carries its own specific
// consent check (hypnoEnabled + the matching movementRestriction/clothingRestriction flag,
// enforced target-side in remote.ts's handler) — gating it here too meant a VIEWER's own
// unrelated Hidden Activities setting silently dropped their outbound click before it ever
// reached the target, which is why "restrict" appeared to do nothing. Right now this means
// Hidden Activities doesn't gate anything yet — every message type that exists today is
// exempt — but it stays in place for whatever future covert-content feature needs it.
const ALWAYS_ALLOWED_TYPES = new Set(["state-query", "state-response", "remote-request"]);

export function sendHiddenMessage(message: HypnoMessage, target?: number): void {
	if (!ALWAYS_ALLOWED_TYPES.has(message.type) && !getFeatures().hiddenActivities) {
		log("Hidden Activities is off — not sending", message);
		return;
	}
	ServerSend("ChatRoomChat", {
		Content: HIDDEN_TAG,
		Type: "Hidden",
		Target: target ?? null,
		Dictionary: [{ message }],
	});
}

/** Returns true if this was one of ours (handled), false if the hook should keep looking. */
export function handleIncomingHidden(data: any): boolean {
	if (data?.Type === "Hidden" && data?.Content === HIDDEN_TAG && typeof data?.Sender === "number") {
		const message = data?.Dictionary?.[0]?.message as HypnoMessage | undefined;
		if (!message) return true;
		if (!ALWAYS_ALLOWED_TYPES.has(message.type) && !getFeatures().hiddenActivities) return true; // ours, but disabled — consume silently
		const handler = handlers.get(message.type);
		if (handler) {
			handler(data.Sender, message);
		} else {
			log(`hidden message from ${data.Sender}:`, message);
			// Visible on the receiving screen too — console-only here would make a
			// successful round trip look identical to a message that never arrived.
			// No timeout — stays in the log rather than fading after a few seconds.
			ChatRoomSendLocal(`hidden message from ${data.Sender}: ${JSON.stringify(message)}`);
		}
		return true;
	}
	return false;
}
