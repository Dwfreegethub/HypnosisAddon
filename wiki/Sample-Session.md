# A Sample Session

> **Alpha Notice**  
> ECHS is in active alpha development. Real-time feedback, visual cues, and chat outputs are continually being refined. Both `/echs` and `/hypno` are fully recognized prefixes.

---

A worked example, end to end: two people, the actual lines typed in room chat, and what each player sees on their screen.

**Elena** is the hypnotist. **Missy** is the subject. The dialogue below reflects the parser matching, depth gates, and message strings used in the mod.

*Note on In-Game Responses:* Most of Missy's private notifications and room emotes are randomly drawn from two or three variants. Where this happens, it is marked **(one of several)**. Any line shown in `[square brackets]` is private to Missy—nobody else in the room sees it.

---

## 1. Before Anything: Missy Sets Her Permissions

Missy installs the script, reloads Bondage Club, and sees this startup notice in her local chat log:

[Erotic Chat Hypnosis Suite (ECHS) — nothing is switched on yet. Open settings to configure.]
[Your reactions are visible to the room by default; Trance Defaults turns that off.]

She clicks the **spiral icon on her player profile card** (or navigates to **Preferences → Extensions → ECHS Hypnosis**) to run the wizard. She picks the **Balanced** preset, which enables *Hypnosis Enabled* along with basic session restrictions. She then navigates to the **Triggers** tab and manually ticks **Allow triggers to be planted in you**, as she wants to test trigger mechanics.

Elena does not need any permissions switched on to act as a hypnotist—her own settings govern only what can be done to *her* avatar.

---

## 2. Attempt One — A Normal First Failure

Because they have only spoken casually a few times, Missy's stored trust in Elena is low.

Elena opens Missy's player profile card, clicks the **spiral icon**, and selects **Attempt Hypnosis**.

**Missy's screen displays a prompt:**

Elena is trying to hypnotize you.
        [ Agree ]   [ Ignore ]   [ Fight ]

Missy has 60 seconds to respond. She selects **Ignore**—she is curious to see what happens, but not actively assisting. *(She could also type `/echs ignore` or `/hypno ignore` into chat, which is especially handy if her wardrobe screen is open).*

**Elena never learns which button Missy clicked.** Elena's client opens a 60-second induction window. What she types during this window matters—each spoken line contributes to the induction roll up to a cap. Elena uses the time to roleplay:

> **Elena:** Missy, look at the way the light moves when I turn my hand.  
> **Elena:** There is no hurry at all. Nothing you have to do.  
> **Elena:** Just the sound of me talking, and how heavy that makes everything feel.  

The 60-second timer expires, and Missy's client calculates the roll. Because trust is still low and Missy did not actively help, the attempt misses.

**Missy sees:**

