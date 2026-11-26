import { log } from "./log";
import { wrapToWidth } from "./panel";
import { answerPrompt, getPendingPrompt, SessionChoice, getPendingExtend, answerExtend } from "./session";

// The in-room choice box for an induction attempt.
//
// The prompt has always existed — it just lived entirely in chat, answered with
// /echs agree|ignore|fight. That works, but it asks the player to notice a line of text
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
// Taller since v1.16.41 (review F11): the instinct line wraps to two lines at the size of the
// lines around it, instead of shrinking to a third of it. The buttons have not moved.
const PANEL_TOP = 200;
const PANEL_WIDTH = 700;
const PANEL_HEIGHT = 350;
/** The first line, and every line under it: one size for all of them (review F11). */
const TITLE_SIZE = 36;
const LINE_SIZE = 30;

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

const font = (n: number) => (typeof CommonGetFont === "function" ? CommonGetFont(n) : `${n}px arial`);

/** One centred line at a fixed size. Too long (a long player name) squeezes it to fit rather
 * than shrinking the size, so it stays the size of the lines around it. Exported for the suite. */
export function drawCentred(text: string, y: number, size: number, color: string): void {
	MainCanvas.save();
	MainCanvas.textAlign = "center";
	MainCanvas.textBaseline = "middle";
	MainCanvas.font = font(size);
	MainCanvas.fillStyle = color;
	MainCanvas.fillText(text, PANEL_LEFT + PANEL_WIDTH / 2, y, PANEL_WIDTH - 40);
	MainCanvas.restore();
}

/** The instinct line, wrapped at LINE_SIZE: at most two lines (the longest is ~80 characters). */
export function descriptorLines(descriptor: string): string[] {
	MainCanvas.save();
	MainCanvas.font = font(LINE_SIZE);
	const lines = wrapToWidth(descriptor, PANEL_WIDTH - 60);
	MainCanvas.restore();
	return lines;
}

/** Exported for the suite, which records what it draws. */
export function drawPrompt(hypnotistName: string, remainingMs: number, descriptor: string | null): void {
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	DrawEmptyRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "Black", 4);

	drawCentred(`${hypnotistName} is trying to hypnotize you.`, PANEL_TOP + 45, TITLE_SIZE, "Black");
	drawCentred("They are never told which you choose.", PANEL_TOP + 92, LINE_SIZE, "Gray");
	// The instinct line, when she has a read on them. Darker grey, between the fixed lines and
	// the countdown — a feeling about herself, not a fact about him, styled to read that way.
	const instinct = descriptor ? descriptorLines(descriptor) : [];
	instinct.forEach((line, i) => drawCentred(line, PANEL_TOP + 135 + i * 36, LINE_SIZE, "#444"));
	drawCentred(
		`${Math.ceil(remainingMs / 1000)}s — no answer counts as Ignore.`,
		PANEL_TOP + (instinct.length ? 135 + instinct.length * 36 + 10 : 150),
		LINE_SIZE,
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

// --- "Stay under?" (v1.2.0) -----------------------------------------------------------------
// The same panel, asked when the trance's thirty minutes run out. Two buttons, centred.

const EXTEND_BUTTONS: { stay: boolean; label: string; hover: string; left: number }[] = [
	{ stay: true, label: "Stay under", hover: "Another stretch of trance. You will be asked again when it is up.", left: 260 },
	{ stay: false, label: "Wake up", hover: "Let the trance end now.", left: 540 },
];

function drawExtend(remainingMs: number, minutes: number): void {
	DrawRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "White");
	DrawEmptyRect(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT, "Black", 4);
	drawCentred(`Your trance has run its ${minutes} minutes.`, PANEL_TOP + 70, TITLE_SIZE, "Black");
	drawCentred(`Stay under for another ${minutes}?`, PANEL_TOP + 125, TITLE_SIZE, "Black");
	drawCentred(`${Math.ceil(remainingMs / 1000)}s — no answer wakes you.`, PANEL_TOP + 190, LINE_SIZE, "Gray");
	for (const b of EXTEND_BUTTONS) DrawButton(b.left, BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT, b.label, "White", "", b.hover);
}

function clickExtend(): boolean {
	for (const b of EXTEND_BUTTONS) {
		if (MouseIn(b.left, BUTTON_TOP, BUTTON_WIDTH, BUTTON_HEIGHT)) {
			log(`extend box answered: ${b.stay ? "stay" : "wake"}`);
			answerExtend(b.stay);
			return true;
		}
	}
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
			const extend = getPendingExtend();
			if (extend) drawExtend(extend.remainingMs, extend.minutes);
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
			if (getPendingExtend() && clickExtend()) return undefined;
			return next(args);
		}) as any,
	);
}
