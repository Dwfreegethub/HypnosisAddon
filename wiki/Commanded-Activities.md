# Commanded Activities

> **Alpha Notice**  
> ECHS is in active alpha development. Since v0.84.0 a commanded activity can be aimed at someone else in the room by name, or at the hypnotist (see [Touching Someone Else](#touching-someone-else)). Sustained activity loops and additional actions are experimental or pending implementation. Mechanics and syntax may adjust in upcoming builds.

---

Everything else in the add-on **stops** the subject from doing something. This makes them **act**.

*"Missy, touch your breasts"* and she performs the real Bondage Club activity on herself — it renders in the room exactly as though she had clicked it, with the same native arousal changes and the same chat narration.

* **Permission:** *Made to Act (touch yourself on command)* on the Permissions tab.
* **Default Depth:** **Yielding** (adjustable in your Depth settings).

---

## The Grammar

One pattern powers the entire activity parser:

`<verb> your <part>`

The **verb** picks the activity; **`your <part>`** selects the body zone. Around 40 body terms are understood — the exact same dictionary used by the self-touch block.

Once you know *"touch your breasts"*, you automatically get *"pinch your nipples"*, *"lick your thighs"*, and *"spank your bottom"* without learning separate rules.

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

> ⚠️ **`feel` is a known alpha parser quirk and is listed here for transparency, not as a recommendation.**  
> Because `feel` maps to the Caress activity, an ordinary deepening sentence — *"Missy, your arms feel heavy"* — can inadvertently be parsed as *caress your arms*, causing her character to execute a real, public touch. **Stick to `touch`, `caress`, or `stroke`** until verb disambiguation is updated. This quirk only affects subjects who have enabled *Made to Act*. See [Troubleshooting](Troubleshooting) for details.

---

## Without Naming a Specific Part

| Say | Effect |
|---|---|
| *"Missy, touch yourself"* | Her hands **wander** to a random, physically reachable zone, and the hypnotist receives a quiet prompt to be specific. |
| *"Missy, finger yourself"* · *"masturbate"* · *"pleasure yourself"* | Directly targets the genitals. |

The wandering version always executes something valid, subtly guiding the hypnotist toward more precise commands without stalling the scene.

*(Note: Held-toy activities are not currently supported. Extending syntax like "with the <toy>" is under consideration for a future update.)*

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

*New in v0.84.0.* The same verbs, aimed at a person instead of `your <part>`:

| Say | Lands on |
|---|---|
| *"Missy, kiss Rei"* | Rei's lips. Kiss, spank and pet have a default spot (lips, bottom, head). Other verbs ask for a part |
| *"Missy, kiss Rei's nipples"* · *"Missy, lick Rei on the neck"* | The part you name |
| *"Missy, kiss me"* · *"Missy, pinch my nipples"* | Whoever said it, the hypnotist |

* **Names are exact.** Use the person's full name or their nickname as shown in the room. A partial or misspelled name does nothing. If two people answer to the same name, nothing happens and the hypnotist is told why.
* **Permission:** the subject needs *Made to Act*. For anyone other than the hypnotist, she also needs **Made to Touch Others**, which is off by default.
* **The other person's own game settings decide.** ECHS asks Bondage Club whether the subject could do this to them by clicking: their arousal zones and activity settings, and the item permission they give the subject. If the game says no, it does not happen. The other person needs no add-on.
* **What the hypnotist is told when it doesn't land:** on their own body, which of their own settings stopped it. On anyone else, only that it didn't land and never why, so the command can't be used to learn a stranger's settings.
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

* **Touching other players:** Built in v0.84.0 for a named person or the hypnotist. A random pick (*"touch someone's hand"*) and aiming a trigger at a person are still to come.
* **Toy activities:** Interacting with held toys is under consideration.
* **Loops and conditions:** Sustained actions (*"keep stroking"*) and conditional triggers (*"touch yourself whenever you hear X"*) are planned for later phases.
