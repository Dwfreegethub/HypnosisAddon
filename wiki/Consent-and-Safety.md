# Consent and Safety

> 🛡️ **EMERGENCY EXIT — ANY TIME, ANY STATE**  
> If you need to stop or end the scene immediately: **Type `/echs safeword`**.  
> Works 100% of the time, even while completely silenced. It instantly breaks active trances, purges all active suggestions, discards waking compulsions, and restores full character control.

This add-on alters your game client and character behavior. This page breaks down how permissions work, how your client protects you under the hood, and every available exit from a scene.

---

## Quick Jump

* **[Safety vs. CNC Headspace](#a-quick-word-on-safety-vs-cnc-play)**
* **[The Core Architectural Rules](#1-your-client-decides-everything)**
* **[High-Impact Features (Earned Only)](#4-the-high-impact-stuff)**
* **[Arousal Limits & Toy Mode](#5-what-arousal-can-and-cant-do)**
* **[Every Way Out (Emergency Exits)](#6-every-way-out)**
* **[Perception vs. Room Emotes](#7-what-you-and-the-room-see)**

---

## A Quick Word on Safety vs. CNC Play

This mod places a heavy emphasis on client-side safety, granular permissions, and verification gates. For many players, that peace of mind is essential. 

If your preference is heavy consensual non-consent (CNC), surrender, or feeling truly helpless, guardrails and permission popups can sometimes interrupt the headspace. The safety floor is built to guarantee that *you*—the person behind the keyboard—always hold the master key while letting you opt into strict timed immersion (like the Extreme lock) when desired.

---

## 1. Your Client Decides Everything

Another player’s add-on can only ever **ask**.

When a hypnotist says *"Missy, you cannot move"*, their computer does not reach into yours to freeze your avatar. Instead:
1. Your client reads the line from chat.
2. Your local script checks the words against your saved settings and trance depth.
3. Your client decides whether to execute the action or ignore it.

A modified hypnotist client has nothing to override: it cannot view your permissions, cannot see your exact numbers, and is never told whether you picked Agree, Ignore, or Fight during induction. It receives only a broad, descriptive read on the scene.

---

## 2. Nothing Is On Until You Turn It On

On a fresh install, every permission starts switched **off**, including the master **Hypnosis Enabled** toggle. The script will not touch your character until you explicitly enable permissions.

Permissions are configured per feature:
* **Movement restriction:** Freezing in place and pose.
* **Speech restriction:** Verbal muting in room chat.
* **Posture control:** Kneeling, standing, leg/arm poses.
* **Wardrobe restrictions:** Locking the wardrobe screen.
* **Arousal control:** Arousal shifts, orgasm denial, forced climaxes.
* **Undressing:** Removing clothes on command.
* **Commanded activities:** Touching yourself on command (**Made to Act**).
* **Touching others:** Touching others on command (**Made to Touch Others**).
* **Sensory modulation:** Narrowed hearing and BC blindness.
* **Awareness suppression:** Suppressing chat log notices for clothes, bondage, and touch.
* **False reflections:** The clothing illusion.
* **Triggers & Lasting Effects:** Planting triggers, instant drops, and speech triggers.

### Adjusting Permissions & Mid-Trance Locks
Outside of trance, unticking a permission immediately drops that active effect and disarms that part of any planted trigger you hold.

> ℹ️️ **Trance Settings Lock:** If you enable **Lock settings while a session is on you**, the settings menu becomes read-only during an active session (displaying a yellow *Read-only* banner). Importing backups is locked. **Your safeword is never affected by setting locks**.

---

## 3. Two Gates: Permission AND Depth

Every hypnotic suggestion must clear two separate hurdles:
1. **Permission:** *Did you explicitly allow this category in settings?*
2. **Depth:** *Are you deep enough for it to work?*

Both must pass at the exact moment a line is spoken. Ticking a permission only gives your partner permission to try—they still have to guide you to the required depth threshold.

---

## 4. The High-Impact Stuff

These features alter perception, outlive the session, or simulate involuntary action:
* **Clothing Illusion:** Your screen continues rendering your original outfit while the room sees what you are actually wearing.
* **Planted Triggers:** Phrases that remain armed in your client to fire later. You never see your own trigger words unless enabled.
* **Compulsions:** Triggers with no word, waiting for a time after waking or for a person to arrive/speak. They never go off while you are in a trance.
* **Carry-Forward Suggestions:** Effects set to stay active after waking.

These features default to requiring **Deep (60)** trance earned through genuine **Earned Depth** (built over time through trust and interaction).

**Awareness Suppression** (hiding clothing, bondage, or touch notices from your chat log) is the opposite case: it is the shallowest effect, available from **Drifting (0)**, because the actions still happen in the room; only your client's notice of them is hidden.

---

## 5. What Arousal Can (and Can't) Do

Being worked up lowers resistance: it helps an induction land and takes you somewhat deeper in the moment.
* Arousal counts toward current depth, **never toward earned depth**.
* Arousal **never** unlocks Deep-tier features, triggers, clothing illusions, or carry-forward effects by default.

### Answering Ahead of Time & Toy Mode
* **Automatic Answer:** Configure on the **Inductions tab** to answer *Agree*, *Ignore*, or *Fight* without a dialog box.
* **Toy Mode:** Configured on the **Inductions tab**. Puts you straight under to your *"sink deeper"* limit with no roll for selected partners. This counts as earned depth.
* **Away Mode:** After 10 minutes with no key, click or touch, inductions are turned away by default and the hypnotist is told you are away. You are told who tried when you come back.

---

## 6. Every Way Out

These exits cannot be disabled, locked, or overridden by any hypnotic command, trigger, or active session:

| Exit Method | Command / Action | How It Works |
|---|---|---|
| **Emergency Safeword** | **`/echs safeword`** | Universal hard stop. Bypasses all mutes and freezes. Purges trance, active triggers, and waking compulsions. |
| **Self-Waking** | **`/echs wake`** | Pulls yourself out of a *shallow* trance. Refuses if deep. |
| **Hypnotist Wake** | Spoken (*"wake up"*, *"you are awake"*, *"come back to me"*) or the **Wake Up** button | Hypnotist commands wake immediately without gates. |
| **Targeted Release** | *"Missy, you are released from [trigger]"* | Hypnotist clears a specific trigger's hold. |
| **Master Toggle** | Untick **Hypnosis Enabled** | Completely disables the add-on from preferences (except during Extreme lock). |
| **Early Extreme Exit** | **`/echs reset confirm`** | Breaks the Extreme progressive lock early; wipes all ECHS data back to factory defaults. |
| **Session Timers** | 30-Minute Timeout | Trances end automatically after 30 minutes. |
| **Abandonment Timer** | 5-Minute Room Timer | Trance ends if the hypnotist leaves the room for over 5 minutes. |
| **Trigger Timers** | Automatic | A fired trigger's effects wear off on their own countdown. |
| **Induction Window** | 60 seconds | An unanswered induction prompt closes on its own. |

> ⚠️ **Purge / Clear Refusal:** `/echs forgettrigger` and **Purge** on the Planted tab **refuse to delete a trigger while that specific trigger is actively holding you**. **Clear All** (and `/echs forgettrigger all`) will not run while any trigger is holding you or a session is running, and asks you to confirm before removing anything. Use `/echs safeword` instead for an immediate clean break.

### The one lock you can choose: Extreme
Choosing the **Extreme** setup template, and confirming its warning, makes your settings read-only for 7 days, then 30 days at a time if you choose to renew. It is never permanent, and it is the only thing that can stop you unticking Hypnosis Enabled or removing a planted trigger. While it is on, `/echs safeword` still works exactly as above, `/echs reset confirm` ends the lock early (erasing all your trust, triggers and stats along with your settings), and you can always switch ECHS off in your userscript manager. See [Settings Reference](Settings-Reference#the-extreme-lock).

---

## 7. What You and the Room See

* **Private Lines `[In Brackets]`:** Visible only to you.
* **Public Emotes:** Noticeable physical reactions (freezing, failing to speak) emit as standard room emotes.
* **Perception Effects:** Purely mental effects (failing to notice an item or seeing a clothing illusion) never emit room emotes.
* **Hiding Emotes:** Disable **Trance Defaults → Others See Your Reactions** to keep all reactions private.

---

## 8. Out of Character (OOC) Protection

Text enclosed in parentheses `(like this)` or `((like this))` is discarded by the parser before any suggestion or trigger check occurs. Typing `(brb)` will never trigger an effect or advance trust.
