import { tellPlayer, tellRoom, fillTokens } from "./notify";
// Flavor text for things that happen TO the subject.
//
// Lives in its own module, imported by both voice.ts (spoken suggestions) and remote.ts
// (panel buttons), so the same effect reads the same way regardless of how it was
// triggered — the subject shouldn't be able to tell from the wording whether the hypnotist
// clicked a button or said the words.
//
// Tone: everything here is written from inside the loss of control. The body acts, then the
// subject notices; intention arrives late or not at all. Releases keep the same register —
// control returning is still something that happens to them, not something they did.

export type FlavorKey =
	| "movement-block"
	| "movement-release"
	| "follow-block"
	| "follow-release"
	| "clothing-block"
	/** Tried to open the wardrobe while blocked. */
	| "clothing-blocked-attempt"
	| "clothing-release"
	| "kneel"
	| "stand"
	| "speech-block"
	| "speech-release"
	/** Shown each time a silenced player actually tries to say something. */
	| "speech-blocked-attempt"
	| "awareness-block"
	| "awareness-release"
	| "clothing-awareness-block"
	| "clothing-awareness-release"
	| "bondage-awareness-block"
	| "bondage-awareness-release"
	| "touch-block"
	| "touch-release"
	/** Numbness — the sensation itself, where touch-block above is only the knowing. */
	| "numb-block"
	| "numb-release"
	/** Tried to touch themselves while frozen. */
	| "selftouch-frozen"
	/** Tried to touch themselves while blocked outright. */
	| "selftouch-blocked"
	/** The block being PLACED, which is a different moment from bumping into it. */
	| "selftouch-applied"
	/** A trigger placed a restriction the subject was never told about. Deliberately vague:
	 * they heard no instruction, so naming the part would tell them what the trigger did. */
	| "restriction-settles"
	| "selftouch-part-release"
	// Arousal. The four levels are suggestion ids as well as flavor keys, same as the rest.
	| "arousal-none"
	| "arousal-light"
	| "arousal-high"
	| "arousal-full"
	| "orgasm-force"
	| "orgasm-deny"
	| "orgasm-allow"
	/** A forced orgasm that ran into denial, edging, or a chastity item. */
	| "orgasm-refused"
	/** The player's arousal meter is switched off entirely, so none of this can land. */
	| "arousal-unavailable"
	| "illusion-block"
	| "illusion-release"
	/** A garment comes off. The one effect here the whole room can genuinely watch. */
	| "undress"
	/** Everything, in one go. */
	| "undress-all"
	/** Asked to undress with nothing left to take off. */
	| "undress-bare"
	/** Hands bound, or a lock that is not ours. */
	| "undress-blocked"
	/** Told to strip while OUR OWN freeze is holding her. Distinct from undress-blocked,
	 * which means someone else's lock. */
	| "undress-frozen"
	/** A trigger too faded to do anything, firing as a feeling and nothing more. */
	| "trigger-ghost"
	/** The installer re-established their triggers during a session. */
	| "trigger-reinforced";

/** Public counterparts, for the things somebody standing there would actually see.
 *
 * Only a subset has one, and the split is the whole point: perception effects are
 * unobservable by definition. Nobody can watch you fail to notice your own clothes, so
 * awareness, touch-blocking, the illusion and the arousal levels stay private — while
 * reaching for yourself and stopping, or opening your mouth and producing nothing, are
 * plainly visible and should not be silent to the room.
 *
 * {name} is required: room lines are emitted verbatim (see notify.tellRoom), so nothing
 * else supplies the name. {their} / {them} /
 * {themselves} come from the player's chosen pronouns; the character's NAME is always the
 * subject of the sentence, which fixes the verb as third-person singular and saves writing
 * a they/them variant of every line. */
