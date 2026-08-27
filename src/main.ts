import bcModSdk from "bondage-club-mod-sdk";
import { log } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommandHook, isWardrobeBlocked, consumeSuppressFlag } from "./commands";

function showIndicator(): void {
	const el = document.createElement("div");
	el.textContent = "Hypnosis Add-on: loaded";
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
	});
	document.body.appendChild(el);
}

const modApi = bcModSdk.registerMod({
	name: "HypnosisAddon",
	fullName: "BC Hypnosis Add-on",
	version: "0.2.0",
	repository: "https://github.com/Dwfreegethub/HypnosisAddon",
});

// Hooking the real ChatRoomMessage function (not just observing the socket) is what
// lets us actually suppress a message, not just log it after BC already rendered it.
// `as any`: the SDK resolves each target's real signature via `typeof globalThis`, which
// doesn't know about BC's globals from our loose ambient declarations — cast rather than
// fight the generic, same as BCX/LSCG's own thin wrappers around this same SDK do.
modApi.hookFunction(
	"ChatRoomMessage",
	10,
	((args: [any], next: (args: [any]) => any) => {
		const data = args[0];
		if (handleIncomingHidden(data)) {
			return next(args);
		}
		if (data?.Type === "Action" && consumeSuppressFlag()) {
			log("suppressed Action message:", JSON.stringify(data));
			return undefined;
		}
		log("ChatRoomMessage", data);
		return next(args);
	}) as any,
);

modApi.hookFunction(
	"Player.CanChangeClothesOn",
	10,
	((args: [any], next: (args: [any]) => boolean) => {
		if (isWardrobeBlocked()) return false;
		return next(args);
	}) as any,
);

installCommandHook(modApi);

log("script loaded");
showIndicator();
