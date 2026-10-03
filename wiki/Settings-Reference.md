# Settings Reference

> **Alpha Notice**  
> ECHS is in active alpha development. Settings layouts, storage keys, and UI options are actively being polished.

---

Open settings via the **spiral icon on your player profile card**, or navigate to **Preferences → Extensions → ECHS Hypnosis**. Setting categories run down the left edge.

Everything in these menus represents a **permission** (*"Do I allow this to be done to me?"*) or a **depth threshold** (*"How deep must I be?"*). Ticking a toggle simply defines your boundaries — it never forces an effect on you on its own.

*Note on Mid-Trance Editing:* By default, settings can be configured to lock during an active session (including during the induction window) to preserve immersion. If you ever need out, use your emergency safeword: `/echs safeword`.

---

## 1. Permissions Tab

What others may do to you. Everything here is off until you turn it on.

**At the top, always in view:**

| Setting | What It Allows |
|---|---|
| **Hypnosis Enabled** | The master toggle and absolute floor. Disabling this shuts down the add-on, immediately breaks active trances, and purges all effects (identical to the safeword). Re-enabling it later restores your toggles without reapplying old effects. |
| **Lock settings while a session is on you** | Toggles whether this settings menu is locked during an active session. Locked, the screen still opens so you can read every setting, with a yellow *Read-only* banner across the top; nothing on it can be changed until the session ends. |

**Below them, in groups (scroll for the rest):**

*Body*

| Setting | What It Allows |
|---|---|
| **Movement Restriction** | Allows freezing suggestions (*"you cannot move"*, *"you will be frozen"*). Held still: you stay in the pose and the place you are in. You cannot change your own pose (arms included), cannot leave the room, and cannot walk on a map. The hypnotist's spoken pose commands still move you; nobody else can change your pose. Items can still be put on you. |
| **Posture Control** | Allows pose suggestions: kneeling, standing, spreading or closing the legs, all fours, lying down, and arm poses such as hands behind the back or raised. |
| **Follow / Leash** | Allows following suggestions (*"follow me"* / *"stay close"*). Compels you to stay at the hypnotist's side across room transitions using Bondage Club's native leash system. Requires your native BC leashing permissions to be enabled. |
| **Clothing Restriction** | Locks out the wardrobe screen while in trance. |
| **Undressing** | Allows spoken undress commands (*"take something off"* / *"strip"*). |

*Voice & senses*

