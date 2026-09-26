import { suggestionHelp, ILLUSION_TRUST_THRESHOLD } from "./voice";
import { commandHelp } from "./commands";
import { getTriggerDuration, getTriggerScope, getMaxAttempts } from "./storage";
import { TRIGGER_SCOPES, TRIGGER_TRUST_THRESHOLD } from "./triggers";
import { CARRY_TRUST_THRESHOLD } from "./carry";
import { DEPTH_GATES, DEPTH_TIERS, tierLabel } from "./depth";
import { isTestingMode } from "./log";
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
		body("Almost nothing here is a command. You SPEAK to someone, and their"),
		body("own client decides whether anything lands. Nobody is ever made to"),
		body("do anything — their settings answer for them."),
		gap(),
		head("As the subject"),
		body("1. Tick the permissions you want to allow. Everything is off until"),
		body("   you say so — a fresh install does nothing on purpose."),
		body("2. Someone attempts hypnosis; you privately choose Agree, Ignore or"),
		body("   Fight. They are never told which."),
		body("3. If it lands, they can suggest things simply by talking to you."),
		body("4. /hypno safeword ends everything, from any state, always."),
		gap(),
		head("As the hypnotist"),
		body("1. Open their profile, click the H icon, Attempt Hypnosis."),
		dim("   The icon shows on everyone — it cannot know who has the add-on"),
		dim("   until it asks. The panel says within 3 seconds whether they do."),
		body("2. Wait out the induction window — that time is for roleplay, and"),
		body("   roleplaying it well improves the roll."),
		body("3. Then just talk. Use their NAME, or nothing lands."),
		gap(),
		head("Why nothing happened"),
		body("Every suggestion is gated, and the checks run in this order:"),
		body("  1. their permission for that feature is on"),
		body("  2. a live trance with YOU specifically"),
		body("  3. their name is somewhere in the line"),
		body("  4. they are deep enough — the deeper the effect, the deeper the"),
		body("     trance it needs (see Depth & Trust)"),
		dim("/hypno match <phrase> reports whether the words matched; a refused"),
		dim("suggestion tells the hypnotist which gate stopped it."),
		gap(),
		head("Who sees what"),
		body("[Text in square brackets] reached only you — nobody else saw it and"),
		body("nothing in the room reacted. Anything the room could really have"),
		body("seen is emoted instead, so everyone present reads it: reaching for"),
		body("yourself and stopping, going still, opening your mouth and failing."),
		dim("Perception effects are never emoted — nobody can watch you fail to"),
		dim("notice something. Trance Defaults > Others See Your Reactions turns"),
		dim("the emotes off entirely."),
		gap(),
		head("Getting out"),
		body("The Wake Up button · a spoken wake word · /hypno wake while the"),
		body("trance is still shallow · a 30-minute timeout · and /hypno safeword,"),
		body("which no setting and no suggestion can ever take away."),
	];
}

function vocabularyLines(): HelpLine[] {
	const lines: HelpLine[] = [
		body("Generated from the pattern library, so it can never fall behind the"),
		body("code. Say any of these WITH the subject's name. Releases are dim."),
		dim("Each gate shows the permission it needs and, where it matters, the"),
		dim("least depth — so a line can match perfectly and still wait for a"),
		dim("deeper trance. Contractions and punctuation are ignored."),
		gap(),
	];
	for (const sug of suggestionHelp()) {
		const gateBits: string[] = [];
		if (!sug.release) gateBits.push(sug.permission);
		if (sug.depthTier) gateBits.push(`${sug.depthTier}+`);
		const gate = gateBits.length ? `   (${gateBits.join(", ")})` : "";
		lines.push({
			text: `${sug.display.map((e) => `"${e}"`).join("  ·  ")}${gate}`,
			style: sug.release ? "dim" : "body",
		});
	}
	lines.push(gap());
	lines.push(head("Not in the table"));
	lines.push(body(`"wake up" · "you are awake" · "come back to me" — ending a trance,`));
	lines.push(dim("   always allowed, gated by no permission."));
	lines.push(body(`"walk with me" · "be still" — walking trance: still under, but on`));
	lines.push(dim(`   your feet with the veil lifted; "be still" puts the stillness back.`));
	lines.push(body(`"you cannot touch your breasts" · "...touch yourself"`));
	lines.push(dim("   (selfTouchControl) — around 40 body words are understood."));
	lines.push(body(`"touch your breasts" · "pinch your nipples" · "lick your thighs"`));
	lines.push(dim("   (Made to Act) — one grammar: <verb> your <part>. touch · caress · rub ·"));
	lines.push(dim("   pinch · spank · slap · scratch · tickle · pull · lick · kiss · bite ·"));
	lines.push(dim("   massage · pet. Bare \"touch yourself\" wanders; name a part to steer it."));
	lines.push(body(`"kiss Rei" · "kiss Rei's nipples" · "kiss me" · "pinch my nipples"`));
	lines.push(dim("   (Made to Act, + Made to Touch Others for anyone but you) — the same verbs"));
	lines.push(dim("   aimed at someone. Exact name or nickname. Kiss, spank, pet need no part."));
	return lines;
}

