import bcModSdk from "bondage-club-mod-sdk";
import { log } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommands, consumeSuppressFlag } from "./commands";

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

// No hook for wardrobe blocking — Player.CanChangeClothesOn is a method on the global
// Player object, and Player gets reassigned wholesale at login (CharacterCreatePlayer in
// Character.js replaces the pre-login placeholder with a fresh object). A hook applied at
// script-load time patches the placeholder and goes silently stale the moment you log in.
// wardrobeblock uses the native BlockWardrobe effect instead (see commands.ts) — same
// live-Player-reference technique Freeze already uses, so it can't go stale the same way.

safely("/hypno command registration", installCommands);
