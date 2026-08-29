import bcModSdk from "bondage-club-mod-sdk";
import { log } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommands, consumeSuppressFlag } from "./commands";
import { installEffectAllowList, isSpeechBlocked, getScreenFade } from "./effects";
import { flavor } from "./flavor";
import { installMenu } from "./menu";
import { installRemote } from "./remote";
import { installSession } from "./session";
import { handleSpokenLine } from "./voice";
import { getFeatures } from "./storage";

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
			// Suppression has to come BEFORE next() — it works by never calling it.
			if (data?.Type === "Action" && (getFeatures().clothingRestriction || consumeSuppressFlag())) {
				log("suppressed Action message:", JSON.stringify(data));
				return undefined;
			}
			log("ChatRoomMessage", data);

			// Render the line FIRST, then react to it. Order matters: handleSpokenLine emits
			// flavor text via ChatRoomSendLocal, so running it before next() put our reaction
			// above the line that caused it ("Your knees fold under you." printing before
			// "GameBot: Missy Kneel"). Cause should read before effect.
			const result = next(args);

			// Spoken suggestions: ordinary chat we can hear from someone running a session
			// on us. Never consumes the message — the line is still said out loud, and the
			// effect (if any) lands alongside it.
			if ((data?.Type === "Chat" || data?.Type === "Whisper") && typeof data?.Content === "string") {
				try {
					handleSpokenLine(data.Sender, data.Content);
				} catch (err) {
					log("suggestion parsing failed:", err);
				}
			}
			return result;
		}) as any,
	);
});

// No hook for wardrobe blocking — Player.CanChangeClothesOn is a method on the global
// Player object, and Player gets reassigned wholesale at login (CharacterCreatePlayer in
// Character.js replaces the pre-login placeholder with a fresh object). A hook applied at
// script-load time patches the placeholder and goes silently stale the moment you log in.
// wardrobeblock uses the native BlockWardrobe effect instead (see commands.ts) — same
// live-Player-reference technique Freeze already uses, so it can't go stale the same way.

// Before anything that could receive an appearance sync — BC strips our injected effects
// out of any incoming sync unless this client's own asset allow-list already permits them.
safely("effect allow-list", installEffectAllowList);

// Speech blocking. ChatRoomSendChatMessage is the right hook rather than ChatRoomSendChat:
// it runs AFTER command parsing and after the emote and whisper branches, so being silenced
// leaves /hypno safeword reachable, emotes usable, and whispers open as an OOC lifeline —
// it only takes away ordinary room speech. BC blocks the same function for its own
// BlockTalk owner rule, and a falsy return leaves the typed text in the input box.
safely("speech-block hook", () => {
	modApi.hookFunction(
		"ChatRoomSendChatMessage",
		10,
		((args: [string], next: (args: [string]) => any) => {
			if (!isSpeechBlocked()) return next(args);
			log("speech blocked:", args[0]);
			ChatRoomSendLocal(flavor("speech-blocked-attempt"));
			return false;
		}) as any,
	);
});

// Trance veil. DrawProcess is BC's whole per-frame draw; painting after next() puts the
// veil over everything, including the chat room and any menu on top of it.
safely("screen-fade hook", () => {
	modApi.hookFunction(
		"DrawProcess",
		10,
		((args: [number], next: (args: [number]) => any) => {
			const result = next(args);
			const fade = getScreenFade();
			if (fade > 0) {
				MainCanvas.save();
				MainCanvas.fillStyle = `rgba(255, 255, 255, ${fade})`;
				MainCanvas.fillRect(0, 0, MainCanvasWidth, MainCanvasHeight);
				MainCanvas.restore();
			}
			return result;
		}) as any,
	);
});

// Before the command and remote registrations — both call into the session module, so its
// hidden-message handlers need to already be listening.
safely("session state machine", installSession);

safely("/hypno command registration", installCommands);
safely("preference menu registration", installMenu);
safely("remote (Information Sheet) registration", () => installRemote(modApi));