| Setting | What It Allows |
|---|---|
| **Speech Restriction** | Allows verbal muting (*"you cannot speak"*). Affects standard room chat only; slash commands always bypass speech locks. |
| **Made to Speak (a trigger says words for you)** | Allows a planted trigger to make you say words aloud in the room (*"you will say 'I obey'"*). A gag still garbles them. Off by default; of the setup templates only Extreme turns it on, as does the strongest trigger answer in the setup questions. See [Triggers and Lasting Effects](Triggers-and-Lasting-Effects#words-to-say). |
| **Hearing (hear only one voice, or only your name)** | Allows *"you hear only my voice"* (you hear only that person) and *"you only hear what is said to you"* (only lines with your name). Everything else said in the room is hidden from you; emotes, activities and out-of-character text in (parentheses) still get through, and what you cannot hear cannot command you. Off by default; of the setup templates only Extreme turns it on, as does the strongest senses answer in the setup questions. See [What to Say](What-to-Say#hearing--hearing--entranced). |
| **Sight (dimmed, very dark, or blind)** | Allows *"your vision is dimming"*, *"you can barely see"* and *"you cannot see"*. This is Bondage Club's own blindness, so your own BC settings cap it: with *Sensory Deprivation* on Light it never goes past very dark. Nobody else sees a change. Off by default; of the setup templates only Extreme turns it on, as does the strongest senses answer in the setup questions. See [Sensory Modulation](Sensory-Modulation#sight). |

*Touch & arousal*

| Setting | What It Allows |
|---|---|
| **Self-Touch Control** | Allows you to be blocked from touching yourself (*"you cannot touch yourself"*). |
| **Made to Act (Touch Yourself on Command)** | Allows the hypnotist to command physical self-actions (*"touch your breasts"*). See [Commanded Activities](Commanded-Activities). |
| **Made to Touch Others** | Indented under Made to Act, and greyed until Made to Act is ticked. Allows the hypnotist to aim those commands at someone else in the room (*"kiss Rei"*). Not needed for the hypnotist themselves (*"kiss me"*). Off by default. See [Commanded Activities](Commanded-Activities#touching-someone-else). |
| **Arousal & Orgasm** | Allows arousal manipulation, orgasm denial, forced climaxes, and sexual numbness. |

*Mind*

| Setting | What It Allows |
|---|---|
| **Clothing Illusion (you see old clothes)** | Allows false reflections (your screen renders clothes you have been stripped of). Changes what you **see**, not what your chat log says; that is the Awareness tab. |

*(Note: How inductions reach you — attempts, answering ahead of time, toy mode and "sink deeper" — is on the **Inductions** tab. Planted triggers and carry-forward suggestions are managed on the **Triggers** tab, and the triggers already planted in you on the **Planted** tab.)*

---

## 2. Inductions Tab

How someone gets you under: how many tries they get, whether you are asked, and how deep they can take you.

* **Attempts before they must wait:** 2 or 3 attempts before a 10-minute cooldown (default: 2).
* **When someone tries to hypnotize me:** *Ask me · Agree · Ignore · Fight* (default: *Ask me*). Anything but *Ask me* answers every induction for you with no box; the hypnotist is never told which.
* **When I'm away:** *Refuse · Ignore · Keep my answer* (default: *Refuse*). Away means 10 minutes with no key, click or touch. Applies to the answer above and to toy mode, never to *Ask me*.
* **Toy mode:** *Off · On* (default: *Off*). No roll: an induction puts you straight under to your *"sink deeper"* limit, full and earned depth alike, with no attempt limit or cooldown. Triggers included, if that limit is Deep or deeper.
* **Toy mode is for:** a dropdown with the same choices as trigger scope on the Triggers tab, less "Hypnotist only": *Owner only · Owner and Lovers · Owner, Lovers and whitelist · Owner, Lovers, whitelist & Dominants · Everyone, except blacklist · Everyone, no exceptions* (default: *Owner and Lovers*). Read from your BC relationships, whitelist, blacklist and Dominant reputation, exactly as for triggers.
* **"Sink deeper" stops at:** How deep a hypnotist can talk you mid-trance, a few points per success (*Never deeper · Yielding · Entranced · Deep · Blank*). Default **Entranced**; of the setup templates only Extreme sets Blank (Light sets Yielding). An ordinary induction lands where your trust puts it; toy mode puts you straight here. See [What to Say](What-to-Say#going-deeper-mid-trance).

---

## 3. Trance Defaults Tab

Defines baseline states that engage automatically when an induction succeeds, before verbal suggestions are spoken.

| Setting | Default | Effect |
|---|---|---|
| **Cannot Move** | On | The trance itself holds you still upon going under, the same as *"you cannot move"*: your pose and place are held until you wake or walk. |
| **Cannot Speak** | On | The trance silences standard room speech automatically. |
| **Silence OOC too (text in parentheses)** | Off | By default, OOC text in parentheses, `(like this)` or `((like this))`, passes through muted speech. Enabling this suppresses OOC chat while silenced. |
| **Screen Fade** | On | Displays a soft trance veil overlay across your screen while under. Automatically thins during active walking trances, and steps aside while your sight is dimmed or gone. |
| **Clothes Look Unchanged** | Off | Automatically engages the clothing illusion upon entering trance. |
| **Others See Your Reactions** | On | Broadcasts room-visible emotes (such as going still or failing to speak). Turning this off silences automated emotes. |
| **Release everything if you disconnect** | Off | When enabled, drops all active effects immediately if you log out or disconnect, rather than restoring remaining timers on reconnect. |

---

## 4. Awareness Tab

Controls perceptual filtering — what your character can be hypnotically made not to notice. These hide **chat messages** only. Your own screen still shows your real body; making it show your old clothes is the separate **Clothing Illusion** permission.

* **Clothing Changes:** Suppresses chat notices when items of clothing are removed or replaced.
* **Bondage Changes:** Suppresses chat notices when anything in an item slot is applied, adjusted, locked, or removed: restraints, and also gags, collars, blindfolds, toys and locks.
* **Touches / Activities:** Suppresses chat feedback from physical interactions.
* **Trigger Setup (Hide Planted Phrases):** Hides the whole setup dialogue while a trigger is being installed. Even with this off, the trigger word itself shows as "..." unless you have ticked **Show trigger words**.

---

## 5. Triggers Tab

Manages long-term suggestions and conditioned words:

* **Allow triggers to be planted in you:** Master permission for storing trigger words in your client.
* **Suggestions that outlive the trance** (carry-forward): Allows post-hypnotic suggestions to remain active after waking.
* **You can fire your own triggers:** Permits you to set off your own planted words by saying them (off by default).
* **Show trigger words when you list them:** Shows your trigger words in the trigger list and in chat. Off by default: your words appear as "..." in chat and are left out of the list, for blind trigger play.
* **Triggers fire only on whole words:** A trigger no longer fires inside a longer word (*"sleepy"* stops firing on *"sleepyhead"*). Off by default.
* **Minutes a fired trigger lasts (0 = until released):** How long a fired trigger's effects hold before letting go by themselves (default: 5). 0 means they stay until released by name or by the safeword.
* **Triggers fade without reinforcement:** How quickly planted triggers fade when not kept up (*Never · Very slowly · Slowly · Typical · Fast · Very fast*; default: *Never*). The line under it says roughly how long that means.
* **Who else can fire triggers planted in you:** A dropdown, from *Hypnotist only* through *Hypnotist, Owner and Lovers*, adding your whitelist, then Dominants, to *Hypnotist and everyone, except blacklist* and *Hypnotist and everyone, no exceptions* (default: *Hypnotist only*). A hypnotist can ask for less for one trigger, never more.
* **Longest a New Trigger Lasts:** Gives every trigger planted from now on a time limit (*No limit · 15 minutes · 30 minutes · 1 hour · 2 hours · 6 hours · 1 day*; default: *No limit*). Triggers you already have are not shortened.
* **Drop Triggers:** Whether a trigger can drop you straight into trance (*Off · One time · Unlimited*; default: *Off*). Scroll down the tab to reach it. See [An Instant Drop](Triggers-and-Lasting-Effects#an-instant-drop).

---

## 6. Planted Tab

Lists the triggers planted in you, six to a page: who planted each one and how strong it still is.

* **Details:** Shows what that trigger does, its options, and, for a compulsion, what it is waiting for.
* **Purge:** Removes that trigger. Refused while the trigger is holding you (the button reads *Holding*).
* **Clear All:** Removes every trigger, including any you cannot see. Refused while a trigger is holding you or a session is running, with the reason shown beside it; otherwise it asks you to click twice.

Purge and Clear All are not affected by the session lock: removing something planted in you stays available during a scene. The one exception is the **Extreme lock** you can choose in setup, which blocks both until it ends (see [The Extreme lock](#the-extreme-lock)).

---

## 7. Depth Tab

* **Per-Feature Depth:** Each feature needs a depth from **0 to 99**. Type the number into its box (it saves when you click away or press Enter), or use **-5** and **+5**. The tier that number falls in is shown beside it, for example *45 [Entranced]*. A feature is reachable once you are at least that deep. These are personal comfort settings, not rigid game limits.
* **earned only / arousal ok** (on the three earned-only rows: Clothing illusion, Planting triggers, Suggestions that outlive the trance): click to let arousal reach the illusion or triggers instead of trust alone. Anything seeded that way fades fast. Carry-forward stays *earned only* (greyed).
* **Chemicals count:** What may push you deeper besides trust (*Arousal + drugs · Arousal only · Drugs only · Neither*; default: *Arousal only*). Drugs are not built yet, so today *Drugs only* and *Neither* both mean arousal does not count. It never reaches the three earned-only rows unless you open them above.
* **A hypnotist's skill:** How much of a hypnotist's own practice may help them put you under (*Ignore it · Only from people I trust · Honour, capped · Full from people I trust, capped otherwise*; default: *Full from people I trust, capped otherwise*). Their skill is shown to you as a feeling, never a number, and never reaches the three earned-only rows.
* **"Sink deeper" stops at:** moved to the **Inductions** tab in v0.100.0.
* **Reset to defaults:** Puts every feature back to its standard depth.

---

## 8. Stats & Advanced Tab

Accessible via the **Advanced** toggle below the tabs:

* **Trust & Experience Records:** Read-only breakdown of per-person interaction counts and your personal subject experience pool. Each person is listed by the name they go by (their nickname if they have one) with their member number after it, e.g. *Rei (#123456)*.
* **Trust fades when you don't see someone:** How fast trust fades without contact (*Never · Very slowly · Slowly · Typical · Fast · Very fast*; default: *Never*).
* **Export · Import · Reset:** Back up your settings to the clipboard, restore them, or wipe everything (asks first). See [Data & Backup](#10-data--backup).

---

## 9. Setup Wizard

On fresh installs or after running a reset, opening the settings menu launches the guided **Setup Wizard**. You can re-run it at any time from within the settings interface.

Every page of the wizard has a **Cancel** button that closes it without changing anything. **Skip** on the first page does the same. It cannot be opened while your settings are locked.

**The four templates** apply with one click (Extreme asks first). Anything a template does not turn on is turned off. Your own preferences — showing trigger words, firing your own, whole-word matching, release on disconnect, silencing OOC, the room seeing your reactions — are left alone.

| Template | What it turns on | Asked first? | "Sink deeper" stops at | Triggers |
|---|---|---|---|---|
| **Hypnotist Only** | Nothing — hypnosis is off, so nobody can hypnotize you | (auto-answer set to Fight, in case you turn hypnosis back on) | — | Off |
| **Light / Safe** | Movement, Posture. A trance never silences you (Cannot Speak off) | Yes | Yielding | Off |
| **Balanced** | Movement, Posture, Speech, Self-Touch, Arousal & Orgasm, Undressing, the wardrobe lock | Yes | Entranced | Owner, Lovers and whitelist |
| **Extreme** | Everything, including Made to Touch Others, Made to Speak, Sight, Hearing, the clothing illusion, awareness, carry-forward and the settings lock. Every depth set to 20. Arousal may reach triggers and the illusion. Toy mode for Owner, Lovers and whitelist; drops unlimited; triggers fade very slowly | No — agrees automatically | Blank | Everyone except your blacklist |

**The five questions** cover your role (Hypnotist only, or Subject/both), how attempts are handled (always ask, toy mode for owner and lovers, or agree to all), what physical commands you allow, what can be done to your senses and awareness, and how triggers work. Your answer about physical commands also sets how far "sink deeper" can take you (Yielding, Entranced or Deep). The questions never lock anything.

### The Extreme lock

Choosing **Extreme** shows a warning first, with **Confirm 1-week lock** and **Cancel**. Once confirmed:
* For **7 days** your settings are **read-only**. You can still open every tab and read them, under a yellow banner showing the end date. You cannot change anything — including switching Hypnosis Enabled off, re-running setup, importing a backup, or removing planted triggers (Purge and Clear All).
* When the 7 days end, opening the settings asks how it went: **Return to editable settings**, or **Commit to 30 days**. After that, every 30 days you are asked whether to **Renew** or **Unlock**. Until you answer, the settings stay read-only. Unlocking keeps every setting as it was.
* **What always works:** `/echs safeword` still ends any trance immediately. `/echs reset confirm` unlocks early, but it **erases all your trust, triggers and stats too**. You can also switch ECHS off in your userscript manager (Tampermonkey, or whatever loaded it). Export still works, so you can keep a backup.

---

## 10. Data & Backup

* `/echs export`: Generates an encoded text backup of all current settings, thresholds, and trust records.
* `/echs import <blob>`: Restores configuration from a saved backup string. Refused while a session is on you if you have ticked the setting lock; export and reset still work.
* `/echs reset confirm`: Restores the add-on to factory defaults. If an active trance is running, it breaks the trance first before wiping storage.

Settings are saved in Bondage Club's account extension storage with a local fallback keyed to your member number.
