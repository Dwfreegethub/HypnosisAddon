import { log } from "./log";
import { answerPrompt, getPendingPrompt, SessionChoice } from "./session";

// The in-room choice box for an induction attempt.
//
// The prompt has always existed — it just lived entirely in chat, answered with
// /hypno agree|ignore|fight. That works, but it asks the player to notice a line of text
// scrolling past and then type, inside a 60-second window, at the exact moment their
// attention is on the other character. A box on the screen is what a consent prompt should
// look like.
//
// It is deliberately an ADDITIONAL way to answer, not a replacement: the chat commands
// stay, because ChatRoomRun only runs on the chat room screen. A player sitting in the
// wardrobe or the preferences screen when the attempt lands sees no box at all, and the
// commands are the only thing that reaches them. Both paths call the same answerPrompt(),
// and both read the same session state — there is one prompt, with two ways to answer it.
//
// Hook points verified against the live client (Screens/Online/ChatRoom/ChatRoom.js):
// ChatRoomRun(time) draws the room, and ChatRoomClick(event) dispatches clicks. The
// character half of the screen is x 0-1003 (ChatRoomDrawArousalOverlay fills exactly that
// rect), so the box sits there and never covers the chat log or the input box — the player
// can still read the room and still type, including their safeword.

const PANEL_LEFT = 150;
const PANEL_TOP = 250;
const PANEL_WIDTH = 700;
const PANEL_HEIGHT = 300;

const BUTTON_TOP = 450;
const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 70;
// 175 / 400 / 625: three 200-wide buttons with 25 gaps, centred under the panel. The whole
// row ends at 520, which keeps it clear of BC's own orgasm-overlay buttons at y 532-600 —
// those draw over this same area and are the one thing that can legitimately compete for
// a click here.
const BUTTON_GAP = 25;
const FIRST_BUTTON_LEFT = 175;

interface ChoiceButton {
	choice: SessionChoice;
	label: string;
	hover: string;
}

const CHOICES: ChoiceButton[] = [
	{ choice: "agree", label: "Agree", hover: "Let it happen. Much more likely to go under." },
	{ choice: "ignore", label: "Ignore", hover: "Neither help nor resist. No bonus either way." },
	{ choice: "fight", label: "Fight", hover: "Brace against it. Much more likely to stay clear." },
];

function buttonLeft(index: number): number {
	return FIRST_BUTTON_LEFT + index * (BUTTON_WIDTH + BUTTON_GAP);
}

function drawPrompt(hypnotistName: string, remainingMs: number, descriptor: string | null): void {
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	DrawEmptyRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "Black", 4);

	const centre = PANEL_LEFT + PANEL_WIDTH / 2;
	const inner = PANEL_WIDTH - 40;
	// DrawTextFit rather than DrawText for the name line specifically — player names run
	// long, and a name overflowing the panel would look broken at the one moment the
	// player most needs to read it.
	DrawTextFit(`${hypnotistName} is trying to hypnotize you.`, centre, PANEL_TOP + 55, inner, "Black");
	DrawTextFit("They are never told which you choose.", centre, PANEL_TOP + 105, inner, "Gray");
	// The instinct line, when she has a read on them. Grey, between the fixed lines and the
	// countdown — a feeling about herself, not a fact about him, styled to read that way.
	if (descriptor) DrawTextFit(descriptor, centre, PANEL_TOP + 138, inner, "#444");
	DrawTextFit(
		`${Math.ceil(remainingMs / 1000)}s — no answer counts as Ignore.`,
		centre,
		PANEL_TOP + 175,
		inner,
		"Gray",
	);

	CHOICES.forEach((c, i) => {
		DrawButton(buttonLeft(i), BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT, c.label, "White", "", c.hover);
	});
}

/** Returns true if the click belonged to us and must not fall through to the room. */
function clickPrompt(): boolean {
	for (let i = 0; i < CHOICES.length; i++) {
		if (MouseIn(buttonLeft(i), BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT)) {
			log(`prompt box answered: ${CHOICES[i].choice}`);
			answerPrompt(CHOICES[i].choice);
			return true;
		}
	}
	// Swallow clicks anywhere else on the panel too. Without this, a miss lands on
	// whichever character happens to be behind the box and opens their dialog — which,
	// mid-prompt, reads as the box having done something it didn't.
	return MouseIn(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT);
}

export function installPrompt(modApi: any): void {
	modApi.hookFunction(
		"ChatRoomRun",
		10,
		((args: [number], next: (args: [number]) => any) => {
			const result = next(args);
			// After next(), so the box paints over the room rather than under it.
			const pending = getPendingPrompt();
			if (pending) drawPrompt(pending.hypnotistName, pending.remainingMs, pending.descriptor);
			return result;
		}) as any,
	);

	modApi.hookFunction(
		"ChatRoomClick",
		10,
		((args: [any], next: (args: [any]) => any) => {
			// Before next(), so a click on the box is consumed instead of also reaching
			// whatever the box is covering.
			if (getPendingPrompt() && clickPrompt()) return undefined;
			return next(args);
		}) as any,
	);
}