const PUBLIC_LINES: Partial<Record<FlavorKey, string[]>> = {
	"movement-block": [
		"{name} goes very still, mid-motion.",
		"{name} stops moving, as though the idea had gone.",
	],
	"movement-release": ["{name} moves again, a little unsteadily.", "Something lets go of {name}."],
	// Follow is observable in the same way going still is: nobody sees the compulsion land,
	// but they see {name} close the distance and keep it closed. Naming {name} is required —
	// room lines carry no sender.
	"follow-block": [
		"{name} stays close, unwilling to let any distance open.",
		"{name} keeps near, as though on an invisible leash.",
	],
	"follow-release": ["{name} steps back, {their} own distance to keep again."],
	kneel: ["{name} melts down to {their} knees and looks quietly content to be there.", "{name} kneels, unhurried and unquestioning, as if it were the sweetest idea in the world."],
	stand: ["{name} rises, without seeming to decide to.", "{name} is on {their} feet again."],
	// Placing a restriction is invisible — nothing happens for anyone to see. Only bumping
	// INTO one is observable, which is why the attempt keys carry the public lines and the
	// apply keys mostly do not. Movement and posture are the exceptions: going still and
	// kneeling are visible in themselves.
	// Undressing is the most observable thing in the add-on — it changes the character
	// everyone in the room is looking at, so unlike every other apply-time effect these get
	// a public line rather than staying silent.
	undress: [
		"{name} slips out of something slow and dreamy, and doesn't seem to mind being watched.",
		"{name}'s hands undo a fastening while {their} face stays somewhere soft and far away.",
		"Something of {name}'s comes off, set aside without a glance, unhurried and unbothered.",
	],
	"undress-all": [
		"{name} undresses steadily, piece after piece, dreamy and unhurried and glad to be seen.",
		"{name} bares everything with the soft, unbothered thoroughness of a habit.",
	],
	"undress-blocked": [
		"{name}'s hands move to undress and stop, held.",
		"{name} starts to undo something and cannot make {their} hands finish.",
	],
	"undress-frozen": [
		"{name} does not move to undress. {name} does not move at all.",
	],
	// A ghost is visible from outside as a hesitation and no more — which is exactly what it
	// is. The room should not be able to tell it apart from someone losing their thread.
	"trigger-ghost": [
		"{name} pauses, as though half-hearing {their} own name.",
		"Something goes across {name}'s face and does not stay.",
	],
	"clothing-blocked-attempt": [
		"{name} reaches for {their} clothes, and {their} hand drifts away again.",
		"{name} half-reaches for a fastening and seems to forget why.",
	],
	"selftouch-frozen": ["{name} twitches towards {themselves}, and nothing moves."],
	"selftouch-blocked": [
		"{name} starts to reach for {themselves}, aches to, and doesn't.",
		"{name}'s hands stay exactly where they are, though {their} whole body plainly wishes otherwise.",
	],
	"speech-blocked-attempt": [
		"{name} opens {their} mouth, and nothing comes out.",
		"{name} tries to say something, and does not.",
	],
	"orgasm-refused": ["{name} strains for it, trembling, and something holds {them} back."],
};

