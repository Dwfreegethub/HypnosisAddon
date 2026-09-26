# Triggers and Lasting Effects

> **Alpha Notice**  
> ECHS is in active alpha development. Trigger buffers, decay balancing, and multi-action executions are actively being refined. Both `/echs` and `/hypno` are fully recognized prefixes.

---

There are three ways for a suggestion to outlast an active session:

* **Planted Trigger:** Sleeps dormant in your client until someone speaks the trigger word.
* **Compulsion:** A trigger with no word. It waits for something to happen instead: a set time after you wake, someone coming into the room, or someone speaking.
* **Carry-Forward Suggestion:** A suggestion that remains active on your character after you wake up.

By default, all three require reaching a **Deep** trance level on genuine **Earned Depth** (built over time through trust and interaction; not temporary arousal). Depth thresholds can be customized in your Depth tab. See [Depth and Trust](Depth-and-Trust).

---

## 1. Planting a Trigger

Triggers are installed while the subject is deep in trance:

1. *"Missy, your trigger word is sleepy time"* (opens buffer, begins recording)
2. *"Missy, you cannot move"* (recorded to buffer, **not** executed immediately)
3. *"Missy, you cannot speak"* (recorded to buffer)
4. *"Missy, remember trigger"* (saves and arms the trigger)

