import { suggestionHelp, ILLUSION_TRUST_THRESHOLD } from "./voice";
import { commandHelp } from "./commands";
import { getTriggerDuration, getTriggerScope, getMaxAttempts } from "./storage";
import { TRIGGER_SCOPES, TRIGGER_TRUST_THRESHOLD } from "./triggers";
import { CARRY_TRUST_THRESHOLD } from "./carry";
import {
	TITLE_Y,
	BLURB_Y,
	CONTENT_LEFT,
	PANEL_LEFT,
	PANEL_TOP,
	PANEL_WIDTH,
	PANEL_HEIGHT,
	BACK_LEFT,
	BACK_TOP,
	BACK_SIZE,
	tabHitIndex,
	drawLeftText,
	drawTabsAndPanel,
	drawHelpLines,
	HelpLine,
} from "./panel";

// The help screen, reachable from both the settings screen and the remote panel.
//
// GENERATED, not written out. The vocabulary tab is built from voice.ts's own suggestion
// table and the command tab from commands.ts's own list, because the one thing this file
// must never do is describe a version of the add-on that no longer exists. That has already
// happened once to the `/hypno` summary, which is why it is generated now too.
//
// What IS hand-written here is the connective prose — how the loop fits together, what the
// gates mean. None of it repeats a value that lives in code: thresholds, durations and the
// current scope are all read live.

let open = false;
let activeTab = 0;
let page = 0;

export function isHelpOpen(): boolean {
	return open;
}

export function openHelp(): void {
	open = true;
	activeTab = 0;
	page = 0;
}

export function closeHelp(): void {
	open = false;
}

// --- Tab content ---------------------------------------------------------------------

const head = (text: string): HelpLine => ({ text, style: "head" });
const body = (text: string): HelpLine => ({ text });
const dim = (text: string): HelpLine => ({ text, style: "dim" });
const gap = (): HelpLine => ({ text: "", style: "gap" });

function startedLines(): HelpLine[] {
	return [
		head("The short version"),
		body("Almost nothing here is a command. You SPEAK to someone,"),
		body("and their own client decides whether anything lands."),
		gap(),
		head("As the subject"),
		body("1. Tick permissions. Everything is off until you say so."),
		body("2. Someone attempts hypnosis; you get Agree / Ignore / Fight."),
		body("   They are never told which you chose."),
		body("3. If it lands, they can suggest things by talking to you."),
		body("4. /hypno safeword always works, from any state."),
		gap(),
		head("As the hypnotist"),
		body("1. Open their profile, click the H icon, Attempt Hypnosis."),
		dim("   The icon shows on everyone — it cannot know who has the"),
		dim("   add-on until it asks. The panel says so within 3 seconds."),
		body("2. Wait out the induction window — that time is for roleplay."),
		body("3. Then just talk. See the What to Say tab."),
		body("4. You must use their NAME for anything to land."),
		gap(),
		head("Why nothing happened"),
		body("Four things gate every suggestion, in this order:"),
		body("  their permission for that feature"),
		body("  a live trance with YOU specifically"),
		body("  their name somewhere in the line"),
		body("  enough trust, for the deeper features"),
		dim("/hypno match <phrase> reports which one stopped it."),
		gap(),
		head("Who sees what"),
		body("[Text in square brackets] went only to you. Nobody else"),
		body("saw it, and nothing in the room reacted to it."),
		body("Anything the room could actually have seen is emoted, so"),
		body("everyone present reads it — reaching for yourself and"),
		body("stopping, going still, opening your mouth and failing."),
		dim("Perception effects are never emoted: nobody can watch you"),
		dim("fail to notice something. Trance Defaults > Others See Your"),
		dim("Reactions turns the emotes off entirely."),
		gap(),
		head("Getting out"),
		body("Wake Up button · a spoken wake word · /hypno wake if the"),
		body("trance is shallow · a 30 minute timeout · /hypno safeword,"),
		body("which no setting and no suggestion can take away."),
	];
}

function vocabularyLines(): HelpLine[] {
	const lines: HelpLine[] = [
		head("Say these WITH their name. Releases are dim."),
		gap(),
	];
	for (const s of suggestionHelp()) {
		const gateBits: string[] = [];
		if (!s.release) gateBits.push(s.permission);
		if (s.depthTier) gateBits.push(`${s.depthTier}+`);
		const gate = gateBits.length ? `   (${gateBits.join(", ")})` : "";
		lines.push({
			text: `${s.examples.map((e) => `"${e}"`).join("  ·  ")}${gate}`,
			style: s.release ? "dim" : "body",
		});
	}
	lines.push(gap());
	lines.push(head("Not in the table"));
	lines.push(body(`"wake up" · "you are awake" · "come back to me"`));
	lines.push(dim("   always allowed — ending a trance answers to no permission"));
	lines.push(body(`"walk with me" · "be still"`));
	lines.push(dim("   walking trance: still under and moving; \"be still\" returns you"));
	lines.push(body(`"you cannot touch your breasts" · "...yourself"`));
	lines.push(dim("   (selfTouchControl) — around 40 body words are understood"));
	lines.push(gap());
	lines.push(dim("Contractions and punctuation are ignored, so \"you can't move\""));
	lines.push(dim("and \"You cannot move!\" are the same line."));
	return lines;
}

