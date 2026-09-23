# Troubleshooting

> **Alpha Notice**  
> ECHS is in active alpha development. UI locations, diagnostic feedback, and known parser quirks are actively being refined. Both `/echs` and `/hypno` are fully recognized prefixes.

---

## 1. The Add-On Does Nothing at All

**Did you see these lines when you first loaded in?**

[Erotic Chat Hypnosis Suite (ECHS) — nothing is switched on yet. Open settings to configure.]
[Your reactions are visible to the room by default; Trance Defaults turns that off.]

If so, the script is running properly — **it simply starts completely turned off**. Every permission begins disabled by default, including the master switch. Click the spiral icon on your player profile card (or go to **Preferences → Extensions → ECHS Hypnosis**) and run the Setup Wizard. See [Getting Started](Getting-Started). *(This notice appears only on a fresh install, so returning players will not see it on every login).*

**If a red note in the bottom-right corner says ECHS could not load:**  
Since v0.83.0 ECHS downloads its newest version each time the game opens, and this time it could not reach either place it downloads from. Refresh the page. If the note keeps coming back, report it and say which Bondage Club address you play on.

**If there is no spiral icon on your player profile card and nothing in the browser console:**  
The userscript is not executing. A userscript with an incorrect `@match` pattern will fail silently without error. Because Bondage Club is hosted across multiple domains and mirrors, verify that your userscript manager (Tampermonkey, Violentmonkey, etc.) lists the script as active and enabled on the exact URL you are visiting.

---

## 2. I Said Something and Nothing Happened

Suggestions must pass a strict sequence of checks. If a spoken command produces no reaction, check these four gates in order:

1. **Is the permission enabled?** Type `/echs session` (or `/hypno session`) to verify which categories are granted.
2. **Is there an active trance with that specific hypnotist?** Suggestions are bound to the specific partner who conducted the induction, not just any general trance state.
3. **Did the speaker include the subject's name?** Every targeted suggestion requires addressing the subject by name. Type `/echs match <phrase>` to test if the name gate passed.
4. **Is the subject deep enough in trance?** Type `/echs gates` to review depth thresholds. A phrase can match the dictionary perfectly but still fail if the trance is not deep enough.

**The hypnotist receives private chat feedback indicating which gate blocked the command.** If the hypnotist received no feedback at all, the phrasing failed to match the parser dictionary entirely.

**A pose can pass every gate and still not happen.** If bondage or furniture prevents it, the room sees the subject try and fail, and the hypnotist is told the suggestion *matched but did not land*. Nothing claims the pose worked. Remove the restraint, or pick a pose the restraint allows.

---

## 3. The Wording Did Not Match

