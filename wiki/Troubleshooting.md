# Troubleshooting

> 🛡️ **EMERGENCY EXIT — ANY TIME, ANY STATE**  
> If you are trapped, muted, frozen, or need to end the scene immediately: **Type `/echs safeword`**.  
> Bondage Club processes slash commands before speech-restriction hooks see the text, so the safeword works 100% of the time, even when completely silenced. It instantly breaks active trances, releases all holding triggers, discards waking compulsions, and restores full character control.

> **Alpha Notice**  
> ECHS is in active alpha development. UI locations, diagnostic feedback, and known parser quirks are actively being refined.

---

## Quick Diagnostic: "I Said Something and Nothing Happened"

Run this checklist in order:

| # | Check | If not |
|---|---|---|
| 1 | **Does the wording match?** | Check spelling, include the subject's name, or whisper to them. See [What to Say](What-to-Say). |
| 2 | **Is the permission on?** | The subject enables it in **Preferences → Extensions → ECHS Hypnosis**. |
| 3 | **Is there an active session?** | The hypnotist runs `/echs induce <name>` or clicks the profile spiral. |
| 4 | **Is the subject deep enough?** | Check `/echs gates`. The partner needs more trust, or a *"sink deeper"*. |

**Detailed gate checks:**
* **Permission gate:** Is the feature enabled on the subject's client? `/echs session` shows which categories are granted.
* **Session gate:** Is there an active trance with *that specific hypnotist*? Suggestions are bound to the partner who conducted the induction, not to any trance in general.
* **Name gate:** Did the speaker use the subject's exact name or nickname? A whisper to the subject needs no name. Test with `/echs match <phrase>`.
* **Depth gate:** Is the subject deep enough? `/echs gates` compares current depth with each feature's threshold. A phrase can match perfectly and still fail here.

**The hypnotist receives private chat feedback saying which gate blocked the command.** If the hypnotist got no feedback at all, the line did not match the parser's dictionary.

**A pose can pass every gate and still not happen.** If bondage or furniture prevents it, the room sees the subject try and fail, and the hypnotist is told the suggestion *matched but did not land*. Nothing claims the pose worked. Remove the restraint, or pick a pose the restraint allows.

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

## 2. The Wording Did Not Match

Punctuation, capitalization, and standard contractions (*can't* vs. *cannot*) are normalized automatically. If a line failed to match, check for these common causes:

* **Missing Name:** A line said out loud must include the subject's character name. (Whispered to them, it doesn't need it.)
* **First-Person Lines ("I" or "We"):** Lines starting with *"I"* or *"we"* without a following *"you"* are discarded on purpose, so descriptive emotes like *"I kneel beside you"* do not force the subject to kneel.
* **Parentheses:** Any text enclosed in parentheses, single `(like this)` or double `((like this))`, is treated as OOC dialogue and discarded before the parser evaluates the message.
* **Unrecognized Phrasing:** The parser matches specific structures. Check the in-game **What to Say** tab (generated directly from the engine) or [What to Say](What-to-Say) on the wiki for valid sentence patterns.

---

## 3. A Suggestion Refused Due to Depth

This is an intentional gate, not a bug. The suggestion requires a deeper trance than the subject is in. How deep a hypnotist can take someone depends on familiarity, trust, and relationship status. See [Depth and Trust](Depth-and-Trust) and [How an Induction Works](How-Inductions-Work).

*If you want a specific effect to be reachable in lighter trances, adjust its depth on the **Depth** tab. Depth gates are personal comfort settings, not game difficulty locks.*

---

## 4. I Am Frozen or Stuck

If an effect or restriction persists unexpectedly, escalate in this order:

1. **Wait It Out:** Most standard effects wear off automatically on timers, and trance sessions expire after 30 minutes.
2. **Hypnotist Left the Room:** If the hypnotist leaves during a trance, the trance ends on its own 5 minutes after they went, unless they come back.
3. **Release by Name:** The hypnotist who applied the effect can speak a targeted release phrase (e.g., *"Missy, you are released from sleepy time"*).
4. **Use the Emergency Safeword:** Type `/echs safeword`. This instantly breaks trances, releases every trigger that is holding you, discards compulsions waiting for you to wake, and purges all lingering effects from any state.

**How to wake up:**
* **If you are the subject:** `/echs wake` breaks a *shallow* trance yourself. A deep trance refuses it; use `/echs safeword` to get out immediately.
* **If you are the hypnotist:** `/echs wake` only ever wakes yourself. To wake your partner, speak a wake line (*"Missy, wake up"*) or click **Wake Up** on their profile remote.

*Trying to move while held:* you see *"You try to shift, and your body does not answer."* It shows at most once every 30 seconds, so repeated tries don't flood your chat.

*After a refresh or disconnect:* a trigger that was holding you comes back and finishes the time it had left. Time spent logged out counts, so one that would have ended while you were away has ended. To come back clear instead, tick **Release everything if you disconnect** on your Trance Defaults tab.

*Note on `/echs forgettrigger`:* The command intentionally refuses to delete a trigger while that specific trigger is actively holding you. Use your safeword for an immediate clean break.

---

## 5. I Have Been Silenced and Cannot Type