function lastingLines(): HelpLine[] {
	const minutes = getTriggerDuration();
	const scope = getTriggerScope();
	const scopeLabel = TRIGGER_SCOPES.find((s) => s.key === scope)?.label ?? scope;
	return [
		head("Two ways to outlast a session"),
		body("A TRIGGER sleeps until someone says its word."),
		body("A CARRIED suggestion is simply still true when you wake."),
		dim(`Both need trust ${TRIGGER_TRUST_THRESHOLD}. Arousal does not count toward it —`),
		dim("the chemical floor never reaches anything persistent."),
		dim("Firing your OWN trigger is off unless you tick it."),
		gap(),
		head("Planting a trigger — while they are under"),
		body(`"Missy, your trigger word is sleepy time"`),
		body(`"Missy, you cannot move"      (and any others)`),
		body(`"Missy, remember trigger"`),
		dim("The subject never sees the phrase. With Awareness >"),
		dim("Trigger setup on, they see none of the exchange at all."),
		gap(),
		head("Firing and releasing one"),
		body("Say the phrase. It works with no session, which is the point."),
		body(`"Missy, you are released from sleepy time"`),
		dim("Named release only — general release wording deliberately"),
		dim("does nothing outside a trance."),
		gap(),
		head("If something is holding you"),
		body("Wait for it to wear off · have whoever set it release you ·"),
		body("/hypno safeword, which always works from any state."),
		dim("/hypno forgettrigger deliberately REFUSES while a trigger has"),
		dim("hold of you — deleting it would be too quiet an escape."),
		dim("Chat commands survive being silenced; ordinary speech does not,"),
		dim("so the safeword stays reachable even when you cannot talk."),
		gap(),
		head("Carrying a suggestion past waking"),
		body(`"Missy, you cannot tell what you are wearing"`),
		body(`"Missy, that will stay with you"     ← keeps that ONE`),
		body(`"Missy, all of this stays with you"  ← keeps everything`),
		body(`"Missy, forget what I said"          ← takes it back`),
		dim("Trance defaults can never be carried, so a subject always"),
		dim("gets their movement and their voice back on waking."),
		gap(),
		head("Right now, on this character"),
		body(`Effects last ${minutes > 0 ? `${minutes} min` : "until released"}, and triggers fire for: ${scopeLabel}.`),
		dim("Both are on the Triggers tab of the settings screen."),
	];
}

function trustLines(): HelpLine[] {
	return [
		head("Trust is per-person, and yours to give"),
		body("It lives on the SUBJECT's client, counting interactions with"),
		body("each person. The value is worked out from the count, so"),
		body("retuning the curve never corrupts what you have built."),
		gap(),
		head("What builds it"),
		body("A message during ordinary conversation — at most one every"),
		body("5 minutes, worth double when they use your name."),
		body("A successful induction is worth five of those."),
		dim("So: minutes to be reachable, an evening to be usable, and"),
		dim("a long time to be deeply trusted. That is deliberate."),
		gap(),
		head("Arousal is a floor, not a multiplier"),
		body("Access = the higher of your trust and your arousal,"),
		body("with arousal capped at 30."),
		body("So a stranger can reach shallow, session-only things when"),
		body("you are worked up — and nothing deeper, ever."),
		gap(),
		head("BC relationships give you a floor"),
		body("Friend 15 · Lover 30 · Owner 65, under whatever you have"),
		body("earned — so a relationship never has to be re-earned."),
		body("A friend gets in the door; a lover also reaches arousal;"),
		body("an owner reaches everything — triggers and the illusion"),
		body("included, since the owner floor matches both gates."),
		dim("Read from BC's own friend list, lovership and ownership."),
		gap(),
		head("Trust fades without contact"),
		body("Stats tab: Never · Very slowly · Slowly · Typical ·"),
		body("Fast · Very fast. Off unless you pick otherwise."),
		dim("A casual acquaintance fades far faster than a deep bond —"),
		dim("the curve is steep at the bottom and flat at the top."),
		dim("Relationship floors are what decay can never take."),
		gap(),
		head("What each gate needs"),
		body("Everyday suggestions   the permission alone"),
		body(`Clothing illusion      trust ${ILLUSION_TRUST_THRESHOLD}`),
		body(`Planting a trigger     trust ${TRIGGER_TRUST_THRESHOLD}`),
		body(`Carrying past waking   trust ${CARRY_TRUST_THRESHOLD}`),
		gap(),
		head("The roll"),
		body("Chance = access + your choice (Agree +25 / Fight -25)"),
		body("         + experience, clamped to 5-95."),
		dim("Never certain either way. A determined stranger keeps a"),
		dim("sliver; a deeply trusted hypnotist can still miss."),
		dim("/hypno chance <name> shows the real numbers."),
		gap(),
		head("How many tries they get"),
		body(`${getMaxAttempts()} attempts, then ten minutes before they may try you`),
		body("again. Permissions tab — it is your setting, and their"),
		body("client only knows it because yours tells them."),
	];
}

