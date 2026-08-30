import bcModSdk from "bondage-club-mod-sdk";
import { log } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommands, consumeSuppressFlag } from "./commands";
import { installEffectAllowList, isSpeechBlocked, getScreenFade } from "./effects";
import { flavor } from "./flavor";
import { installMenu } from "./menu";
import { installPrompt } from "./prompt";
import { installRemote } from "./remote";
import { installSession } from "./session";
import { installSuppression } from "./suppression";
import { installTriggers } from "./triggers";
import { installSelfTouch } from "./selftouch";
import { handleSpokenLine, mentionsAnyName, playerOwnNames, isTriggerSetupLine } from "./voice";
import { noteConversation } from "./trust";
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
			//
			// Deliberately NOT tied to the clothingRestriction permission any more. It used
			// to be, on the reasoning that the design doc groups message suppression with
			// wardrobe blocking under "Clothing Confusion" — but that was wrong twice over:
			// it fired with no session active (so granting the permission silently ate
			// messages during ordinary play, with no setting that admitted to doing it), and
			// it swallowed EVERY Action message rather than only clothing ones.
			//
			// Until the three-way split exists (ignore clothing / ignore bondage / ignore
			// activities done to me), the only thing that suppresses anything is the explicit
			// /hypno suppress test command. Nothing suppresses by default.
			if (data?.Type === "Action" && consumeSuppressFlag()) {
				log("suppressed Action message:", JSON.stringify(data));
				return undefined;
			}
			log("ChatRoomMessage", data);

			// Trigger setup, hidden from the subject when they've asked for that. The line
			// still has to be PROCESSED — it's how the trigger gets built — so react to it
			// here and then don't call next(), rather than suppressing it wholesale.
			if ((data?.Type === "Chat" || data?.Type === "Whisper") && typeof data?.Content === "string") {
				try {
					if (isTriggerSetupLine(data.Sender, data.Content)) {
						handleSpokenLine(data.Sender, data.Content);
						log("hid trigger setup line from the subject");
						return undefined;
					}
				} catch (err) {
					log("trigger-setup check failed:", err);
				}
			}

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
				// Trust accrual, independent of any session — this is the slow path that
				// runs during ordinary conversation, long before anyone tries anything.
				try {
					const sender = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === data.Sender);
					// A whisper is aimed at us by definition; otherwise it counts as directed
					// if they used our name. Same check the suggestion name-gate uses.
					const directed = data.Type === "Whisper" || mentionsAnyName(data.Content, playerOwnNames());
					noteConversation(data.Sender, sender?.Name ?? `#${data.Sender}`, directed);
				} catch (err) {
					log("trust accrual failed:", err);
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
safely("trigger status channel", installTriggers);

// Registers into BC's own message-handler chain at a priority chosen so arousal still
// applies — see suppression.ts for why 320 specifically.
safely("message suppression", installSuppression);

// Blocks self-directed activities outright (no arousal, no message) rather than hiding
// them — see selftouch.ts for why ActivityRun and not the handler chain.
safely("self-touch hook", () => installSelfTouch(modApi));

safely("/hypno command registration", installCommands);
safely("preference menu registration", installMenu);
safely("remote (Information Sheet) registration", () => installRemote(modApi));

// The in-room Agree / Ignore / Fight box. After installSession, whose state it reads.
safely("induction prompt box", () => installPrompt(modApi));
