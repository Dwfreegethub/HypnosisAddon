import { warn } from "./log";

// The Accept / Decline popup (v1.16.1, job6.md §3, DW 2026-11-22: "a pop up instead of a chat request.
// No answer is a decline"). A box over the game asking the player one yes-or-no question someone
// else raised: today a request for her keys; later (job6.md stages 5 and 6) a keyholder lock and a
// keyholder-started Extreme lock. No answer within ASK_TIMEOUT_MS is a Decline.
//
// One at a time: while one is open, askPlayer refuses another (the caller tells the asker to try
// again shortly) rather than stacking boxes over the game.
//
// The countdown runs on a once-a-second interval that reads the clock, rather than a single timer,
// so a background tab that throttles timers still ends it on time once it next ticks, and the suite
// can drive it.

export const ASK_ID = "echs-ask";
export const ASK_TIMEOUT_MS = 30_000;

export type AskAnswer = "accept" | "decline" | "timeout";

type Pending = { resolve: (a: AskAnswer) => void; el: any; countdown: any; deadline: number; poll: any };
let pending: Pending | null = null;

/** Is a question on screen now? */
export function askOpen(): boolean {
	return pending !== null;
}

function el(tag: string, text?: string, style?: Record<string, string>): any {
	const e: any = document.createElement(tag);
	if (text !== undefined) e.textContent = text;
	if (style) Object.assign(e.style, style);
	return e;
}

function secondsLeft(now: number): number {
	return pending ? Math.max(0, Math.ceil((pending.deadline - now) / 1000)) : 0;
}

function finish(answer: AskAnswer): void {
	const p = pending;
	if (!p) return;
	pending = null;
	try {
		clearInterval(p.poll);
		p.el.remove();
	} catch (err) {
		warn("could not close the question box:", err);
	}
	p.resolve(answer);
}

/** The once-a-second beat: the countdown's words, and the timeout. Exported for the suite. */
export function tickAsk(now: number = Date.now()): void {
	if (!pending) return;
	if (now >= pending.deadline) {
		finish("timeout");
		return;
	}
	pending.countdown.textContent = `No answer in ${secondsLeft(now)} s declines.`;
}

/** Answer the open question as if its button were clicked. For the suite, and for leaving a room. */
export function answerAsk(answer: AskAnswer): void {
	finish(answer);
}

/** Ask the player. Resolves with her answer, or "timeout". Null when a question is already open or
 * there is no page to show it on: the caller treats that as not asked. */
export function askPlayer(opts: { title: string; lines: string[]; accept?: string; decline?: string; timeoutMs?: number }): Promise<AskAnswer> | null {
	if (pending || typeof document === "undefined" || !document.body) return null;
	const timeoutMs = opts.timeoutMs ?? ASK_TIMEOUT_MS;
	const box = el("div", undefined, {
		position: "fixed",
		top: "28%",
		left: "50%",
		transform: "translateX(-50%)",
		zIndex: "10001",
		maxWidth: "460px",
		minWidth: "300px",
		padding: "14px 16px",
		background: "rgba(30, 20, 40, 0.97)",
		color: "#fff",
		border: "2px solid #c08cff",
		borderRadius: "10px",
		fontFamily: "Arial, sans-serif",
		fontSize: "15px",
		boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
	});
	box.id = ASK_ID;
	box.appendChild(el("div", opts.title, { fontWeight: "bold", fontSize: "17px", marginBottom: "8px" }));
	for (const line of opts.lines) box.appendChild(el("div", line, { marginBottom: "6px", lineHeight: "1.3" }));
	const countdown = el("div", "", { color: "#bbb", fontSize: "13px", margin: "6px 0 10px" });
	box.appendChild(countdown);
	const row = el("div", undefined, { display: "flex", gap: "10px", justifyContent: "flex-end" });
	const button = (label: string, answer: AskAnswer, bg: string) => {
		const b = el("button", label, { padding: "6px 16px", fontSize: "15px", cursor: "pointer", background: bg, color: "#fff", border: "none", borderRadius: "6px" });
		b.type = "button";
		b.addEventListener("click", () => finish(answer));
		return b;
	};
	row.appendChild(button(opts.decline ?? "Decline", "decline", "#555"));
	row.appendChild(button(opts.accept ?? "Accept", "accept", "#7a3fc4"));
	box.appendChild(row);
	document.body.appendChild(box);
	return new Promise<AskAnswer>((resolve) => {
		pending = { resolve, el: box, countdown, deadline: Date.now() + timeoutMs, poll: setInterval(() => tickAsk(), 1000) };
		tickAsk();
	});
}
