import { log } from "./log";
import { getFeatures } from "./storage";
import { applyEffect } from "./effects";

// Our namespace tag on the shared Type:"Hidden" ChatRoomChat channel — BCX uses
// "BCXMsg", LSCG uses "LSCGMsg". Ours must differ so we don't misparse (or get
// misparsed as) their traffic in the same room. See memory: bc-addon-conventions.
const HIDDEN_TAG = "HypnoMsg";

export interface HypnoMessage {
	type: string;
	[key: string]: unknown;
}

export type RemoteFeature = "movement" | "clothing";

// Subject-authoritative, per the design doc: a remote request is only ever a request —
// this client decides for itself whether to honor it, based on its OWN locally-stored
// permission settings, never anything the requester's client asserts about itself.
function handleRemoteRequest(sender: number, message: HypnoMessage): void {
	const feature = message.feature as RemoteFeature;
	const features = getFeatures();
	if (!features.hypnoEnabled) {
		log(`remote request (${feature}) from ${sender} denied — Hypnosis Enabled is off`);
		return;
	}
	if (feature === "movement") {
		if (!features.movementRestriction) {
			log(`remote request (movement) from ${sender} denied — not permitted`);
			return;
		}
		applyEffect("Freeze");
		ChatRoomSendLocal(`${sender} triggers a movement restriction on you.`);
	} else if (feature === "clothing") {
		if (!features.clothingRestriction) {
			log(`remote request (clothing) from ${sender} denied — not permitted`);
			return;
		}
		applyEffect("BlockWardrobe");
		ChatRoomSendLocal(`${sender} triggers a clothing restriction on you.`);
	}
}

export function sendHiddenMessage(message: HypnoMessage, target?: number): void {
	if (!getFeatures().hiddenActivities) {
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
		if (!getFeatures().hiddenActivities) return true; // ours, but disabled — consume silently
		const message = data?.Dictionary?.[0]?.message as HypnoMessage | undefined;
		if (message?.type === "remote-request") {
			handleRemoteRequest(data.Sender, message);
		} else if (message) {
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