* **Slash Commands Always Function:** Bondage Club processes client slash commands before speech-restriction hooks ever see them. **`/echs safeword` remains accessible 100% of the time, even while completely muted.**
* **Out-of-Character (OOC) Chat:** Text wrapped in parentheses, `(like this)` or `((like this))`, bypasses speech blocks by default, ensuring you are never cut off from OOC communication mid-scene. *(The only exception is if you manually enabled "Silence OOC Too" on your Trance Defaults tab).* Messages containing mixed in-character and OOC text are blocked entirely to prevent speech smuggling.

---

## 6. The Profile Spiral Reports They Do Not Have the Add-On

The spiral icon appears on every player's profile card because client-side scripts cannot detect third-party add-ons without sending a query. When clicked, your client waits approximately three seconds for a handshake response. If no response arrives, the panel displays that the player does not have the extension installed, along with a *Check again* button.

The icon is intentionally visible for all players rather than hidden for non-users, preventing the profile card from turning into a public directory of who is running the script.

---

## 7. My Trigger Stopped Working

* **Natural Decay:** Type `/echs triggers` to review trigger strength. A trigger's remaining strength represents the depth tier it fires at. A decayed trigger will fire its shallow actions (like freezing) but fail to execute deeper actions.
* **Revoked Permission:** Permissions are re-checked at the exact moment a trigger fires. If *Movement Restriction* was unticked after a trigger was planted, the movement portion of that trigger will fail to execute.
* **Scope Restrictions:** If the trigger was planted by someone else and your scope is set to *Hypnotist only*, other players cannot fire it. Firing your own triggers is also disabled by default (*"You can fire your own triggers"* on the Triggers tab).
* **Used Up or Timed Out:** A trigger set to work once is gone after it fires, and a trigger with a time limit stops at that time. Check with `/echs triggers <number>`.
* **Whole Words Only:** If the trigger, or your **Triggers fire only on whole words** setting, needs the whole words, it will not fire inside a longer word.
* **A Drop That Did Nothing:** A drop needs **Drop triggers** on, and follows the rules of an ordinary hypnosis attempt: not already in a trance, nobody else part-way through, the speaker in the room. Whoever said it is told why.
* **A Compulsion That Has Not Gone Off:** Compulsions never fire while you are in a trance. One timed from waking only starts its clock when you wake from a trance with the hypnotist who planted it, and your safeword discards it.

---

## 8. The Room Saw Something Unexpected

* **Private Logs `[Square Brackets]`:** Any feedback wrapped in square brackets is local to your machine.
* **Observable Emotes:** Actions that would be visibly noticeable in the room (such as pausing, going still, or failing to speak) are automatically broadcast as room emotes. Purely mental or perceptual suggestions are never emoted.
* **Hiding Emotes:** To keep all character reactions completely private, disable **Trance Defaults → Others See Your Reactions**.

---

## 9. Known Alpha Quirks

* **The "Feel" Caress Trap:** Because *"feel"* is mapped as a caress verb, an ordinary deepening sentence like *"Missy, your arms feel heavy"* can inadvertently parse as *caress your arms*, triggering a real self-touch activity. This only affects subjects who have enabled *Made to Act*. Hypnotists should prefer *touch*, *caress*, or *stroke*, and avoid using *"feel"* while *Made to Act* is active.
* **Pose Words in Ordinary Patter:** *"Surrender"* and *"relax your arms"* are pose commands as well as common hypnosis phrasing. With *Posture Control* ticked, *"Missy, surrender to my voice"* raises her arms over her head, and *"Missy, relax your arms"* drops any arm pose she is holding. Leave the name out of that sentence, or rephrase, if you only meant atmosphere.
* **Held Restraints & Poses:** If bondage items prevent a pose, the room sees the character struggle and fail rather than a false confirmation. Real restraints always win over hypnotic commands.
* **Whole-Body Poses:** *"On all fours"* and *"lie down"* use Bondage Club's whole-body poses, so they replace any arm pose rather than combining with it. *"Lie down"* may need a supporting item worn before the game allows it; if it does, it reports as not landing rather than failing silently.
* **Trigger Phrase Collisions in Commands:** If a planted trigger phrase appears inside a spoken command line, the trigger handler may take precedence and swallow the command.
* **Internal Action IDs:** The hypnotist's private `[trigger]` confirmations still name actions by their internal IDs (e.g., `movement-block`, `act:genital`). Your own `/echs triggers <number>` shows them in plain words.
* **Trigger Decay Balancing:** Live trigger decay curves are actively being calibrated across real play sessions and remain disabled by default.

---

## 10. Diagnostic Helper Commands

When troubleshooting why a scene or command is not behaving as expected, use these diagnostic tools:

| Command | Primary Use |
|---|---|
| `/echs effects` | Lists everything currently affecting your character and what survives a reconnect. |
| `/echs session` | Displays your active session phase and granted permissions. |
| `/echs match <phrase>` | Tests why a specific line passed or failed matching. |
| `/echs gates` | Compares your current depth against the requirements for each feature. |
| `/echs chance [name]` | Shows the calculated induction odds for Agree, Ignore and Fight against someone. |
| `/echs storage` | Inspects data persistence and extension storage states. |
