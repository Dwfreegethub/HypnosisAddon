import { log } from "./log";

// Our namespace tag on the shared Type:"Hidden" ChatRoomChat channel — BCX uses
// "BCXMsg", LSCG uses "LSCGMsg". Ours must differ so we don't misparse (or get
// misparsed as) their traffic in the same room. See memory: bc-addon-conventions.
const HIDDEN_TAG = "HypnoMsg";

export interface HypnoMessage {
	type: string;
	[key: string]: unknown;
}

export function sendHiddenMessage(message: HypnoMessage, target?: number): void {
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
		const message = data?.Dictionary?.[0]?.message;
		if (message) {
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