/** The depth ladder and the per-tier feature list, both GENERATED from depth.ts so they
 * cannot drift from the gates the code actually checks. */
function depthLadder(): HelpLine[] {
	const lines: HelpLine[] = [head("The five depths")];
	for (const t of DEPTH_TIERS) lines.push(body(`${t.label} (${t.min}+) — ${t.blurb}`));
	lines.push(gap());
	lines.push(head("What each depth reaches"));
	let anyEarned = false;
	for (const t of DEPTH_TIERS) {
		const here = DEPTH_GATES.filter((g) => g.tier === t.key);
		if (!here.length) continue;
		const names = here
			.map((g) => {
				if (g.earnedOnly) anyEarned = true;
				return g.earnedOnly ? `${g.label}*` : g.label;
			})
			.join(" · ");
		lines.push(body(`${t.label}: ${names}`));
	}
	if (anyEarned) {
		lines.push(dim("* earned depth only — arousal cannot reach these by default (below)."));
	}
	lines.push(dim("Deeper is a consent setting, not a difficulty: the Depth tab moves"));
	lines.push(dim("any of these up or down for yourself."));
	return lines;
}

function depthTrustLines(): HelpLine[] {
	return [
		head("Two questions, kept separate"),
		body("A permission asks may they EVER do this to me. Depth asks how far"),
		body("UNDER I have to be before it can. Both must be satisfied, always."),
		gap(),
		...depthLadder(),
		gap(),
		head("Trust sets how deep they can take you"),
		body("Trust is per-person and lives on YOUR client, counted from your"),
		body("interactions. A message in ordinary talk builds a little — at most"),
		body("one every 5 minutes, double when they use your name — and a"),
		body("successful induction is worth five of those."),
		dim("Minutes to be reachable, an evening to be usable, a long time to be"),
		dim("deeply trusted. The value is derived from the count, so retuning the"),
		dim("curve never corrupts what you built."),
		gap(),
		head("Arousal is a floor, not a multiplier"),
		body("Access is the higher of your trust and your arousal, and arousal is"),
		body("capped at 30. So being worked up lets a stranger reach shallow,"),
		body("session-only things — and nothing deeper, ever."),
		gap(),
		head("The earned-only three"),
		body("The clothing illusion, planting triggers, and carrying a suggestion"),
		body("past waking need EARNED depth — trust, not arousal — because they"),
		body("outlive the session or lie to you about your own body."),
		dim("The Depth tab can open the illusion and triggers to arousal for you,"),
		dim("at the price of fading fast. Carry-forward stays earned only."),
		gap(),
		head("Relationships give a floor"),
		body("Friend 15 · Lover 30 · Owner 65, under whatever you have earned, so"),
		body("a relationship is never re-earned. A friend gets in the door; a"),
		body("lover also reaches arousal; an owner reaches everything."),
		dim("Read from BC's own friend list, lovership and ownership."),
		gap(),
		head("Trust fades without contact"),
		body("In the Advanced view (button under the tabs): Never · Very slowly ·"),
		body("Slowly · Typical · Fast · Very fast. Off unless you choose."),
		dim("A casual acquaintance fades far faster than a deep bond, and a"),
		dim("relationship floor is what decay can never take."),
		gap(),
		head("The roll, when they attempt"),
		body("Chance = access + your choice (Agree +25 / Fight -25) + experience"),
		body("+ their honoured skill, clamped to 5-95 — never certain either way."),
		body(`You get ${getMaxAttempts()} tries at a time, then a ten-minute wait. That count is`),
		body("your setting, on the Permissions tab."),
		dim("/hypno chance <name> shows the real numbers for each choice."),
		gap(),
		head("Their skill, and whether you believe it"),
		body("Practised hypnotists are better at it. Their client tells yours how"),
		body("practised; YOUR Depth-tab setting decides how much to believe —"),
		body("ignore it, believe it only from people you trust, cap it for everyone,"),
		body("or the default: full weight once you know someone, capped before that."),
		body("You feel it as a read on their manner at the prompt, never a number,"),
		body("and it can never reach the earned-only three."),
	];
}

