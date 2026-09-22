# Triggers and Lasting Effects

> **Alpha Notice**  
> ECHS is in active alpha development. Trigger buffers, decay balancing, and multi-action executions are actively being refined. Both `/echs` and `/hypno` are fully recognized prefixes.

---

There are two primary ways for a suggestion to outlast an active session:

* **Planted Trigger:** Sleeps dormant in your client until someone speaks the trigger word.
* **Carry-Forward Suggestion:** A suggestion that remains active on your character after you wake up.

By default, both require reaching a **Deep** trance level on genuine **Earned Depth** (built over time through trust and interaction; not temporary arousal). Depth thresholds can be customized in your Depth tab. See [Depth and Trust](Depth-and-Trust).

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
* **Renaming on the fly:** Saying a new *"Missy, your trigger word is [new phrase]"* while still recording renames the buffer while preserving the actions already queued.
* **Subject Privacy:** Feedback during setup is delivered to the hypnotist. The subject is never shown the clear-text trigger phrase by default, preventing conscious anticipation. If **Awareness → Trigger setup** is enabled, the subject's client suppresses the entire planting dialogue from chat.
* **Phrase Length:** A trigger phrase must be **at least 5 characters** long to avoid triggering accidentally during regular room conversation.

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

---

## 4. Trigger Scope: Who Can Fire Your Triggers?

Configured on your **Triggers** tab. ECHS uses a 7-rung scope ladder (defaulting to **Hypnotist only**):

1. **Hypnotist only** (the player who planted it)
2. **Hypnotist and Owner**
3. **Hypnotist, Owner, and Lovers**
4. …plus **Whitelist**
5. …plus **Dominants**
6. **Everyone except Blacklist**
7. **Everyone** (public trigger, no restrictions)

The player who planted the trigger can always fire it regardless of the selected rung. Whether **you** can fire your own triggers is an independent setting (*"You can fire your own triggers"* on the Triggers tab).

---

## 5. Releasing a Trigger

* **Specific Release by Name:** Saying *"Missy, you are released from sleepy time"* releases that specific trigger immediately, working inside or outside of trance.
* **Trance-Only General Releases:** Broad release phrasing (*"you are awake"*, *"wake up"*) applies only to active trance sessions and does not release dormant or fired triggers outside of a session.

---

## 6. Trigger Decay & Strength Loss

Planted triggers naturally lose potency over time unless maintained. The decay rate is configured on your Triggers tab (defaults to **Never** for a "plant-and-forget" style).

* **Deeper planting lasts longer:** Triggers planted in deep trance states persist significantly longer than shallow ones.
* **Compounding fade:** Neglected triggers shed strength faster the longer they sit unused.
* **Firing vs. Reinforcing:** Firing a trigger slows its rate of fade but does not reset the clock.
* **Reinforcing:** When the original hypnotist is in an active session with the subject, saying *"Missy, that trigger holds"* **completely resets the decay timer** across every trigger they have planted in you.

### Graceful Degradation
A faded trigger does not switch off abruptly: **its current remaining strength determines the depth tier it can fire at.** 
* A Deep-tier trigger that has decayed down to a Yielding level will still successfully fire its Yielding-tier actions (like freezing), but its deeper actions (like undressing) will fail to take hold.
* If a trigger decays completely, hearing the phrase produces a slight internal pull without executing actions.

*(Note: Triggers permitted to unlock via arousal rather than earned depth decay rapidly regardless of your settings).*

Check current trigger health at any time:
```text
/echs triggers
