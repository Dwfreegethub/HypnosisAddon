# Commanded Activities

> 🛡️ **EMERGENCY EXIT:** Type `/echs safeword` at any time to break trances and drop all commands.

---

Everything else in the add-on **stops** the subject from doing something. This makes them **act**: on herself, on someone else in the room by name, or on the hypnotist (see [Touching Someone Else](#touching-someone-else)).

*"Missy, touch your breasts"* and she performs the real Bondage Club activity on herself — it renders in the room exactly as though she had clicked it, with the same native arousal changes and the same chat narration.

* **Permission:** *Made to Act (touch yourself on command)* on the Permissions tab.
* **Default Depth:** **Yielding (20)** (adjustable in your Depth settings).

---

## Quick Jump

* **[The Grammar](#the-grammar)**
* **[Recognized Verbs](#recognized-verbs)**
* **[Without Naming a Specific Part](#without-naming-a-specific-part)**
* **[Taking a Sip](#taking-a-sip)**
* **[Moving and Sounds](#moving-and-sounds)**
* **[What Can Refuse an Action](#what-can-refuse-an-action)**
* **[Touching Someone Else](#touching-someone-else)**
* **[Storing in a Trigger](#storing-in-a-trigger)**
* **[What the Players See](#what-the-players-see)**
* **[Current Scope & Limits](#current-scope--limits)**

---

## The Grammar

One pattern powers the entire activity parser:

`<verb> your <part>`

The **verb** picks the activity; **`your <part>`** selects the body zone. Around 40 body terms are understood — the exact same dictionary used by the self-touch block.

Once you know *"touch your breasts"*, you automatically get *"pinch your nipples"*, *"lick your thighs"*, and *"spank your bottom"* without learning separate rules.

* `<verb> your <part>` ──► Targets yourself (e.g., *"Missy, pinch your nipples"*)
* `<verb> me` ──► Targets the hypnotist (e.g., *"Missy, kiss me"*)
* `<verb> <name> ['s <part>]` ──► Targets another player (e.g., *"Missy, kiss Rei"*)

---

### More Than Once

Add a count to repeat it, up to five times: *"Missy, touch your breasts three times"* (or *"3 times"*, *"twice"*). Each touch is its own action a second or two apart, so the room sees three touches, not one. Inside a trigger, the whole repeat takes a single action slot. Her safeword, or a lost permission, stops the rest.

---

## Recognized Verbs

Words grouped on the same row trigger the same underlying game activity. **First match wins**, so a specific verb takes priority over a broader catch-all.

| Say Any Of | Action | Example |
|---|---|---|
| grope · squeeze · fondle | Grope | *"Missy, squeeze your breasts"* |
| pinch | Pinch | *"Missy, pinch your nipples"* |
| spank · smack | Spank | *"Missy, spank your bottom"* |
| slap | Slap | *"Missy, slap your thighs"* |
| scratch | Scratch | *"Missy, scratch your arms"* |
| tickle | Tickle | *"Missy, tickle your feet"* |
| pull · tug | Pull | *"Missy, pull your hair"* |
| choke | Choke | *"Missy, choke your throat"* |
| massage · knead | Massage | *"Missy, massage your shoulders"* |
| nibble | Nibble | *"Missy, nibble your lips"* |
| lick | Lick | *"Missy, lick your fingers"* |
| kiss | Kiss | *"Missy, kiss your hands"* |
| suck | Suck | *"Missy, suck your fingers"* |
| bite | Bite | *"Missy, bite your lips"* |
| pet | Pet | *"Missy, pet your hair"* |
| finger · masturbate · pleasure · play with | Masturbate | *"Missy, finger your pussy"* |
| **touch · caress · stroke · rub · feel** | Caress — the catch-all, reaches almost every zone | *"Missy, touch your breasts"* |

> ⚠️ **Caution (The "Feel" Trap):** Because `feel` maps to the Caress activity, an ordinary deepening sentence — *"Missy, your arms feel heavy"* — can inadvertently be parsed as *caress your arms*, causing her character to execute a real, public touch. **Stick to `touch`, `caress`, or `stroke`** until verb disambiguation is updated. This quirk only affects subjects who have enabled *Made to Act*. See [Troubleshooting](Troubleshooting) for details.

---

## Without Naming a Specific Part

| Say | Effect |
|---|---|
| *"Missy, touch yourself"* | Her hands **wander** to a random, physically reachable zone, and the hypnotist receives a quiet prompt to be specific. |
| *"Missy, finger yourself"* · *"masturbate"* · *"pleasure yourself"* | Directly targets the genitals. |

The wandering version always executes something valid, subtly guiding the hypnotist toward more precise commands without stalling the scene.

*(Note: Held-toy activities are not currently supported. Extending syntax like "with the <toy>" is under consideration for a future update.)*

---

## Taking a Sip

| Say | Effect |
|---|---|
| *"Missy, take a sip"* · *"have a drink"* · *"sip your drink"* · *"drink up"* | She sips the drink in her hand: the game's own **Sip** action, done by her. |
| *"Missy, take a sip three times"* | Three sips, one after another (up to five). |

* It needs **Made to Act**, like the touches.
* She has to be holding something she can sip from (a filled glass or a mug), with her hands free and her mouth not blocked. If she isn't, the hypnotist is told she can't right now.
* A crafted **ECHS drink** works on her as if she'd sipped it herself, within her own drink settings. See [Drinks and Cigarettes](Drinks-and-Cigarettes).
* It can be planted in a trigger, like a touch.

---

## Moving and Sounds

Since v1.16.5. Each is the game's own action, done by her, under **Made to Act**, and can be repeated (*"three times"*) or planted in a trigger like a touch.

| Say | Effect |
|---|---|
| *"Missy, wiggle your hips"* · *"shake your breasts"* · *"sway your hips"* · *"jiggle your butt"* · *"bounce your chest"* | The game's **Wiggle** on that part. Works on most of her body: hips, bottom, breasts, belly, legs, feet, arms, hands, head, ears. The word has to come right before *your <part>*, so *"feel your body shake"* is still just patter. |
| *"Missy, wiggle"* · *"wiggle for me"* · *"shimmy"* · *"shake it"* | Wiggles her hips (her bottom if her hips can't). |
| *"Missy, nod"* · *"nod your head"* | The game's **Nod**. Not *"nod off"*. |
| *"Missy, struggle"* · *"fight your bonds"* | She struggles against whatever ties her arms, or her legs. Only while she is tied; otherwise the hypnotist is told there is nothing to struggle against. *"The more you struggle"* and *"struggle to wake"* are patter and do nothing. |
| *"Missy, cover your mouth"* · *"put your hand over your mouth"* | Her own hand over her mouth. |
| *"Missy, grab your collar"* | Grabs her own collar, if she wears one. |

**Through a gag.** These are the game's gagged sounds, so she has to be wearing a gag that makes them. Without one the hypnotist is told so, except for *"moan for me"*, which is then the moan face, as before.

| Say | Sound |
|---|---|
| *"moan"* | Moans into the gag |
| *"whimper"* · *"whine"* | Whimpers |
| *"groan"* | Groans |
| *"giggle"* | Giggles |
| *"growl"* · *"grumble"* | An angry noise |
| *"mumble"* · *"try to talk"* · *"talk through your gag"* | Tries to talk |

---

## What Can Refuse an Action

**Real physical limits always take precedence.** ECHS queries Bondage Club's engine before attempting an action. A locked chastity belt, bound wrists, being physically out of reach, or zones disabled in the subject's native BC arousal preferences will refuse the command cleanly. The script respects native game rules rather than forcing an illegal state.

**Hypnotic restrictions applied by this add-on do not block commands.** A direct command is treated as involuntary — the hypnotist is guiding her hands, not asking her conscious permission. Therefore, incoming commands bypass restrictions applied by ECHS itself:

* The hypnotic self-touch block (*"you cannot touch yourself"*)
* The hypnotic freeze (*"you cannot move"*)
* Hypnotic orgasm denial (*"you cannot cum"*, followed by *"cum for me"*)

A **real** physical restraint that immobilizes her or a **real** chastity lock will still stop the action. The rule is simple: if the barrier belongs to ECHS, the hypnotist can command through it; if the barrier belongs to native BC items, it stands.

This allows classic hypnotic tropes to work seamlessly: *"you cannot touch yourself"* and *"touch your breasts"* can coexist. The block binds her conscious will, while the direct suggestion bypasses volition entirely.

---

## Touching Someone Else

The same verbs, aimed at a person instead of `your <part>`:

| Say | Lands on |
|---|---|
| *"Missy, kiss Rei"* | Rei's lips. Kiss, spank and pet have a default spot (lips, bottom, head). Other verbs ask for a part. |
| *"Missy, kiss Rei's nipples"* · *"Missy, lick Rei on the neck"* | The part you name. |
| *"Missy, kiss me"* · *"Missy, pinch my nipples"* | Whoever said it, the hypnotist. |
| *"Missy, hug Rei"* · *"cuddle me"* · *"snuggle Rei"* | A cuddle (since v1.16.5). *"Nuzzle me"* is the same with her nose. |
| *"Missy, kick Rei"* · *"kick Rei's bottom"* | A kick, to the legs unless you name a part. |
| *"Missy, grab Rei by the collar"* · *"grab my collar"* · *"grab me"* | Grabs their collar, if they wear one. *"Grab me a drink"* does nothing. |
| *"Missy, cover my mouth"* · *"hand gag Rei"* · *"put your hand over Rei's mouth"* | Her hand over their mouth. |
| *"Missy, peck my hand"* · *"politely kiss Rei"* | A polite kiss, on the hand unless you name a part (feet, lips). |
| *"Missy, fuck me"* · *"fuck me with your strap-on"* · *"fuck Rei"* | With her strap-on (since v1.16.17): slow penetration, the pussy unless you name a part. |
| *"Missy, fuck me hard"* · *"fuck my ass roughly"* · *"fuck Rei's mouth"* | *Hard*, *rough* or *fast* anywhere on the line makes it fast. Parts: pussy, ass (or butt), mouth. *"Penetrate"*, *"screw"* and *"pound"* work too. |

* **Names are exact.** Use the person's full name or their nickname as shown in the room. A partial or misspelled name does nothing. If two people answer to the same name, nothing happens and the hypnotist is told why.
* **Permission:** the subject needs *Made to Act*. For anyone other than the hypnotist, she also needs **Made to Touch Others**, which is off by default.
* **The other person's own game settings decide.** ECHS asks Bondage Club whether the subject could do this to them by clicking: their arousal zones and activity settings, and the item permission they give the subject. If the game says no, it does not happen. The other person needs no add-on.
* **What the hypnotist is told when it doesn't land:** on their own body, which of their own settings stopped it. On anyone else, only that it didn't land and never why, so the command can't be used to learn a stranger's settings.
* **"Missy, suck my strap-on"** (or *"suck on Rei's strap-on"*, since v1.16.18): she sucks the strap-on *you* (or Rei) are wearing. She needs her mouth free (not gagged), and the strap-on has to be on with nothing over it. *"Suck my cock"* is the game's ordinary suck, as before.
* **Fucking needs something to do it with:** a strap-on she wears, a dildo in her hand (the Large or Small Dildo), or a dildo gag (she uses her mouth). Pick one by saying it (since v1.16.23): *"fuck me with your dildo"*, *"with your strap-on"*, *"with your gag"* (or *"with your dildo gag"*); without that, the game's first one is used. If she has none, or not the one you named, the hypnotist is told so. A worn strap-on or a dildo gag still works while she is tied up; a dildo in hand needs her hands free. The game also wants the spot bare and empty: no clothing, chastity belt or toy in the way, and an open mouth for a mouth.
* **`feel` is not used here.** *"Feel my hands on you"* is ordinary hypnotic patter, so it never aims a touch at anyone.
* **Not yet in triggers.** A touch aimed at a person cannot be recorded into a trigger yet. Saying one while a trigger records is refused.

---

## Storing in a Trigger

A commanded activity can be recorded into a dormant trigger phrase just like any other action:

1. *"Missy, your trigger word is good girl"*
2. *"Missy, touch your breasts"* *(recorded to buffer, not executed immediately)*
3. *"Missy, remember trigger"*

When the trigger word is eventually spoken, permissions, trance depth, and native physical item checks are re-evaluated **at that exact moment**. A trigger planted days earlier cannot force a character to touch herself through a chastity belt or wrist ropes applied in the meantime.

Triggers carrying multiple queued actions will execute them **one at a time**, with a brief delay between each action.

---

## What the Players See

* **The Room:** Sees a standard Bondage Club activity event in chat — indistinguishable from the subject having clicked the activity button manually.
* **The Subject:** Receives a private client notification stating that her body moved and responded without waiting for her conscious input.

There is no redundant room narration from ECHS, ensuring chat stays clean and immersive.

---

## Current Scope & Limits

In the current build, commanded activities are **one-shot**.

* **Touching other players:** Works for a named person or the hypnotist. A random pick (*"touch someone's hand"*) and aiming a trigger at a person are still to come.
* **Toy activities:** Interacting with held toys is under consideration.
* **Loops:** Sustained actions (*"keep stroking"*) are planned for a later phase.
* **Conditions already work as triggers:** *"Missy, when you hear good girl, touch your breasts"* plants a trigger in one line (then *"Missy, remember trigger"*), and a compulsion waits for a moment instead of a word (*"Missy, five minutes after you wake, touch yourself"*, *"Missy, when Rei comes in, kneel"*). See [Storing in a Trigger](#storing-in-a-trigger) and [Triggers and Lasting Effects](Triggers-and-Lasting-Effects).