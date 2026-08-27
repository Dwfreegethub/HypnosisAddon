import bcModSdk from "bondage-club-mod-sdk";
import { log } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommands, isWardrobeBlocked, consumeSuppressFlag } from "./commands";

function showIndicator(): void {
	const el = document.createElement("div");
	el.textContent = `Hypnosis Add-on v${__VERSION__} loaded`;
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

function safely(label: string, fn: () => void): void {
	try {
		fn();
	} catch (err) {
		log(`FAILED to set up ${label}:`, err);
	}
}

// These two run first and unconditionally — if anything below throws, this is still what
// confirms the script itself executed at all, instead of everything going silent.
log(`script loaded (v${__VERSION__})`);
showIndicator();

const modApi = bcModSdk.registerMod(
	{
		name: "HypnosisAddon",
		fullName: "BC Hypnosis Add-on",
		version: __VERSION__,
		repository: "https://github.com/Dwfreegethub/HypnosisAddon",
	},
	// Dev builds get reloaded into the same page repeatedly; allow replacing a prior
	// registration under the same name rather than throwing on the second load.
	{ allowReplace: true },
);

// Hooking the real ChatRoomMessage function (not just observing the socket) is what
// lets us actually suppress a message, not just log it after BC already rendered it.
// `as any`: the SDK resolves each target's real signature via `typeof globalThis`, which
// doesn't know about BC's globals from our loose ambient declarations — cast rather than
// fight the generic, same as BCX/LSCG's own thin wrappers around this same SDK do.
safely("ChatRoomMessage hook", () => {
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
});

safely("wardrobe block hook", () => {
	modApi.hookFunction(
		"Player.CanChangeClothesOn",
		10,
		((args: [any], next: (args: [any]) => boolean) => {
			if (isWardrobeBlocked()) return false;
			return next(args);
		}) as any,
	);
});

safely("/hypno command registration", installCommands);
