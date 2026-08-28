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

// Message types gated behind the Hidden Activities setting. Deliberately EMPTY right now.
//
// This started as a blanket gate on the whole channel and caused two separate bugs before
// being narrowed to nothing: it silently swallowed the state-query/state-response
// handshake (so the remote panel's gray-out hung forever against anyone with the setting
// off), and it dropped a VIEWER's own outbound remote-request before it was ever sent.
//
// The lesson is that this channel carries *protocol*, and protocol must not be gated by a
// content preference. Every consent decision already lives where it belongs: per-feature
// permission flags plus an active session, both enforced on the subject's own client at
// the point of effect. A future covert-content feature — something whose *existence*
// should be hideable, not merely refusable — is what this set is for. Add types here only
// if you can say why refusing them target-side isn't enough.
const GATED_TYPES = new Set<string>();

export function sendHiddenMessage(message: HypnoMessage, target?: number): void {
	if (GATED_TYPES.has(message.type) && !getFeatures().hiddenActivities) {
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
		if (GATED_TYPES.has(message.type) && !getFeatures().hiddenActivities) return true; // ours, but disabled — consume silently
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