### Buffer Safeguards
* **Actions are recorded, not performed:** When building a trigger that contains a freeze, the action is buffered without executing. This avoids freezing the subject mid-setup or forcing the hypnotist to undo states during installation.
* **Capacity:** Up to **8 actions** can be stored in a single trigger phrase.
* **Canceling:** Saying *"Missy, forget the trigger"* drops the recording buffer without saving.
* **An action on the same line:** after a pause — a comma, a dash, *"and"* or *"then"* — the rest of the start line is recorded too: *"Missy, when you hear ember glow, touch your breasts three times"* plants *"ember glow"* with the touch. Without a pause, the whole phrase is the word, as before.
* **Renaming on the fly:** Saying a new *"Missy, your trigger word is [new phrase]"* while still recording renames the buffer while preserving the actions already queued.
* **Subject Privacy:** Feedback during setup is delivered to the hypnotist. The subject never sees their trigger word by default: not when it is planted, not when someone says it, and not in the trigger list (see [Your Trigger Words Stay Hidden](#4-your-trigger-words-stay-hidden)). If **Awareness → Trigger setup** is enabled, the subject's client also hides the entire planting dialogue from chat.
* **Phrase Length:** A trigger phrase must be **at least 5 characters** long to avoid triggering accidentally during regular room conversation.

### Shaping the Trigger While Planting

Between naming the trigger and saying *"remember trigger"*, the hypnotist can shape how it behaves. Each line is confirmed privately to the hypnotist.

| Say | What It Does |
|---|---|
| *"Missy, this trigger works only once"* | The trigger is used up the first time it fires. |
| *"Missy, it works every time"* | The trigger keeps working until it fades (the default for an ordinary trigger). |
| *"Missy, it lasts 2 hours"* · *"it fades in three days"* | Gives the trigger a hard time limit. It ends at that time, or when it fades, whichever comes first. |
| *"Missy, it lasts forever"* | Removes a time limit given earlier. Fading still applies. |
| *"Missy, anyone can use it"* · *"your owner can use it too"* · *"only I can use it"* | Asks for who may fire it. The subject's own setting is the ceiling (see [Trigger Scope](#6-trigger-scope-who-can-fire-your-triggers)). |
| *"Missy, only when you hear it exactly"* | The trigger fires only on the whole words, never inside a longer word. |

The subject's settings always win. If they cap how long a trigger may last, or who may fire it, the hypnotist is told what changed when the trigger is saved.

### An Instant Drop

A trigger can drop the subject straight into trance, with no prompt and no roll:

* *"Missy, you will drop into trance"* while recording, or on the same line as the word: *"Missy, when you hear ember glow, you will drop into trance"*.

This needs **Drop triggers** turned on in the subject's Triggers tab. It is **Off** by default.

* **One time** (the subject's setting): each drop trigger works once, then it is gone.
* **Unlimited:** it works each time, until it fades, but only if the hypnotist said *"it works every time"*. Otherwise it still works once.

A drop follows the same rules as an ordinary hypnosis attempt. It does not work if the subject is already in a trance, if someone else is part-way through hypnotizing them, or if the person saying it is not in the room. Whoever says the word becomes the hypnotist, and the trance goes as deep as the trigger is currently strong. Waking works as usual, and the safeword always works.

### Words to Say

A trigger can make the subject say something aloud:

* *"Missy, you will say 'I obey'"*, or *"Missy, you will say 'good girls obey' three times"* for a mantra (up to five times).
* On the same line as the word: *"Missy, when you hear ember glow, you will say 'I obey'"*.

When it fires, the subject says exactly those words in the room, a second or two apart for a mantra. This needs the **Made to Speak** permission. It is off by default and needs an **Entranced** trance to plant.

* A gag still garbles the words, and an owner's speech rules still stop them. The subject is told when that happens.
* A trigger can speak for the subject even while the trance keeps them from speaking on their own.
* At most six such lines go out a minute, and a line said this way never fires the subject's own triggers. This keeps two triggers from setting each other off forever.
* *"Missy, you will say nothing"* is still a silence, not words to say.

---

## 2. Uniqueness, Overrides, and Clashes

Every trigger word is **unique per subject** — two different players cannot hold the identical trigger word on you at the same time. When a hypnotist attempts to plant a word that is already registered in your client, the parser handles it in one of three ways:

* **Their own word:** If the hypnotist re-records a phrase they previously installed, it simply **updates**. Refining or maintaining your own trigger does not require re-clearing the original depth check.
* **Someone else's word:** Another hypnotist can only override an existing trigger if they have taken you **deeper into trance than the depth at which the original trigger was planted**. Taking over another player's trigger requires a deeper trance state; otherwise, the attempt refuses.
* **Sub-phrase overlap:** If a new phrase is fully contained inside an existing trigger (for example, attempting to plant *"sleep"* when *"sleepy time"* is already stored), it is **always refused**. Because one word would inevitably fire the other, conflicting sub-phrases cannot coexist.

### Override Rules
* **No overrides while holding:** A trigger cannot be replaced or overwritten while that specific trigger is actively holding the subject.
* **Clean slate:** An override replaces the old trigger completely rather than inheriting its properties. The new trigger starts fresh at baseline strength. If an override occurs, the subject feels *something come loose and something new settle into place*, without revealing the words or players involved.
* **Private refusal reasons:** When a trigger is refused due to a conflict, the hypnotist is not told which existing trigger caused the clash or who planted it. Your stored triggers remain confidential.

---

## 3. Firing a Trigger

To fire a primed trigger, the speaker simply includes the phrase in room chat:

> *"I think it is sleepy time."*

* **No active session required:** A trigger functions whether an active trance session is running or not.
* **Universal matching:** The speaker does not need ECHS installed. Matching is evaluated entirely on the **subject's** local client.
* **Sequential execution:** If a trigger contains multiple queued actions, they arrive **one at a time** with a short, deliberate pause between each action.
* **Duration:** A fired trigger holds for the duration configured on the subject's Triggers tab, or until manually released.
* **Inside longer words:** By default a trigger also fires inside a longer word (*"sleepy"* fires on *"sleepyhead"*). A trigger planted with *"only when you hear it exactly"* fires on the whole words only, and ticking **Triggers fire only on whole words** on your Triggers tab makes every trigger work that way.
* **Once, or until a time:** A trigger set to work once is used up when it fires. If it is holding you, it stays listed as *used up* until it lets go, then disappears. A trigger with a time limit stops working when the time runs out, even if you were logged off.

---

## 4. Your Trigger Words Stay Hidden

Unless you tick **Show trigger words** on your Triggers tab, you never see your own trigger words:

* **In chat:** when anyone says one of your trigger words, or plants a new one, your screen shows **"..."** in its place. The trigger still works. This happens only on your own screen: everyone else in the room sees the message as it was sent. It covers chat, whispers and emotes, and the ungarbled copy the game can show beside a gagged player's words. Your own messages are never changed.
* **In the list:** see [Checking and Removing Your Triggers](#9-checking-and-removing-your-triggers).

---

## 5. Compulsions: Waiting for Something, Not a Word

A compulsion is a trigger with no word. It waits for a condition instead. The hypnotist sets one up while you are under, starting the line with the condition, then says *"remember trigger"*:

| Say | When It Fires |
|---|---|
| *"Missy, five minutes after you wake, you will kneel"* | Five minutes after you next wake from a trance with that hypnotist. |
| *"Missy, when you wake, you cannot move"* · *"after you wake up, …"* · *"once you are awake, …"* · *"upon waking, …"* · *"when you open your eyes, …"* | The moment you wake. |
| *"Missy, when Rei comes in, …"* | When Rei next enters the room. |
| *"Missy, when I come back, …"* | When the hypnotist returns to the room. |
| *"Missy, when Rei speaks, …"* · *"when you hear Rei's voice, …"* | When Rei next says anything in chat. |

Whatever follows the condition on the same line is recorded, just as on its own line: a suggestion, words to say, or a drop. The hypnotist can also end the line at the condition and give the suggestions on the lines that follow.

* **Never while you are under:** a compulsion only goes off after the trance is over.
* **Once by default:** it is used up when it fires, unless the hypnotist says *"it works every time"*.
* **The clock keeps running:** a compulsion timed from waking keeps counting while you are logged off, and goes off soon after you are back in a room if its time has passed.
* **Only that hypnotist's trance starts the clock:** waking from someone else's trance does not.
* **Your safeword clears them:** any compulsion waiting for you to wake is discarded by `/echs safeword`. Compulsions waiting for a person are kept, as ordinary triggers are.
* A line such as *"Missy, when you wake up you will feel refreshed"*, with nothing that can be kept after the condition, is not stored. You stay in trance and the hypnotist is told. If the same line also says *"wake up"*, it wakes you as usual.

Compulsions otherwise work like any trigger: the same permissions, strength, fading and options, and they show in your trigger list with the condition in place of a word.

---

## 6. Trigger Scope: Who Can Fire Your Triggers?

Configured on your **Triggers** tab. ECHS uses a 7-rung scope ladder (defaulting to **Hypnotist only**):

1. **Hypnotist only** (the player who planted it)
2. **Hypnotist and Owner**
3. **Hypnotist, Owner, and Lovers**
4. …plus **Whitelist**
5. …plus **Dominants**
6. **Everyone except Blacklist**
7. **Everyone** (public trigger, no restrictions)

The player who planted the trigger can always fire it regardless of the selected rung. Whether **you** can fire your own triggers is an independent setting (*"You can fire your own triggers"* on the Triggers tab).

A hypnotist can ask for a narrower or wider scope for one trigger while planting it. Your setting is always the ceiling: they can narrow it, but never widen it past what you allow.

---

## 7. Releasing a Trigger

* **Specific Release by Name:** Saying *"Missy, you are released from sleepy time"* releases that specific trigger immediately, working inside or outside of trance.
* **Trance-Only General Releases:** Broad release phrasing (*"you are awake"*, *"wake up"*) applies only to active trance sessions and does not release dormant or fired triggers outside of a session.

---

## 8. Trigger Decay & Strength Loss

Planted triggers naturally lose potency over time unless maintained. The decay rate is configured on your Triggers tab (defaults to **Never** for a "plant-and-forget" style).

* **Deeper planting lasts longer:** Triggers planted in deep trance states persist significantly longer than shallow ones.
* **Compounding fade:** Neglected triggers shed strength faster the longer they sit unused.
* **Firing vs. Reinforcing:** Firing a trigger slows its rate of fade but does not reset the clock.
* **Reinforcing:** When the original hypnotist is in an active session with the subject, saying *"Missy, that trigger holds"* **completely resets the decay timer** across every trigger they have planted in you.
* **A lifespan cap:** **Longest a new trigger lasts** on your Triggers tab (15 minutes to a day, or no limit) gives every trigger planted from then on a time limit, whatever the hypnotist asks for. Triggers you already have are not shortened.

### Graceful Degradation
A faded trigger does not switch off abruptly: **its current remaining strength determines the depth tier it can fire at.** 
* A Deep-tier trigger that has decayed down to a Yielding level will still successfully fire its Yielding-tier actions (like freezing), but its deeper actions (like undressing) will fail to take hold.
* If a trigger decays completely, hearing the phrase produces a slight internal pull without executing actions.

*(Note: Triggers permitted to unlock via arousal rather than earned depth decay rapidly regardless of your settings).*

---

## 9. Checking and Removing Your Triggers

The list is in two steps, so seeing what a trigger does is something you choose to do:

* `/echs triggers` (or `/hypno triggers`) says how many triggers you have, who planted each one (name and member number), and how strong it still is. It does not say what they do.
* `/echs triggers <number>` shows that one trigger in full: what it does, in plain words, any options such as *works once* or *ends in 2 hours*, the condition for a compulsion, and whether it is holding you now.

The trigger word stays hidden in both unless you have ticked **Show trigger words**.

The **Planted** tab in your settings shows the same list, with two buttons on each trigger:

* **Details** shows the same full view as `/echs triggers <number>`.
* **Purge** removes that trigger. A trigger that is holding you shows **Holding** instead and cannot be removed until it lets go.

**Clear All**, at the bottom of the Planted tab, removes every trigger at once, including any you cannot see. It will not run while a trigger is holding you or a hypnosis session is running: clear that first. When it may run, it asks you to click twice. `/echs forgettrigger all` follows the same rules, and removes everything only when you type `/echs forgettrigger all confirm`.

---

## 10. Carrying Suggestions Past Waking

Carry-forward suggestions allow active trance commands to persist after waking:

1. *"Missy, you cannot touch your breasts"*
2. *"Missy, that will stay with you"* (marks the single most recent suggestion to persist)
3. *"Missy, all of this stays with you"* (marks all active suggestions to persist)
4. *"Missy, forget what I said"* (reverses the carry command)

### Constraints
* **Natural speech ordering:** The carry command applies to the most recently delivered suggestion, allowing natural roleplay phrasing.
* **Trance defaults never carry:** Automatic session defaults (*Cannot Move*, *Cannot Speak*, *Screen Fade*) **can never be carried past waking**. You will always wake with movement and speech restored. Making a physical restriction persistent requires delivering it deliberately as a spoken command first.
* **Releasing carried suggestions:** The hypnotist who applied a carried suggestion can release it at any time using standard release phrasing.

---

## 11. Commanded Activities in Triggers

Physical self-actions can be stored in triggers (e.g., *"Missy, touch your breasts"* recorded under *"good girl"*). See [Commanded Activities](Commanded-Activities). When triggered, game activities execute one by one with a short delay between each action.

---

## 12. What to Do If You Are Held

If a trigger or lasting suggestion is holding your character:
* Wait for the trigger duration timer to expire.
* Have the hypnotist release you by name (*"Missy, you are released from sleepy time"*).
* **Use your safeword:** Type `/echs safeword` (or `/hypno safeword`) to immediately purge all active holds, trances, and lingering effects. It also discards any compulsion waiting for you to wake.

`/echs forgettrigger`, and **Purge** on the Planted tab, **refuse while that trigger is actively holding you.** Deleting a trigger while under its direct influence is blocked to preserve scene tension; the safeword remains the universal exit. Because Bondage Club parses client slash commands before speech-restriction hooks evaluate text, your safeword remains fully accessible even while muted.
