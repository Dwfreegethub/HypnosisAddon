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
	| "undress-frozen";

/** Public counterparts, for the things somebody standing there would actually see.
 *
 * Only a subset has one, and the split is the whole point: perception effects are
 * unobservable by definition. Nobody can watch you fail to notice your own clothes, so
 * awareness, touch-blocking, the illusion and the arousal levels stay private — while
 * reaching for yourself and stopping, or opening your mouth and producing nothing, are
 * plainly visible and should not be silent to the room.
 *
 * {name} is required, since an emote carries no name of its own. {their} / {them} /
 * {themselves} come from the player's chosen pronouns; the character's NAME is always the
 * subject of the sentence, which fixes the verb as third-person singular and saves writing
 * a they/them variant of every line. */
const PUBLIC_LINES: Partial<Record<FlavorKey, string[]>> = {
	"movement-block": [
		"{name} goes very still, mid-motion.",
		"{name} stops moving, as though the idea had gone.",
	],
	"movement-release": ["{name} moves again, a little unsteadily.", "Something lets go of {name}."],
	kneel: ["{name} sinks to {their} knees without seeming to decide to.", "{name} kneels, unhurried and unquestioning."],
	stand: ["{name} rises, without seeming to decide to.", "{name} is on {their} feet again."],
	// Placing a restriction is invisible — nothing happens for anyone to see. Only bumping
	// INTO one is observable, which is why the attempt keys carry the public lines and the
	// apply keys mostly do not. Movement and posture are the exceptions: going still and
	// kneeling are visible in themselves.
	// Undressing is the most observable thing in the add-on — it changes the character
	// everyone in the room is looking at, so unlike every other apply-time effect these get
	// a public line rather than staying silent.
	undress: [
		"{name} slips out of something, unhurried, without seeming to decide to.",
		"{name}'s hands undo a fastening while {their} face stays somewhere far away.",
		"Something of {name}'s comes off, set aside without a glance.",
	],
	"undress-all": [
		"{name} undresses steadily, piece after piece, attending to none of it.",
		"{name} takes everything off with the unbothered thoroughness of a habit.",
	],
	"undress-blocked": [
		"{name}'s hands move to undress and stop, held.",
		"{name} starts to undo something and cannot make {their} hands finish.",
	],
	"undress-frozen": [
		"{name} does not move to undress. {name} does not move at all.",
	],
	"clothing-blocked-attempt": [
		"{name} reaches for {their} clothes, and {their} hand drifts away again.",
		"{name} half-reaches for a fastening and seems to forget why.",
	],
	"selftouch-frozen": ["{name} twitches towards {themselves}, and nothing moves."],
	"selftouch-blocked": [
		"{name} starts to reach for {themselves}, and thinks better of it.",
		"{name}'s hands stay exactly where they are.",
	],
	"speech-blocked-attempt": [
		"{name} opens {their} mouth, and nothing comes out.",
		"{name} tries to say something, and does not.",
	],
	"orgasm-refused": ["{name} strains for it, and something holds {them} back."],
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
		"Your knees fold under you before you decide to kneel.",
		"The floor is where you should be, and you are already going down.",
		"You are kneeling. You don't remember choosing to.",
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
		"Your hands find the fastening before you have decided anything.",
		"It comes off. You are not sure you chose that, and you are not troubled by it.",
		"Taking it off seems like the obvious thing to have been doing.",
	],
	"undress-all": [
		"Your hands work without consulting you, and keep working until there is nothing left.",
		"Piece by piece, and none of it feels like a decision.",
		"You undress the way you would follow a habit — thoroughly, and without noticing.",
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
	"selftouch-frozen": [
		"Your hand doesn't move. Nothing of yours does.",
		"You go to reach for yourself and find nothing answers.",
		"Reaching would require moving, and you cannot move at all.",
	],
	"selftouch-blocked": [
		"Your hands stay exactly where they are.",
		"You were going to touch yourself. The impulse arrives and quietly leaves.",
		"Touching yourself isn't among the things you're going to do.",
	],
	"selftouch-applied": [
		"Reaching for yourself quietly stops being one of your options.",
		"Something closes off between you and your own hands.",
		"You will not be touching yourself. The decision is already made, and it was not yours.",
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
		"Something warm settles low in you, and stays.",
		"A small heat starts up somewhere, uninvited.",
		"You notice you are interested. You don't remember becoming interested.",
	],
	"arousal-high": [
		"The wanting arrives all at once and takes the room with it.",
		"Your body is suddenly, obviously desperate, and no part of that was your idea.",
		"Heat climbs through you faster than you can have an opinion about it.",
	],
	"arousal-full": [
		"You are right at the edge and something is holding you there.",
		"Everything in you is gathered and waiting, one word from going over.",
		"You are so close it hurts, and going the rest of the way is not up to you.",
	],
	"orgasm-force": [
		"You go over, because you were told to. There was never a moment to decide.",
		"Your body obeys before you understand what it was asked.",
		"It takes you, and you let it, because letting it was never the question.",
	],
	"orgasm-deny": [
		"The way over closes quietly, and you accept that it is closed.",
		"You could get close. You will not get past it, and you find you don't argue.",
		"Finishing stops being one of the things available to you.",
	],
	"orgasm-allow": [
		"The way over is open again, whenever it's offered.",
		"Something unlocks, low down, and you could finish now.",
		"Whatever was standing in the way steps aside.",
	],
	"orgasm-refused": [
		"You strain for it and something holds you back. Nothing gives.",
		"You are told to go over, and you cannot. The wanting has nowhere to go.",
		"Your body reaches for it, finds the way shut, and stays where it is.",
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
