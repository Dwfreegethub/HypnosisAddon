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
	/** Tried to touch themselves while frozen. */
	| "selftouch-frozen"
	/** Tried to touch themselves while blocked outright. */
	| "selftouch-blocked"
	| "selftouch-part-block"
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
	| "illusion-release";

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
	"clothing-block": [
		"Your hands will not go near your clothes, and you stop wondering why.",
		"The thought of changing slips away before you can hold on to it.",
		"You reach for a fastening and forget what you were reaching for.",
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
	"selftouch-part-block": [
		"You will leave that part of yourself alone now.",
		"Some of you is off-limits to you. You accept this easily.",
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

export function flavor(key: FlavorKey): string {
	const options = LINES[key];
	return options[Math.floor(Math.random() * options.length)];
}

/** Body-part refusals name the part, so they can't come from the static table. Uses the
 * subject's hypnotist's own wording rather than a group name — being told "your breasts"
 * and refused about "ItemBreast" would break the spell rather badly. */
export function bodyPartFlavor(part: string): string {
	const options = [
		`Your hands move towards your ${part}, then you change your mind. You do not need to touch them.`,
		`You reach for your ${part} and lose interest halfway there.`,
		`Touching your ${part} stops seeming like something you were going to do.`,
		`Your hands get as far as your ${part} before forgetting why.`,
	];
	return options[Math.floor(Math.random() * options.length)];
}