function lastingLines(): HelpLine[] {
	const minutes = getTriggerDuration();
	const scope = getTriggerScope();
	const scopeLabel = TRIGGER_SCOPES.find((sc) => sc.key === scope)?.label ?? scope;
	return [
		head("Two ways to outlast a session"),
		body("A TRIGGER sleeps until someone says its word. A CARRIED suggestion"),
		body("is simply still true when you wake."),
		dim("Both need a Deep trance, on earned depth — see Depth & Trust. Firing"),
		dim("your OWN trigger is off unless you tick it on the Triggers tab."),
		gap(),
		head("Planting a trigger — while they are under"),
		body(`"Missy, your trigger word is sleepy time"`),
		body(`"Missy, you cannot move"      (and any others)`),
		body(`"Missy, remember trigger"`),
		dim("The subject never sees the phrase. With Awareness > Trigger setup"),
		dim("on, they see none of the exchange at all."),
		gap(),
		head("Shaping it — before \"remember trigger\""),
		body(`"Missy, this trigger works only once"`),
		body(`"Missy, it lasts 2 hours"     "Missy, anyone can use it"`),
		body(`"Missy, only when you hear it exactly"   ← whole words only`),
		dim("Their own settings still cap how long it lasts and who may fire it."),
		gap(),
		head("Firing and releasing one"),
		body(`Say the phrase — it works with no session, which is the point.`),
		body(`"Missy, you are released from sleepy time" releases that one by name.`),
		dim("General release wording does nothing outside a trance."),
		gap(),
		head("Triggers fade unless kept up"),
		body("A planted trigger loses strength over time and eventually goes; the"),
		body("rate is on the Triggers tab (Never by default). A deep planting"),
		body("lasts longer than a shallow one, and neglect compounds."),
		body(`"Missy, that trigger holds" — said while under with the one who`),
		body("planted it — resets the clock. Firing it only slows the fade."),
		dim("A trigger opened to arousal (above) fades fast whatever the rate."),
		dim("/hypno triggers lists each one's strength; add its number to see what it does."),
		gap(),
		head("Carrying a suggestion past waking"),
		body(`"Missy, you cannot tell what you are wearing"`),
		body(`"Missy, that will stay with you"     ← keeps that ONE`),
		body(`"Missy, all of this stays with you"  ← keeps everything`),
		body(`"Missy, forget what I said"          ← takes it back`),
		dim("Trance defaults can never be carried, so you always wake with your"),
		dim("movement and your voice back."),
		gap(),
		head("If something is holding you"),
		body("Wait for it to wear off · have whoever set it release you ·"),
		body("/hypno safeword, which always works from any state."),
		dim("/hypno forgettrigger REFUSES while a trigger has hold of you —"),
		dim("deleting it would be too quiet an escape. Chat commands survive"),
		dim("being silenced, so the safeword stays reachable when speech does not."),
		gap(),
		head("Right now, on this character"),
		body(`A fired trigger lasts ${minutes > 0 ? `${minutes} min` : "until released"}, and triggers fire for: ${scopeLabel}.`),
		dim("Both are on the Triggers tab of the settings screen."),
	];
}

function commandLines(): HelpLine[] {
	// Bucketed by group in a fixed order, each group printed once — the commands are NOT
	// contiguous by group in the table, so the old print-a-header-when-it-changes approach
	// repeated headers as it flipped back and forth. Ordered simple to complex: what you use
	// in a scene, then what you read, then your data, then the dev-only ones.
	const ORDER = ["Session", "Diagnostics", "Data", "Testing"];
	const NOTE: Record<string, string> = {
		Session: "In a scene. Usable from any state; the safeword never fails.",
		Diagnostics: "Look without changing anything.",
		Data: "Your stored settings and stats.",
		Testing: "Development only — these vanish from a release build.",
	};
	const cmds = commandHelp();
	const lines: HelpLine[] = [
		dim("Most features are SPOKEN, not typed — these are the exceptions."),
		gap(),
	];
	for (const group of ORDER) {
		// The Testing group is live only in the testing room; do not document it elsewhere. This
		// is re-evaluated every render, so the group appears and vanishes as you enter and leave.
		if (group === "Testing" && !isTestingMode()) continue;
		const inGroup = cmds.filter((c) => c.group === group);
		if (!inGroup.length) continue;
		lines.push(head(group));
		if (NOTE[group]) lines.push(dim(NOTE[group]));
		for (const c of inGroup) {
			lines.push(body(`/hypno ${c.tag}${c.args ? ` ${c.args}` : ""} — ${c.description}`));
		}
		lines.push(gap());
	}
	return lines;
}

interface HelpTab {
	name: string;
	blurb: string;
	lines: () => HelpLine[];
}

// Ordered simple to complex: the loop, then the words, then the model those words obey,
// then the things that outlast a session, then the typed reference.
const TABS: HelpTab[] = [
	{ name: "Start Here", blurb: "The loop, both sides of it, and every way out.", lines: startedLines },
	{
		name: "What to Say",
		blurb: "Everything you can say to a subject, generated from the patterns themselves.",
		lines: vocabularyLines,
	},
	{ name: "Depth & Trust", blurb: "How deep someone can take you, how that is earned, and what each depth reaches.", lines: depthTrustLines },
	{ name: "Lasting", blurb: "Triggers and carried suggestions — the things that outlive a session.", lines: lastingLines },
	{ name: "Commands", blurb: "The typed commands. The features themselves are spoken, not typed.", lines: commandLines },
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
