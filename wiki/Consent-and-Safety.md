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
* **Posture control:** Kneeling, standing, leg/arm poses, and the face (eyes, mouth, tongue, blush).
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
On the **Inductions** tab you can answer every induction ahead of time, decide what happens while you are away from the keyboard, and let chosen people put you under with no roll (**toy mode**, which counts as earned depth). All of it is explained on [How an Induction Works](How-Inductions-Work#7-answering-ahead-of-time-being-away-and-toy-mode).

---

## 6. Every Way Out

These exits cannot be disabled, locked, or overridden by any hypnotic command, trigger, or active session:

| Exit Method | Command / Action | How It Works |
|---|---|---|
| **Emergency Safeword** | **`/echs safeword`** | Universal hard stop. Bypasses all mutes and freezes. Purges trance, active triggers, and waking compulsions. |
| **Self-Waking** | **`/echs wake`** | Pulls yourself out of a *shallow* trance. Refuses if deep. |
| **Hypnotist Wake** | Spoken (*"wake up"*, *"you are awake"*, *"come back to me"*) or the **Wake Up** button | Hypnotist commands wake immediately without gates. A trigger that was holding you before the trance keeps holding until its time is up; the safeword clears it. |
| **Targeted Release** | *"Missy, you are released from [trigger]"* · *"…from the compulsion"* | Hypnotist clears a specific trigger's hold, or the hold of their compulsions. |
| **Hypnotist Removal** | *"Missy, forget the trigger [trigger]"*, *"Missy, forget your compulsions"* or *"Missy, forget every trigger I gave you"* | The hypnotist who planted it deletes it for good. Only theirs; works outside trance. Refused during Extreme lock. |
| **Master Toggle** | Untick **Hypnosis Enabled** | Completely disables the add-on from preferences (except during Extreme lock). |
| **Early Extreme Exit** | **`/echs reset confirm`** | Breaks the Extreme progressive lock early; wipes all ECHS data back to factory defaults. |
| **Session Timers** | 30-Minute Timeout | After 30 minutes (60 under an Extreme lock) you are asked whether to stay under for as long again. Only a yes from you extends it; no answer within a minute ends the trance. |
| **Abandonment Timer** | 5-Minute Room Timer | Trance ends if the hypnotist leaves the room for over 5 minutes. |
| **Trigger Timers** | Automatic | A fired trigger's effects wear off on their own countdown. |
| **Induction Window** | 60 seconds | An unanswered induction prompt closes on its own. |

> ⚠️ **Purge / Clear Refusal:** `/echs forgettrigger` and **Purge** on the Planted tab **refuse to delete a trigger while that specific trigger is actively holding you**. **Clear All** (and `/echs forgettrigger all`) will not run while any trigger is holding you or a session is running, and asks you to confirm before removing anything. Use `/echs safeword` instead for an immediate clean break.

### The one lock you can choose: Extreme
Choosing the **Extreme** setup template, and confirming its warning, makes your settings read-only for 7 days, then 30 days at a time if you choose to renew. It is never permanent, and it is the only thing that can stop you unticking Hypnosis Enabled or removing a planted trigger. While it is on, new triggers can still be planted, but neither you nor the person who planted one can remove it. `/echs safeword` still works exactly as above, `/echs reset confirm` ends the lock early (erasing all your trust, triggers and stats along with your settings), and you can always switch ECHS off in your userscript manager. See [Settings Reference](Settings-Reference#the-extreme-lock). Your [keyholders](#keyholders-someone-who-can-change-your-settings-for-you), if you have chosen any, can still change your settings and can end the lock.

### Keyholders: someone who can change your settings for you

Since v1.14.0 you can give someone your **keys**: they can then change your ECHS settings from their side, while you're both in the same room.

* **Who:** anyone you name with `/echs keyholder add <name> <level>`, and your **BC owner** if you allow it with `/echs keyholder owner <level>`. Nobody holds your keys until you choose. The popup's **Keys** tab does the same with **Give keys** buttons.
* **Being asked:** someone can ask for your keys (`/echs keyholder request`, or **Request keys** on their Keys tab). You get a popup saying who and at what level, with **Give … keys** and **Decline**. **No answer in 30 seconds is a no**, and nothing changes unless you click to give. The same person can ask again only after 3 minutes. While your Extreme lock (or a session lock) is on you can't give keys, so the request is turned down and you're told it came.
* **How far, per keyholder** (since v1.16.0; before it, *take* and *grant*):
  * **minimal**: they can only switch things **off**, and set a choice to its off option. Nothing new can be opened, and nothing on your **General** tab (since v1.16.37).
  * **moderate**: as minimal, and they can also **shape your trance**: switch your **Trance Defaults** and **Awareness** boxes on and off, and pick any screen effect, eyes, eye colour, pulse colour, induction time, attempts and how deep "sink deeper" goes. They still can't switch **Permissions** or **Triggers** on, or turn on toy mode, auto-answer or who toy mode is for.
  * **full**: everything they can reach, on and off, including (since v1.16.37) your **General** tab: release on disconnect, the pulse, and the spiral that shows others you run ECHS. Since v1.16.2 that also includes your **Triggers** tab's choices (who else can fire your triggers, how long a new trigger lasts, minutes a fired trigger lasts, how fast triggers fade, drop triggers), **how fast trust fades** (on Stats), and your whole **Depth** tab: how deep each thing needs you, whether arousal may reach clothing illusions and planting triggers, what chemicals count, how much a hypnotist's skill counts (never *skill can beat my resistance*), and **reset to defaults**. Minimal and moderate keys can't change any of these.
  * **full** keys also **see what is planted in you**: who planted each trigger, what it does and how strong it is. The trigger word only if they planted it, or if you've ticked *Show trigger words* yourself. They can **remove** one only if **you trust them more than whoever planted it**. Never one you planted in yourself, never one holding you right now, and **never while your Extreme lock is on**. Their own triggers they can always take back.
  * Keyholders from before v1.16.0 became **minimal** (was *take*) or **moderate** (was *grant*). Give **full** again if you want it.
* **What they can reach:** the tick boxes on the **Permissions, Trance Defaults, Awareness and Triggers** tabs (and **General**, with full keys only), and (since v1.14.1) everything on your **Inductions** tab and the Trance Defaults choices: your **screen effect** (none, grey fade or the spiral), your **eyes** and **eye colour** while under, and the **pulse colour**. With **minimal** keys they can only switch those off: None, Unchanged, Ask me, Refuse, toy mode Off or Never deeper. Nothing else. With **full** keys, also the Triggers and Depth choices above. Never your safeword, `/echs reset`, export or import, or who holds your keys.
* **The keyholder lock** (since v1.16.2). Someone with your **full** keys can ask to lock your settings. You get a popup, and **nothing locks unless you click *Lock my settings*** (no answer in 30 seconds is a no). While it holds:
  * You can't change your own ECHS settings; your keyholders still can. A banner on the settings screen says who locked them.
  * **Any** of your full keyholders can unlock them, not only the one who locked them.
  * You can't take back the keys of the one who locked them, or lower them below full. You can still give keys to others and take theirs back.
  * It **ends on its own** if the one who locked it hasn't been in a room with you for **7 days**.
  * `/echs safeword` always works, you can still untick **Hypnosis Enabled** to switch ECHS off, and `/echs reset confirm` still wipes everything, the lock included.
* **The keys lock** (since v1.16.3). Locks **who holds your keys**: while it holds you can't give anyone your keys or take anyone's back, and nobody can ask you for them. Your keyholders keep what they have.
  * Your **BC owner**, if they hold your **full** keys, can set it **without asking you**. Anyone else with your full keys has to ask, and you get a popup like the keyholder lock's.
  * Any of your full keyholders can lift it. It ends on its own if whoever set it hasn't been in a room with you for **7 days**. `/echs safeword` and `/echs reset confirm` always work.
* **Taking back other keyholders' keys** (since v1.16.3; anyone with full keys since v1.16.4). Anyone with your **full** keys sees who else holds your keys and can ask to **take someone's keys back**: you get a popup, and nothing changes unless you accept. Your **BC owner**, if they hold your full keys, doesn't need to ask. You're told each time. Exceptions: whoever locked your settings keeps their keys until that lock is lifted, and while your keys lock holds only your owner can do this.
* **Extreme from a keyholder** (since v1.16.3). Someone with your **full** keys can ask to put you under Extreme, or to extend it by 30 days. You get a popup with the whole Extreme warning, and **nothing happens unless you accept**. It is the same lock as choosing Extreme in setup: 7 days first, then 30 days at a time.
* **Even under Extreme.** Your keyholders can still change your settings while your Extreme lock is on, and **they can end the lock for you**. That is the point of it. Under the lock, your own list of keyholders is read-only, like your other settings.
* **You always know.** Every change tells you who did what (*"Kay (your keyholder) turned off Sight"*), and `/echs keyholder` lists your keyholders and the last changes.
* **Your client still decides.** A keyholder sends a request; your ECHS checks they are your keyholder and that the change is allowed before making it. Remove someone at any time with `/echs keyholder remove <name>` (unless your Extreme lock is on).

---

## 7. What You and the Room See

* **Private Lines `[In Brackets]`:** Visible only to you.
* **Public Emotes:** Noticeable physical reactions (freezing, failing to speak) emit as standard room emotes.
* **Perception Effects:** Purely mental effects (failing to notice an item or seeing a clothing illusion) never emit room emotes.
* **Hiding Emotes:** Disable **Trance Defaults → Others See Your Reactions** to keep all reactions private.
* **The popup:** other ECHS players' **[popup](The-ECHS-Popup)** lists who in the room runs ECHS; untick **General → Show others that I run ECHS** to stay off it. While you are under, your ECHS tells **only the person who has you under** which kinds of suggestion you allow and whether you are deep enough for each (never your depth itself), so their list can fade what won't land. Your ECHS still checks every line by your own settings.

---

## 8. Out of Character (OOC) Protection

Text enclosed in parentheses `(like this)` or `((like this))` is discarded by the parser before any suggestion or trigger check occurs. Typing `(brb)` will never trigger an effect or advance trust.
