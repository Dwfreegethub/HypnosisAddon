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
	| "speech-blocked-attempt";

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