[The attempt doesn't quite land.]

**Elena receives a broad status read:**  
One of *barely responsive*, *slightly relaxed*, *more relaxed*, or *almost under*—never raw numbers. This time Elena sees: **slightly relaxed**.

Elena has **two attempts by default** before triggering a 10-minute cooldown (Missy can raise this limit to 3 in her settings). Elena has one attempt remaining.

*This is the intended baseline experience.* A stranger cannot simply drop a character into trance immediately. To check the real calculated odds at any time, Elena can type `/echs chance Missy` (or `/hypno chance Missy`).

---

## 3. Attempt Two — The Induction Lands

They chat for a while longer, naturally increasing their interaction count and trust. Elena initiates a second attempt.

This time, Missy clicks **Agree**, adding a significant bonus to the calculation.

**Missy sees:**

[You slip under. (entranced)]

The depth tier reported in brackets reflects how comfortably the roll succeeded (*drifting, yielding, entranced, deep,* or *blank*). A narrow pass produces a shallow trance; a decisive roll plunges the subject deeper.

Missy's configured **trance defaults** engage immediately. By default, these apply *cannot move*, *cannot speak*, and the **screen fade** (a soft white veil over her game view). All three defaults are adjustable on her Trance Defaults tab.

**The room sees** *(one of several)*:

> *Missy's eyes lose their focus, and she goes quiet.*

---

## 4. Delivering a Spoken Suggestion

Elena speaks normally in room chat. No slash commands are required.

> **Elena:** Missy, you cannot move.

**Missy sees** *(one of several)*:

[Your body simply stops listening to you.]
[You tell your legs to move. Nothing happens.]
[Somewhere far off you decide to move, and the message never arrives.]

**The room sees** *(one of several)*:

> *Missy goes very still, mid-motion.*  
> *Missy stops moving, as though the idea had gone.*  

**Why the command landed successfully:**
1. Missy granted *Movement Restriction* in permissions.
2. An active trance session exists specifically with Elena.
3. Elena addressed Missy by name.
4. *Cannot move* requires the default **Yielding** depth tier, which Missy's current **Entranced** state easily clears.

If any of these conditions had failed, the command would be ignored—and **Elena receives private feedback identifying which check blocked the suggestion**, preventing guesswork.

---

## 5. Planting a Trigger

Elena wants to plant a post-hypnotic suggestion that outlives the trance. Planting a trigger requires **Deep** trance on **earned trust** (built over time); temporary arousal spikes cannot unlock it by default.

Elena initiates trigger recording:

> **Elena:** Missy, your trigger word is sleepy time.

**Missy sees:**

[Something is being set aside in you. You let it happen.]

Missy is **never shown the clear-text phrase**. Hiding the phrase keeps the player from consciously anticipating or playing around the trigger.

**Elena sees:**

[trigger] RECORDING "sleepy time". Say each suggestion, then "remember trigger" to save (or "forget the trigger" to cancel).

Elena now speaks the intended actions. **These actions are recorded to the buffer, not executed immediately**—preventing Missy from freezing or losing speech mid-setup:

> **Elena:** Missy, you cannot move.  
> **Elena:** Missy, you cannot speak.  

**Missy sees, after each line:**

[That settles into place, waiting.]

**Elena sees:**

[trigger] Recorded movement-block into "sleepy time" (1 so far).
[trigger] Recorded speech-block into "sleepy time" (2 so far).

Elena commits and stores the trigger:

> **Elena:** Missy, remember trigger.

**Missy sees:**

[It settles somewhere you won't think to look for it.]

**Elena sees:**

[trigger] SAVED "sleepy time" — 2 action(s): movement-block, speech-block.
Planted at Deep depth. Saying it will now fire them, in or out of trance.

Trigger phrases must be at least 5 characters long and cannot overlap with existing triggers stored on Missy. See [Triggers and Lasting Effects](Triggers-and-Lasting-Effects).

---

## 6. Waking the Subject

Elena concludes the active session:

> **Elena:** Missy, wake up.

**Missy sees:**

[You come out of trance. (they woke you)]

Every restriction applied by the active session releases simultaneously—Missy regains movement, speech, and standard screen visibility. Trance defaults *never* persist past waking.

The planted trigger remains dormant in Missy's client. It does not fire upon waking; it simply rests in memory.

*(Elena could also click the **Wake Up** button on her remote panel. A planned future feature will allow subjects to attempt waking themselves from shallow trances via `/echs wake`; for now, waking is handled by the hypnotist, session timeouts, or the safeword).*

---

## 7. Later: Firing the Trigger

An hour later, in a completely different room, without any active hypnosis session running:

Elena chats casually in the room:

> **Elena:** That was a long day. I could do with a sleepy time nap.

**The trigger fires instantly.** No name prefix or active trance is needed—that is the nature of a conditioned trigger.

Missy's character freezes and loses speech. She sees the familiar private feedback lines, and the room observes the standard emotes. 

The trigger fires for Elena because she was the one who installed it. Whether another player speaking those words could trigger it is determined by Missy's **Trigger Scope** setting (defaulting to *Hypnotist only*). Queued trigger actions execute **one at a time** with a short delay between them.

The trigger remains active for the duration configured on Missy's Triggers tab, or until Elena releases it by name:

> **Elena:** Missy, you are released from sleepy time.

---

## Emergency Exit at Any Point

/echs safeword

*(or `/hypno safeword`)*

Clears active trances, purges active triggers, and removes every lingering restriction immediately, from any state. Because Bondage Club parses client slash commands before speech-restriction hooks can evaluate them, the safeword works 100% of the time—even while silenced.

---

## Further Reading

* **[What to Say](What-to-Say)** — Comprehensive dictionary of recognized spoken commands.
* **[Your First Session](Your-First-Session)** — Diagnostic setup and troubleshooting when lines fail to land.
* **[Depth and Trust](Depth-and-Trust)** — Detailed mechanics on induction rolls, relationship baselines, and depth gates.
* **[Triggers and Lasting Effects](Triggers-and-Lasting-Effects)** — Deep dive into trigger scopes, duration timers, and decay curves.
