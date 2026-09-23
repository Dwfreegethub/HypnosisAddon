# Settings Reference

> **Alpha Notice**  
> ECHS is in active alpha development. Settings layouts, storage keys, and UI options are actively being polished. Both `/echs` and `/hypno` are fully recognized prefixes.

---

Open settings via the **spiral icon on your player profile card**, or navigate to **Preferences → Extensions → ECHS Hypnosis**. Setting categories run down the left edge.

Everything in these menus represents a **permission** (*"Do I allow this to be done to me?"*) or a **depth threshold** (*"How deep must I be?"*). Ticking a toggle simply defines your boundaries — it never forces an effect on you on its own.

*Note on Mid-Trance Editing:* By default, settings can be configured to lock during an active session (including during the induction window) to preserve immersion. If you ever need out, use your emergency safeword: `/echs safeword` (or `/hypno safeword`).

---

## 1. Permissions Tab

| Setting | What It Allows |
|---|---|
| **Hypnosis Enabled** | The master toggle and absolute floor. Disabling this shuts down the add-on, immediately breaks active trances, and purges all effects (identical to the safeword). Re-enabling it later restores your toggles without reapplying old effects. |
| **Movement Restriction** | Allows freezing suggestions (*"you cannot move"*). |
| **Clothing Restriction** | Locks out the wardrobe screen while in trance. |
| **Posture Control** | Allows kneeling and standing suggestions. |
| **Follow / Leash** | Allows following suggestions (*"follow me"* / *"stay close"*). Compels you to stay at the hypnotist's side across room transitions using Bondage Club's native leash system. Requires your native BC leashing permissions to be enabled. |
| **Speech Restriction** | Allows verbal muting (*"you cannot speak"*). Affects standard room chat only; slash commands always bypass speech locks. |
| **Self-Touch Control** | Allows you to be blocked from touching yourself (*"you cannot touch yourself"*). |
| **Made to Act (Touch Yourself on Command)** | Allows the hypnotist to command physical self-actions (*"touch your breasts"*). See [Commanded Activities](Commanded-Activities). |
| **Made to Touch Others (needs Made to Act)** | Allows the hypnotist to aim those commands at someone else in the room (*"kiss Rei"*). Not needed for the hypnotist themselves (*"kiss me"*). Off by default. See [Commanded Activities](Commanded-Activities#touching-someone-else). |
| **Arousal & Orgasm** | Allows arousal manipulation, orgasm denial, forced climaxes, and sexual numbness. |
| **Clothing Illusion (you see old clothes)** | Allows false reflections (your screen renders clothes you have been stripped of). Changes what you **see**, not what your chat log says; that is the Awareness tab. |
| **Undressing** | Allows spoken undress commands (*"take something off"* / *"strip"*). |
| **Lock Settings While in Session** | Toggles whether this settings menu is locked during an active trance. |

*Additional Permissions Controls:*
* **Induction Attempt Limit:** Choose between 2 or 3 attempts before triggering a 10-minute cooldown (default: 2).
* **Starter Set:** A one-click preset on fresh installs that enables five safe, session-only basics, reversible with a single click.

*(Note: Planted triggers and carry-forward suggestions are managed on the **Triggers** tab).*

---

## 2. Trance Defaults Tab

Defines baseline states that engage automatically when an induction succeeds, before verbal suggestions are spoken.

| Setting | Default | Effect |
|---|---|---|
| **Cannot Move** | On | The trance itself immobilizes you upon going under. |
| **Cannot Speak** | On | The trance silences standard room speech automatically. |
| **Silence OOC Too** | Off | By default, single-parentheses OOC text `(like this)` passes through muted speech. Enabling this suppresses OOC chat while silenced. |
| **Screen Fade** | On | Displays a soft trance veil overlay across your screen while under. Automatically thins during active walking trances. |
| **Clothes Look Unchanged** | Off | Automatically engages the clothing illusion upon entering trance. |
| **Others See Your Reactions** | On | Broadcasts room-visible emotes (such as going still or failing to speak). Turning this off silences automated emotes. |
| **Release on Disconnect** | Off | When enabled, drops all active effects immediately if you log out or disconnect, rather than restoring remaining timers on reconnect. |

---

## 3. Awareness Tab

Controls perceptual filtering — what your character can be hypnotically made not to notice. These hide **chat messages** only. Your own screen still shows your real body; making it show your old clothes is the separate **Clothing Illusion** permission.

* **Clothing Changes:** Suppresses chat notices when items of clothing are removed or replaced.
* **Bondage Changes:** Suppresses chat notices when anything in an item slot is applied, adjusted, locked, or removed: restraints, and also gags, collars, blindfolds, toys and locks.
* **Touches / Activities:** Suppresses chat feedback from physical interactions.
* **Trigger Setup (Hide Planted Phrases):** Hides the setup dialogue while a trigger is being installed, preventing you from consciously reading your own trigger phrase.

---

## 4. Triggers Tab

Manages long-term suggestions and conditioned words:

* **Allow Triggers to Be Planted:** Master permission for storing trigger words in your client.
* **Suggestions That Outlive Trance (Carry-Forward):** Allows post-hypnotic suggestions to remain active after waking.
* **Self-Triggering:** Permits you to trigger your own planted words (off by default).
* **Reveal Trigger Words:** Displays clear-text phrases when listing triggers via `/echs triggers` (off by default for blind trigger play).
* **Trigger Duration:** Sets how long a triggered state persists before releasing (or until manually dispelled).
* **Trigger Decay Rate:** Configures how quickly dormant planted triggers naturally fade over time (*Never · Very Slowly · Slowly · Typical · Fast · Very Fast*; default: *Never*).
* **Trigger Scope:** A permission ladder governing who can fire your triggers (*Hypnotist Only* up to *Anyone*).

---

## 5. Depth Tab

* **Per-Feature Tier Assignments:** Move any individual feature up or down the depth tiers (*Drifting, Yielding, Entranced, Deep, Blank*). Tier gates are personal comfort settings, not rigid game limits.
* **Arousal Reach (Chemical Reach):** Choose whether clothing illusions and planted triggers can be unlocked via high arousal instead of earned trust. (Triggers planted via arousal fade rapidly. Carry-forward waking suggestions cannot be unlocked by arousal).
* **Honouring Hypnotist Skill:** Dictates how much weight your client gives to an incoming hypnotist's experience rating (*Ignore Completely · Trusted Partners Only · Capped Value from Anyone*).
* **Reset Depth Gates:** Restores all tier thresholds to standard defaults.

---

## 6. Stats & Advanced Tab

Accessible via the **Advanced** toggle below the tabs:

* **Trust & Experience Records:** Read-only breakdown of per-person interaction counts and your personal subject experience pool.
* **Trust Decay Rate:** Configures how fast earned familiarity fades over prolonged periods without contact (*Off* by default).
* **Relationship Baselines:** Displays active baseline access granted by native BC Friends, Lovers, or Owners.

---

## 7. Setup Wizard

On fresh installs or after running a reset, opening the settings menu launches the guided **Setup Wizard**. You can re-run it at any time from within the settings interface.

The wizard provides four starting templates:
* **Hypnotist Only**
* **Light / Safe**
* **Balanced**
* **Extreme**

Alternatively, you can complete a short 5-question questionnaire to configure permissions automatically. The wizard cannot be launched during an active trance.

---

## 8. Data & Backup

* `/echs export` (or `/hypno export`): Generates an encoded text backup of all current settings, thresholds, and trust records.
* `/echs import <blob>` (or `/hypno import <blob>`): Restores configuration from a saved backup string. Refused while a session is on you if you have ticked the setting lock; export and reset still work.
* `/echs reset confirm` (or `/hypno reset confirm`): Restores the add-on to factory defaults. If an active trance is running, it breaks the trance first before wiping storage.

Settings are saved in Bondage Club's account extension storage with a local fallback keyed to your member number.