const LINES: Record<FlavorKey, string[]> = {
	"movement-block": [
		"Your body simply stops listening to you.",
		"You tell your legs to move. Nothing happens.",
		"Somewhere far off you decide to move, and the message never arrives.",
	],
	"movement-release": [
		"Control seeps back into your limbs.",
		"Your body is yours again. You hadn't noticed it stopped being.",
		"Something lets go of you, and you can move.",
	],
	"follow-block": [
		"Being near them is where you belong. The thought of letting distance open is faintly unbearable.",
		"Wherever they go, you go. It does not feel like a decision.",
		"An invisible tether draws you to their side, and staying there is the only comfortable place to be.",
	],
	"follow-release": [
		"The tether loosens. You can be your own distance from them again.",
		"The pull to stay near fades, and where you stand is your own choice once more.",
	],
	// Apply-time: a possibility closing, with nothing reached for yet.
	"clothing-block": [
		"The idea of changing your clothes quietly stops being available.",
		"Your clothes settle into being simply what you are wearing, not something you could alter.",
		"Somewhere between you and your own buttons, a decision gets made without you.",
	],
	// Attempt-time: the moment you actually walk into it.
	"clothing-blocked-attempt": [
		"You reach for a fastening and forget what you were reaching for.",
		"Your hands will not go near your clothes, and you stop wondering why.",
		"The thought of changing slips away before you can hold on to it.",
	],
	"clothing-release": [
		"You could change your clothes, if you wanted to. The idea is available again.",
		"Whatever was standing between you and your clothes quietly isn't.",
		"Your hands remember what they were for.",
	],
	kneel: [
		"Your knees fold sweetly under you before you decide anything.",
		"Down feels right, and something in you is quietly pleased to go there.",
		"You are kneeling. You don't remember choosing to, and you like it here.",
	],
	stand: [
		"You rise, without quite deciding to.",
		"Something lifts you back onto your feet.",
		"You are standing again. The floor lets you go.",
	],
	"speech-block": [
		"You go to answer and find there is nothing to answer with.",
		"The words are there. The way out of your mouth is not.",
		"Speaking stops seeming like something you know how to do.",
	],
	"speech-release": [
		"Your voice is handed back to you.",
		"The way to your own words opens up again.",
		"You could speak now. The thought arrives whole this time.",
	],
	// Suppression flavor leans on absence rather than sensation — the point isn't that it
	// feels different, it's that nothing arrives to be noticed in the first place.
	"awareness-block": [
		"Things are happening to you. None of them seem worth noticing.",
		"Whatever is being done, it stops reaching you somewhere on the way.",
		"You stop keeping track of what is being done to you. It was never important.",
	],
	"awareness-release": [
		"You start noticing what's being done to you again.",
		"The world reattaches itself to your body.",
		"Details you had stopped collecting begin arriving again.",
	],
	// The per-category lines. Clothing and bondage had no wording of their own because they
	// had no suggestion of their own — only touch did — and "you will not notice your
	// clothing" landed on the broad line, which took whatever else was permitted along with
	// it and said the broad thing. Same register as awareness-block: absence, not sensation.
	"clothing-awareness-block": [
		"What you are wearing stops being something you keep track of.",
		"Clothes come and go. It does not seem to be your concern.",
		"Whatever is on you is on you. You stop checking.",
	],
	"clothing-awareness-release": [
		"You notice what you are wearing again.",
		"Your clothes are yours to keep track of once more.",
	],
	"bondage-awareness-block": [
		"Whatever holds you holds you. You stop noticing it being put there.",
		"Rope and leather become part of the furniture.",
		"Restraint arrives without an announcement.",
	],
	"bondage-awareness-release": [
		"You notice what holds you again.",
		"Every knot and buckle reports back.",
	],
	"touch-block": [
		"Hands on you stop registering as anything at all.",
		"You are being touched. The information simply doesn't arrive.",
		"Touch happens somewhere far away from wherever you are.",
	],
	"touch-release": [
		"You can feel where you're being touched again.",
		"Your skin starts reporting back.",
		"Touch reaches you again, arriving where it should.",
	],
	// Numbness is the sensation, not the knowing — so these describe a body that has gone
	// quiet rather than attention that has wandered. The subject can still SEE they are
	// being touched, which is the difference from touch-block above and is deliberate:
	// watching it happen and feeling nothing is the better half of this.
	"numb-block": [
		"You can see it happening. Your body declines to have an opinion about it.",
		"Hands move over you and land on nothing at all.",
		"Somewhere between your skin and you, the message stops being delivered.",
		"You are being touched, and it is happening to somebody else's body.",
	],
	"numb-release": [
		"Your body comes back, all at once, and remembers what it was feeling.",
		"Sensation returns to your skin like warmth to a cold hand.",
		"You can feel again, and everything that was quiet is suddenly not.",
	],
	// Undressing is the most observable thing in the add-on — it changes the character
	// everyone in the room is looking at. These read as the hands acting first and the
	// intention arriving late, same register as the rest, but they are not secrets.
	undress: [
		"Your hands find the fastening before you've decided anything, and go willingly.",
		"It comes off easy, and some warm, unhurried part of you is glad to be seen.",
		"Taking it off feels like the obvious, pleasant thing to have been doing.",
	],
	"undress-all": [
		"Your hands work without consulting you, unhurried, until there is nothing left to bare.",
		"Piece by piece it goes, and none of it feels like a decision — only something easy and warm.",
		"You undress the way you would sink into a habit — thorough, dreamy, glad to.",
	],
	"undress-bare": [
		"Your hands go looking for something to take off and find nothing there.",
		"There is nothing left to remove. Your hands settle again.",
	],
	"undress-blocked": [
		"Your hands try, and something holds them where they are.",
		"You go to undress and find you cannot — something else has that decision.",
	],
	// Deliberately worded like selftouch-frozen's third line, because it is the same fact:
	// you were told to do something with your hands and your hands are not yours right now.
	"undress-frozen": [
		"Undressing would require moving, and you cannot move at all.",
		"You are told to undress. Nothing of yours so much as shifts.",
	],
	// Deliberately says nothing about triggers, and never names one. The subject is not told
	// what almost happened — that is the whole of what a trigger keeps back — only that
	// something reached for them and did not arrive.
	"trigger-ghost": [
		"Something in you turns over, faintly, and settles again.",
		"A word goes past you and almost catches. Almost.",
		"For a moment you were about to do something. The moment goes.",
	],
	"trigger-reinforced": [
		"Something already inside you is gone over again, and set more firmly.",
		"You do not know what was just deepened. It was deepened all the same.",
	],
	"selftouch-frozen": [
		"Your hand doesn't move. Nothing of yours does.",
		"You go to reach for yourself and find nothing answers.",
		"Reaching would require moving, and you cannot move at all.",
	],
	"selftouch-blocked": [
		"Your hands stay exactly where they are, however much you would like them not to.",
		"You want to touch yourself — and your hands stay put, and the wanting only sharpens.",
		"Touching yourself isn't among the things you're allowed right now, and the ache of that is its own reward.",
	],
	"selftouch-applied": [
		"Reaching for yourself quietly stops being one of your options, and part of you thrills at that.",
		"Something closes off between you and your own hands, and leaves the wanting nowhere to go.",
		"You will not be touching yourself. The decision is already made, it was not yours, and you find you don't mind.",
	],
	// DW's wording, near enough: a restriction lands and the subject finds the not-knowing
	// interesting rather than alarming. It has to stay vague — a trigger fires with no
	// spoken instruction, so naming the part would hand them what the trigger does.
	"restriction-settles": [
		"You feel something close off. You are not sure what yet, and the not-knowing is oddly interesting.",
		"A small door shuts somewhere in you. You will find out which one when you reach for it.",
		"Something has been put out of your reach. You will discover what when your hands get there.",
	],
	"selftouch-part-release": [
		"Your hands are your own again, all of you within reach.",
		"Whatever was keeping you from yourself lets go.",
	],
	// Arousal flavor keeps the same register as the rest: the body reacts first and the
	// subject finds out afterwards. Going DOWN is written as something being taken away
	// rather than as relief, so no direction of this reads as the subject's own doing.
	"arousal-none": [
		"Whatever was building in you is simply put down somewhere you cannot reach.",
		"The heat goes out of you. You don't remember wanting anything.",
		"Your body cools, and takes the wanting with it.",
	],
	"arousal-light": [
		"A slow warmth curls low in you and gets comfortable, like it means to stay.",
		"A small heat starts up somewhere, uninvited and not unwelcome.",
		"You catch yourself wanting, and you don't remember when that started.",
	],
	"arousal-high": [
		"The wanting floods in all at once, and suddenly nothing in the room exists but how much you want it.",
		"Your body goes suddenly, shamelessly desperate, and no part of that was your idea.",
		"Heat climbs through you faster than you can have an opinion about it, and you stop trying to.",
	],
	"arousal-full": [
		"You are right at the edge, trembling, and something is holding you there.",
		"Everything in you is gathered and waiting, aching, one word from going over.",
		"You are so close it hurts, and going the rest of the way is not up to you — and oh, you want it to be.",
	],
	"orgasm-force": [
		"You go over, because you were told to, and the relief of not choosing is its own sweetness.",
		"Your body obeys before you understand what it was asked, and it feels wonderful to.",
		"It takes you, and you let it, because letting it was never the question.",
	],
	"orgasm-deny": [
		"The way over closes quietly, and you accept that it is closed — even as you strain toward it.",
		"You can get close, deliciously close, and no further, and you find you don't argue.",
		"Finishing stops being one of the things available to you, and the wanting just pools and stays.",
	],
	"orgasm-allow": [
		"The way over is open again, warm and waiting, whenever you're offered it.",
		"Something unlocks low in you, eager, and you could finish now.",
		"Whatever was standing in the way steps aside, and your body knows it at once.",
	],
	"orgasm-refused": [
		"You strain for it, right to the edge, and something holds you back. Nothing gives.",
		"You are told to go over, and you cannot — the wanting only builds with nowhere to go.",
		"Your body reaches for it, finds the way shut, and hangs there aching.",
	],
	// The illusion's flavor has one job the others don't: it must not describe a CHANGE,
	// because the subject is supposed to believe nothing has changed. So it reads as
	// attention sliding off the question rather than as anything being done.
	"illusion-block": [
		"You stop wondering what you have on. You know what you have on.",
		"Looking down settles nothing and you lose interest in looking again.",
		"However you are dressed is however you are dressed. The question closes.",
	],
	"illusion-release": [
		"You look down, properly this time, and see what is actually there.",
		"Your eyes finally land on yourself, and the answer is not the one you were carrying.",
		"Whatever was smoothing the question over lets go of it.",
	],
	// Deliberately plain rather than in-fiction: this one is a mismatch between the
	// hypnotist's expectation and the player's own settings, and dressing that up as
	// atmosphere would leave both of them confused about why nothing happened.
	"arousal-unavailable": [
		"Nothing reaches you there — your arousal meter is switched off in BC's preferences.",
	],
	// Short and repeatable — this one fires on every attempt, so it can't be a paragraph.
	"speech-blocked-attempt": [
		"The words don't come.",
		"Nothing comes out.",
		"Your mouth doesn't cooperate.",
		"The thought dissolves before it reaches your lips.",
	],
};

