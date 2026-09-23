import bcModSdk from "bondage-club-mod-sdk";
import { log, warn, info } from "./log";
import { handleIncomingHidden } from "./messaging";
import { installCommands, consumeSuppressFlag } from "./commands";
import { installEffectAllowList, isSpeechBlocked, drawTranceVeil, hasOwnEffect } from "./effects";
import { announce } from "./flavor";
import { installMenu } from "./menu";
import { installIllusion } from "./illusion";
import { installPrompt } from "./prompt";
import { installRemote } from "./remote";
import { installSession, noteInductionLine } from "./session";
import { installSuppression } from "./suppression";
import { installFollow } from "./follow";
import { installTriggers } from "./triggers";
import { installSelfTouch } from "./selftouch";
import { installDenial } from "./denial";
import { handleSpokenLine, mentionsAnyName, playerOwnNames, isTriggerSetupLine, stripOOC } from "./voice";
import { noteConversation } from "./trust";
import { getFeatures } from "./storage";
import { setRoomVoice } from "./notify";
import { startStartupBanner, showLoadedToast } from "./welcome";

function safely(label: string, fn: () => void): void {
	try {
		fn();
	} catch (err) {
		warn(`FAILED to set up ${label}:`, err);
	}
}

// These run first and unconditionally — if anything below throws, this is still what
// confirms the script itself executed at all, instead of everything going silent.
info(`script loaded (v${__VERSION__})`);
// No load-time "TESTING MODE is ON" line any more: testing mode is now a runtime check on the
// chat room (isTestingMode in log.ts), off by default and on only in the Hypno Testing room, so
// there is nothing that could quietly ship switched on for it to warn about.
// A brief "loaded" note in the corner that fades out on its own — see showLoadedToast.
safely("loaded toast", showLoadedToast);
// The lasting record of the build is the chat line, once a chat log exists: it can be quoted
// back, which is how you find out which build somebody is actually running. Local to this
// player only.
safely("startup banner", startStartupBanner);

const modApi = bcModSdk.registerMod(
	{
		name: "ECHS",
		fullName: "Erotic Chat Hypnosis Suite",
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

			// OOC asides are discarded before ANY of the add-on reads the line. Parentheses
			// are BC's own convention for stepping out of a scene, and a player saying
			// "(brb)" must never fire a suggestion, build trust, or set off a trigger.
			// Computed once here so every consumer below sees the same in-character text;
			// null means the whole line was an aside, with nothing in character to react to.
			const inCharacter = typeof data?.Content === "string" ? stripOOC(data.Content) : null;

			// Trigger setup, hidden from the subject when they've asked for that. The line
			// still has to be PROCESSED — it's how the trigger gets built — so react to it
			// here and then don't call next(), rather than suppressing it wholesale.
			if ((data?.Type === "Chat" || data?.Type === "Whisper") && inCharacter) {
				try {
					if (isTriggerSetupLine(data.Sender, inCharacter)) {
						handleSpokenLine(data.Sender, inCharacter);
						log("hid trigger setup line from the subject");
						return undefined;
					}
				} catch (err) {
					warn("trigger-setup check failed:", err);
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
			if ((data?.Type === "Chat" || data?.Type === "Whisper") && inCharacter) {
				try {
					handleSpokenLine(data.Sender, inCharacter);
				} catch (err) {
					warn("suggestion parsing failed:", err);
				}
				// Roleplay during an induction window earns a bonus on the roll. Offered
				// every line; session.ts decides whether one counts. Kept out of
				// handleSpokenLine deliberately — this is not a suggestion and must not
				// inherit the name gate, since an induction is a monologue, not an order.
				try {
					noteInductionLine(data.Sender, inCharacter);
				} catch (err) {
					warn("induction RP counting failed:", err);
				}
				// Trust accrual, independent of any session — this is the slow path that
				// runs during ordinary conversation, long before anyone tries anything.
				try {
					const sender = ChatRoomCharacter?.find((c: any) => c?.MemberNumber === data.Sender);
					// A whisper is aimed at us by definition; otherwise it counts as directed
					// if they used our name. Same check the suggestion name-gate uses.
					const directed = data.Type === "Whisper" || mentionsAnyName(inCharacter, playerOwnNames());
					noteConversation(data.Sender, sender?.Name ?? `#${data.Sender}`, directed);
				} catch (err) {
					warn("trust accrual failed:", err);
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
// Before anything can speak: whether the room hears our emotes at all is a setting, and
// notify.ts takes it as a callback so it can stay a leaf module.
setRoomVoice(() => getFeatures().roomSeesReactions);

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
			// OOC asides pass by default even while silenced — see storage's blockOOC note.
			// A message that is ENTIRELY out of character (stripOOC returns null) goes
			// through as the subject's practical lifeline; anything with in-character content
			// left is still blocked, so real speech cannot be smuggled past behind parentheses.
			if (!getFeatures().blockOOC && stripOOC(args[0]) === null) return next(args);
			log("speech blocked:", args[0]);
			announce("speech-blocked-attempt");
			return false;
		}) as any,
	);
});

// The wardrobe's answer to speech-blocked-attempt. BlockWardrobe made BC refuse the
// wardrobe in total silence, so the one restriction with no attempt message at all was the
// one where the player is actively clicking a button and getting nothing back.
//
// Guarded on OUR effect rather than on CanChangeOwnClothes alone: a real locked outfit
// blocks the wardrobe too, and narrating somebody's actual chastity belt as hypnosis would
// be both wrong and confusing.
safely("wardrobe-block hook", () => {
	modApi.hookFunction(
		"ChatRoomOpenWardrobeScreen",
		10,
		((args: [], next: (args: []) => any) => {
			if (Player?.CanChangeOwnClothes?.() === false && hasOwnEffect("BlockWardrobe")) {
				announce("clothing-blocked-attempt");
				return undefined;
			}
			return next(args);
		}) as any,
	);
});

// Trance veil. Painted after ChatRoomRun's next(), so it lies over the room the player is
// looking at and only there — see drawTranceVeil for the rect and why it no longer rides
// DrawProcess. Priority 9, one BELOW prompt.ts's ChatRoomRun hook: the SDK calls higher
// priorities first, so this one runs inside the prompt's and the Agree / Ignore / Fight box
// paints over the veil rather than under it.
safely("screen-fade hook", () => {
	modApi.hookFunction(
		"ChatRoomRun",
		9,
		((args: [number], next: (args: [number]) => any) => {
			const result = next(args);
			drawTranceVeil();
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

// Holds an orgasm BC tries to start while OUR spoken denial is on, rather than trusting BC's
// DenialMode to — v0.83.1's live run showed it does not stop one. See denial.ts.
safely("orgasm denial hooks", () => installDenial(modApi));

// Scopes the follow/leash compulsion to the active hypnotist: while it is on, only they may
// take the subject's (add-on-injected) leash. See follow.ts.
safely("follow-leash hook", () => installFollow(modApi));

safely("/hypno command registration", installCommands);
safely("preference menu registration", installMenu);
safely("remote (Information Sheet) registration", () => installRemote(modApi));

// The in-room Agree / Ignore / Fight box. After installSession, whose state it reads.
safely("induction prompt box", () => installPrompt(modApi));

// Draws the subject's own body from a frozen snapshot. Hooks DrawCharacter, the single
// funnel every screen uses — see illusion.ts for why Player itself is never touched.
safely("clothing illusion", () => installIllusion(modApi));