function commandLines(): HelpLine[] {
	const lines: HelpLine[] = [];
	let lastGroup = "";
	for (const c of commandHelp()) {
		if (c.group !== lastGroup) {
			if (lastGroup) lines.push(gap());
			lines.push(head(c.group));
			lastGroup = c.group;
		}
		lines.push(body(`/hypno ${c.tag}${c.args ? ` ${c.args}` : ""}`));
		lines.push(dim(`   ${c.description}`));
	}
	return lines;
}

interface HelpTab {
	name: string;
	blurb: string;
	lines: () => HelpLine[];
}

const TABS: HelpTab[] = [
	{ name: "Start Here", blurb: "The loop, both sides of it, and every way out.", lines: startedLines },
	{
		name: "What to Say",
		blurb: "Generated from the pattern library itself, so it cannot fall behind it.",
		lines: vocabularyLines,
	},
	{ name: "Lasting", blurb: "Triggers and carried suggestions — the things that outlive a session.", lines: lastingLines },
	{ name: "Trust", blurb: "How access is earned, and what each depth costs.", lines: trustLines },
	{ name: "Commands", blurb: "Mostly diagnostics. The features themselves are spoken, not typed.", lines: commandLines },
];

// --- Page control ---------------------------------------------------------------------
const PAGE_BUTTON_WIDTH = 120;
const PAGE_BUTTON_HEIGHT = 52;
const PAGE_BUTTON_TOP = PANEL_TOP + PANEL_HEIGHT - 72;
const PAGE_PREV_LEFT = PANEL_LEFT + PANEL_WIDTH - 300;
const PAGE_NEXT_LEFT = PANEL_LEFT + PANEL_WIDTH - 160;

/** Drawn by whichever screen is hosting us. `title` names that host so the reader knows
 * what closing this returns them to. */
export function drawHelp(title: string): void {
	DrawText(title, MainCanvasWidth / 2, TITLE_Y, "Black");
	DrawButton(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE, "", "White", "Icons/Exit.png", "Close help");
	drawTabsAndPanel(
		TABS.map((t) => t.name),
		activeTab,
	);
	drawLeftText(TABS[activeTab].blurb, CONTENT_LEFT, BLURB_Y, "Gray");

	const pages = drawHelpLines(TABS[activeTab].lines(), page);
	if (pages > 1) {
		DrawButton(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT, "Prev", "White", "", "", page === 0);
		DrawButton(
			PAGE_NEXT_LEFT,
			PAGE_BUTTON_TOP,
			PAGE_BUTTON_WIDTH,
			PAGE_BUTTON_HEIGHT,
			"Next",
			"White",
			"",
			"",
			page >= pages - 1,
		);
		drawLeftText(`${page + 1} / ${pages}`, PAGE_PREV_LEFT - 90, PAGE_BUTTON_TOP + 26, "Gray");
	}
}

/** Returns true when the click was ours. The host closes its own screen on false only if
 * it wants to; the exit icon here closes help and nothing else. */
export function clickHelp(): boolean {
	if (MouseIn(BACK_LEFT, BACK_TOP, BACK_SIZE, BACK_SIZE)) {
		closeHelp();
		return true;
	}
	const hit = tabHitIndex(TABS.length);
	if (hit !== null) {
		activeTab = hit;
		page = 0;
		return true;
	}
	if (MouseIn(PAGE_PREV_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
		page = Math.max(0, page - 1);
		return true;
	}
	if (MouseIn(PAGE_NEXT_LEFT, PAGE_BUTTON_TOP, PAGE_BUTTON_WIDTH, PAGE_BUTTON_HEIGHT)) {
		page += 1; // clamped on the next draw, which is the only place the count is known
		return true;
	}
	// Swallow everything else inside the panel: a stray click must not reach the screen
	// underneath while help is covering it.
	return MouseIn(PANEL_LEFT, PANEL_TOP, PANEL_WIDTH, PANEL_HEIGHT);
}

/** Kept honest by a test: every suggestion must offer at least one example phrasing, and
 * each one must be a phrase the pattern library actually matches. */
export function helpTabNames(): string[] {
	return TABS.map((t) => t.name);
}