function pick(options: string[]): string {
	return options[Math.floor(Math.random() * options.length)];
}

export function flavor(key: FlavorKey): string {
	return pick(LINES[key]);
}

/** The room-facing line for this effect, already name- and pronoun-filled, or null when
 * there is nothing anyone could have seen. */
export function publicFlavor(key: FlavorKey): string | null {
	const options = PUBLIC_LINES[key];
	return options ? fillTokens(pick(options)) : null;
}

/** Both halves at once. Every effect should go through this rather than reaching for
 * ChatRoomSendLocal, so the private line and the public one can never fall out of step —
 * and so adding a public variant to a key is the only edit needed to give it a voice. */
export function announce(key: FlavorKey): void {
	tellPlayer(flavor(key));
	const seen = publicFlavor(key);
	if (seen) tellRoom(seen);
}

/** Body-part refusals name the part, so they can't come from the static table. Uses the
 * subject's hypnotist's own wording rather than a group name — being told "your breasts"
 * and refused about "ItemBreast" would break the spell rather badly. */
/** A per-part block being PLACED, when the subject heard the instruction and so already
 * knows which part. Names it; nothing is revealed that they did not just hear.
 *
 * No public half: placing a restriction is invisible. */
export function announceBodyPartApplied(part: string): void {
	tellPlayer(
		pick([
			`Touching your ${part} stops being one of the things you are going to do.`,
			`Your ${part} quietly moves out of your own reach.`,
			`You will be leaving your ${part} alone now, and you do not mind.`,
		]),
	);
}