Punctuation, capitalization, and standard contractions (*can't* vs. *cannot*) are normalized automatically. If a line failed to match, check for these common causes:

* **Missing Name:** The line must include the subject's character name.
* **First-Person Confusions ("I" or "We"):** Lines starting with *"I"* or *"we"* without a subsequent *"you"* are discarded intentionally so descriptive emotes like *"I kneel beside you"* do not force the subject to kneel.
* **Parentheses:** Any text enclosed in single parentheses `(like this)` is treated as OOC dialogue and discarded before the parser evaluates the message.
* **Unrecognized Phrasing:** The parser matches specific structures. Check the in-game **What to Say** tab (generated directly from the engine) or [What to Say](What-to-Say) on the wiki for valid sentence patterns.

---

## 4. A Suggestion Refused Due to Depth

This is an intentional gate, not a bug. The suggestion requires a deeper trance tier than the subject currently occupies. How deep a hypnotist can take someone depends on familiarity, trust, and relationship status. See [Depth and Trust](Depth-and-Trust).

*If you want a specific effect to be accessible in lighter trances, adjust its tier under the **Depth** tab. Depth gates are personal comfort settings, not game difficulty locks.*

---

## 5. Something Is Stuck on Me

If an effect or restriction persists unexpectedly, escalate in this order:

1. **Wait It Out:** Most standard effects wear off automatically on timers, and trance sessions expire after 30 minutes.
2. **Release by Name:** The hypnotist who applied the effect can speak a targeted release phrase (e.g., *"Missy, you are released from sleepy time"*).
3. **Use the Emergency Safeword:** Type `/echs safeword` (or `/hypno safeword`). This instantly breaks trances, clears all active triggers, and purges all lingering effects from any state.

*Note on `/echs forgettrigger`:* The command intentionally refuses to delete a trigger while that specific trigger is actively holding you. Use your safeword for an immediate clean break.

---

## 6. I Have Been Silenced and Cannot Type

* **Slash Commands Always Function:** Bondage Club processes client slash commands before speech-restriction hooks ever see them. **`/echs safeword` (or `/hypno safeword`) remains accessible 100% of the time, even while completely muted.**
* **Out-of-Character (OOC) Chat:** Text wrapped in parentheses `(like this)` bypasses speech blocks by default, ensuring you are never cut off from OOC communication mid-scene. *(The only exception is if you manually enabled "Silence OOC Too" on your Trance Defaults tab).* Messages containing mixed in-character and OOC text are blocked entirely to prevent speech smuggling.

---

## 7. The Profile Spiral Reports They Do Not Have the Add-On

The spiral icon appears on every player's profile card because client-side scripts cannot detect third-party add-ons without sending a query. When clicked, your client waits approximately three seconds for a handshake response. If no response arrives, the panel displays that the player does not have the extension installed, along with a *Check again* button.

The icon is intentionally visible for all players rather than hidden for non-users, preventing the profile card from turning into a public directory of who is running the script.

---

## 8. My Trigger Stopped Working

* **Natural Decay:** Type `/echs triggers` (or `/hypno triggers`) to review trigger strength. A trigger's remaining strength represents the depth tier it fires at. A decayed trigger will fire its shallow actions (like freezing) but fail to execute deeper actions.
* **Revoked Permission:** Permissions are re-checked at the exact moment a trigger fires. If *Movement Restriction* was unticked after a trigger was planted, the movement portion of that trigger will fail to execute.
* **Scope Restrictions:** If the trigger was planted by someone else and your scope is set to *Hypnotist only*, other players cannot fire it. Firing your own triggers is also disabled by default (*"You can fire your own triggers"* on the Triggers tab).

---

## 9. The Room Saw Something Unexpected

* **Private Logs `[Square Brackets]`:** Any feedback wrapped in square brackets is local to your machine.
* **Observable Emotes:** Actions that would be visibly noticeable in the room (such as pausing, going still, or failing to speak) are automatically broadcast as room emotes. Purely mental or perceptual suggestions are never emoted.
* **Hiding Emotes:** To keep all character reactions completely private, disable **Trance Defaults → Others See Your Reactions**.

---

## 10. Known Alpha Quirks

* **The "Feel" Caress Trap:** Because *"feel"* is mapped as a caress verb, an ordinary deepening sentence like *"Missy, your arms feel heavy"* can inadvertently parse as *caress your arms*, triggering a real self-touch activity. This only affects subjects who have enabled *Made to Act*. Hypnotists should prefer *touch*, *caress*, or *stroke*, and avoid using *"feel"* while *Made to Act* is active.
* **Pose Words in Ordinary Patter:** *"Surrender"* and *"relax your arms"* are pose commands as well as common hypnosis phrasing. With *Posture Control* ticked, *"Missy, surrender to my voice"* raises her arms over her head, and *"Missy, relax your arms"* drops any arm pose she is holding. Leave the name out of that sentence, or rephrase, if you only meant atmosphere.
* **Whole-Body Poses:** *"On all fours"* and *"lie down"* use Bondage Club's whole-body poses, so they replace any arm pose rather than combining with it. *"Lie down"* may need a supporting item worn before the game allows it; if it does, it reports as not landing rather than failing silently.
* **Trigger Phrase Collisions in Commands:** If a planted trigger phrase appears inside a spoken command line, the trigger handler may take precedence and swallow the command.
* **Internal Action IDs:** In some diagnostic outputs like `/echs triggers`, queued actions may display raw internal IDs (e.g., `act:genital`) rather than localized descriptions.
* **Trigger Decay Balancing:** Live trigger decay curves are actively being calibrated across real play sessions and remain disabled by default.

---

## 11. Diagnostic Helper Commands

When troubleshooting why a scene or command is not behaving as expected, use these diagnostic tools:

| Command | Primary Use |
|---|---|
| `/echs effects` | Lists everything currently affecting your character and what survives a reconnect. |
| `/echs session` | Displays your active session phase and granted permissions. |
| `/echs match <phrase>` | Tests why a specific line passed or failed matching. |
| `/echs gates` | Compares your current depth against the requirements for each feature. |
| `/echs storage` | Inspects data persistence and extension storage states. |
