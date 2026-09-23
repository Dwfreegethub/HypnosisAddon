# Consent and Safety

> **Alpha Notice**  
> ECHS is in active alpha development. Balancing player agency with immersion is an ongoing process. Both `/echs` and `/hypno` are fully recognized prefixes.

---

This add-on does real things to your game client and character behavior. This page breaks down how permissions work, how the client protects you under the hood, and every available way out of a scene.

---

## A Quick Word on Safety vs. CNC Play

Let’s be real for a moment: this mod puts a heavy emphasis on client-side safety, granular permissions, and verification gates. For a lot of players, that peace of mind is essential. 

At the same time, if your thing is heavy consensual non-consent (CNC), surrender, or feeling truly helpless, guardrails and permission popups can sometimes pull you right out of the headspace. That tension is recognized. Work is underway on opt-in mechanics and presets to better cater to darker or deeper CNC roleplay without compromising the core fail-safes. In the meantime, the safety floor is built to guarantee that *you*—the person behind the keyboard—always hold the master key.

---

## 1. Your Client Decides Everything

Another player’s add-on can only ever **ask**.

When a hypnotist says *"Missy, you cannot move"*, their computer isn't reaching into yours to freeze your avatar. Instead:
1. Your game client reads the line from chat.
2. Your local script checks the words against your own settings and trance depth.
3. Your client decides whether to execute the action or ignore it.

This is a structural design rule, not just an honor system. A modified hypnotist client has nothing to override—it cannot read your permissions, it cannot see your exact numbers, and it never gets told whether you picked Agree, Ignore, or Fight during induction. It gets only a broad, vague read on how the scene is unfolding.

---

## 2. Nothing Is On Until You Turn It On

On a fresh install, every permission starts switched **off**, including the master **Hypnosis Enabled** toggle. If you install the script and it seems completely dead, that is entirely intentional. We don't touch your character until you explicitly say what's fair game.

Permissions are configured **per feature**:
* Movement restriction (freezing)
* Speech restriction (muting)
* Posture control (kneeling and standing)
* Wardrobe restrictions (blocking clothing changes)
* Arousal control and forced climaxes
* Undressing
* Commanded activities (acting on command)
* Sensory modulation and awareness suppression
* False reflections (clothing illusions)
* Storing and firing trigger words

### Adjusting Permissions & Mid-Trance Locks
Outside of trance, unticking a permission immediately drops whatever effect was active and disarms that part of any planted trigger you have saved.

*Note on Trance Locks:* If you enable the option to lock your settings during a trance, your permissions menu is locked down while you are under to keep you in character. Importing a settings backup is locked too, from the Import button and from `/echs import` alike, since it would replace every permission at once. However, your emergency exits remain completely untouched—no setting lock can ever touch your safeword.

---

## 3. Two Gates: Permission AND Depth

Every hypnotic suggestion has to pass two separate hurdles:

1. **Permission:** *Did you explicitly allow this category of effect in your settings?*
2. **Depth:** *Are you actually deep enough for it to work?*

Both must pass at the exact moment a line is spoken. Ticking a permission simply gives your partner permission to try—they still have to successfully guide you to the required depth tier. How far they can take you depends on mutual trust and familiarity. 

*(Note: Mentioned depth tiers like Drifting, Yielding, Entranced, and Deep reflect the mod's default configuration. All depth gates and tier thresholds are fully customizable in your settings).* See [Depth and Trust](Depth-and-Trust).

---

## 4. The High-Impact Stuff

A few features are guarded much more strictly by default because they outlive the scene, alter your perception, or simulate real involuntary action:

* **Clothing Illusion:** Your screen keeps rendering your original outfit, while the rest of the room sees what you are actually wearing.
* **Planted Triggers:** Trigger words that stay primed in your client to fire later—inside or outside of trance, even days down the line.
* **Carry-Forward Suggestions:** Effects set to stay active after you wake up.
* **Awareness Suppression:** Hides clothing changes, ropes, or touch interactions from your chat log. The actions happen in the room, but your client doesn't notify you.

These features default to requiring a **Deep** trance earned through genuine **Earned Depth** (built over time through trust and skill). Quick arousal boosts can never unlock them.

---

## 5. What Arousal Can (and Can't) Do

Getting worked up or highly aroused can lower your resistance and open doors, but only up to a hard ceiling (defaulting to the **Yielding** tier).

* By default, arousal alone is only enough for a partner to reach basic, session-only commands (like freezing or kneeling).
* Arousal **never** unlocks Deep-tier features, triggers, clothing illusions, or carry-forward effects.
* A decision made in the heat of the moment cannot leave lasting effects behind once you have cooled down.

---

## 6. Every Way Out

These exits cannot be disabled, locked, or overridden by any hypnotic command, trigger, or setting:

### Emergency Safewords & Disabling
* **`/echs safeword` (or `/hypno safeword`):** The absolute baseline floor. Instantly breaks trance and purges every active effect, from any state. Because Bondage Club processes slash commands before speech-restriction hooks can touch them, **the safeword works 100% of the time, even when your character is completely silenced.**
* **Unticking "Hypnosis Enabled":** Completely shuts down the add-on from your native extension menu.

### Waking Up & Natural Releases
* **`/echs wake` (or `/hypno wake`):** Lets you pull yourself out of a light trance. A deep trance will refuse and let you know you're too far under.
* **Hypnotist Wake Commands:** The hypnotist's **Wake Up** button or spoken wake phrases (*"wake up"*, *"you are awake"*, *"come back to me"*) require no permission checks and work instantly.
* **Targeted Trigger Release:** A line like *"Missy, you are released from sleepy time"* clears that specific trigger's hold, even outside of trance.

### Automatic Timeouts
* **Session Timers:** Trances automatically time out and release after a set period.
* **Trigger Timers:** Fired triggers decay and release on their own countdown.
* **Induction Window:** An unanswered induction prompt closes on its own after the countdown expires.

### One Deliberate Refusal
* `/echs forgettrigger` (or `/hypno forgettrigger`) **will refuse to delete a trigger while that trigger is actively holding you.** Deleting a trigger while you are under its direct influence is blocked to preserve scene tension—use `/echs safeword` instead for an immediate, clean break.

---

## 7. What You and the Room See

* **Private Lines `[In Brackets]`:** Anything wrapped in square brackets is visible only to you. Nobody else in the room sees it.
* **Public Emotes:** Actions that would be physically noticeable in the room are sent as standard emotes for everyone to read (like reaching out and freezing, going motionless, or moving your mouth without speaking).
* **Perception Effects:** Purely mental effects (like failing to notice an item or seeing a clothing illusion) are never emoted. Nobody can watch you fail to notice something.
* **Turning Emotes Off:** If you prefer your reactions to stay completely private, turn off **Trance Defaults → Others See Your Reactions**.

---

## 8. Out of Character (OOC) Protection

Anything enclosed in single parentheses `(like this)` is ignored by the parser before any suggestion or trigger check happens. 

Typing `(brb)` or `(checking scene consent)` will never fire an effect, advance trust, or trigger a hypnotic response. ECHS strictly respects Bondage Club's native OOC formatting.