/** Body-part refusals name the part, so they are built rather than looked up — same
 * reasoning as bodyPartFlavor below, applied to the public half. Attempt-time: the subject
 * has actually reached for themselves, which is why this one the room can see. */
export function announceBodyPart(part: string): void {
	tellPlayer(bodyPartFlavor(part));
	tellRoom(
		fillTokens(
			pick([
				`{name} reaches for {their} ${part}, then seems to change {their} mind.`,
				`{name} half-reaches for {their} ${part} and loses interest partway.`,
				`{name}'s hands get as far as {their} ${part} before drifting away.`,
			]),
		),
	);
}

export function bodyPartFlavor(part: string): string {
	const options = [
		`Your hands move towards your ${part}, then you change your mind. You do not need to touch them.`,
		`You reach for your ${part} and lose interest halfway there.`,
		`Touching your ${part} stops seeming like something you were going to do.`,
		`Your hands get as far as your ${part} before forgetting why.`,
	];
	return options[Math.floor(Math.random() * options.length)];
}

/** The room-visible half of an induction beginning — what onlookers see while the hypnotist
 * works, before anything has landed. Choice-agnostic on purpose: the subject's private
 * agree / ignore / fight must never leak into what the room sees. Room-only (the subject gets
 * their own prompt), and gated by their "Others see your reactions" setting through tellRoom,
 * like every other public line. */
export function announceInductionBegin(): void {
	tellRoom(
		fillTokens(
			pick([
				"{name}'s eyes soften and go distant as a low voice draws {their} attention in.",
				"{name} goes quiet and still, {their} whole focus narrowing to a single voice.",
				"{name}'s gaze drifts, catches, and settles on something the rest of the room cannot hear.",
			]),
		),
	);
}

/** The subject's own line when an attempt misses and the hypnotist still has tries left.
 *
 * Deliberately says nothing about WHY. The subject already knows what they chose, so there
 * is nothing to tell them — and a pool that narrated the choice back would be wrong the
 * moment the roll, rather than the choice, is what decided it. Agreeing and missing reads
 * exactly like resisting and holding, which is also what keeps the room and hypnotist lines
 * below honest: all three describe the same visible non-event. */
export function inductionMissLine(): string {
	return pick([
		"The attempt doesn't quite land.",
		"Something in you almost gives, and then doesn't.",
		"The pull thins out before it reaches anything.",
		"For a moment it nearly catches. The moment passes.",
		"You feel the shape of it, and stay exactly where you are.",
	]);
}

/** The subject's line when the last attempt is spent and the cooldown starts. A separate
 * pool because this one is not "not yet" — it is "not again for a while", and the subject
 * is entitled to know the difference about their own state. */
export function inductionSpentLine(): string {
	return pick([
		"The attempt fades. You feel clear-headed, and harder to reach for a while.",
		"Whatever was reaching for you lets go. Your head is your own, and stays that way a while.",
		"It ebbs away and does not come back. You feel steadier, and less easy to move.",
	]);
}

/** The room-visible half of an attempt missing — the gap in the sequence, since onlookers
 * currently see an induction begin and see it land, and saw nothing at all in between.
 *
 * Choice-agnostic, for the same reason `announceInductionBegin` is: the subject's private
 * agree / ignore / fight must never leak. Every line here has to read the same whether they
 * cooperated and the roll missed or they fought it off outright, so nothing describes
 * effort, refusal or resolve — only that the moment passed. One pool for both the ordinary
 * miss and the spent last attempt, so the room cannot count the hypnotist's tries either.
 *
 * Tokens: only {name}, {their}, {them}, {themselves} are filled. Anything else ships as a
 * literal — see the v0.72.9 trigger-ghost bug and the guard test/notify.mjs now carries. */
export function announceInductionMiss(): void {
	tellRoom(
		fillTokens(
			pick([
				"{name}'s eyes flutter, drift, and then find the room again.",
				"Something almost settles over {name}, and then lifts.",
				"{name} sways a little, blinks, and the distance goes out of {their} gaze.",
				"For a breath {name} is somewhere else. Then {name} isn't.",
			]),
		),
	);
}

/** The line the HYPNOTIST's own client prints when an attempt of theirs misses.
 *
 * Why this exists: the miss was visible to them only on the subject's Information Sheet
 * panel. With that panel closed — which is most of the time — an attempt simply produced
 * nothing anywhere, and a userscript that produces nothing is indistinguishable from a
 * userscript that is broken. Rule 5, one screen removed.
 *
 * NO TOKENS. `fillTokens` fills from `Player`, and on this client Player is the hypnotist,
 * so a {name} here would print the hypnotist's own name for the subject's. The caller passes
 * the subject's name in and it is interpolated directly.
 *
 * Says that it ran and that it did not land. Not why, not how close — the band stays on the
 * panel where it already lives, and nothing here reveals the subject's choice. */
export function hypnotistMissFlavor(subject: string): string {
	return pick([
		`${subject} almost goes, and doesn't.`,
		`Something in ${subject} nearly gives way, then settles.`,
		`It reaches ${subject} and slides off.`,
		`${subject} wavers for a moment, and stays put.`,
	]);
}

/** The room-visible half of the subject going under — the hypnotist's signal that it landed,
 * since the private "you slip under" line never reaches them. Room-only, fired once on a real
 * successful induction and NOT on reconnect: recovery reuses the trance-apply path, which is
 * why this is called from the success branch rather than from applyTranceState. */
export function announceTranceEnter(): void {
	tellRoom(
		fillTokens(
			pick([
				"{name}'s eyes slip half-closed, and {their} whole body lets go.",
				"Something in {name} gives way, and the tension goes out of {them}, soft and unhurried.",
				"{name} sinks, breath slowing, wearing the loose calm of someone gone well under.",
			]),
		),
	);
}
