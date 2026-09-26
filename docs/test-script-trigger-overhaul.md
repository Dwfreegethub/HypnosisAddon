# Test Script — Trigger Overhaul (v0.92.0)

One pass through every new trigger feature, in an order that reuses each setup. About 45 minutes.
The subject is **Missy** throughout. Replace **H** with the hypnotist's name wherever it appears.
Lines starting `[trigger]` appear only on H's screen. Tick a box when what you see matches.

The full per-feature checklists (with failure descriptions) are *Needs Testing* items 19–24 in
`design.md`; this script covers the same ground in one run.

---

## 0. Setup (5 min)

- [ ] Both accounts in a room named **Hypno Testing** (this unlocks `/echs trance`).
- [ ] Both accounts' first ECHS chat line on loading reads **v0.90.1**.
- [ ] On **Missy**, ECHS settings:
  - **Permissions:** *Hypnosis Enabled*, *Movement Restriction* on. *Made to Speak* **off** for now.
  - **Awareness:** *Trigger setup* **off** (otherwise the planting lines are hidden entirely).
  - **Triggers:** *Allow triggers to be planted* on; *Show trigger words* **off**; *Triggers fire
    only on whole words* **off**; *Longest a new trigger lasts* **No limit**; scope *Hypnotist only*.
    Scroll down: *Drop triggers* **Off**.

**To put Missy under for any plant below:** Missy types `/echs trance H 80`.
Expect: `Under with H (…) at depth 80 full / 80 earned — Blank.`
**To wake Missy:** H says *"Missy, wake up"*.

---

## 1. Options, one-shot, hidden words (Builds 1 + 3)

Missy: `/echs trance H 80`. Then H says, one line at a time:

| H says | H sees | Missy sees |
|---|---|---|
| *Missy, your trigger word is ember glow* | `[trigger] RECORDING "ember glow". …` | `Missy, your trigger word is ...` and *"Something is being set aside in you."* |
| *Missy, you cannot move* | `[trigger] Recorded movement-block into "ember glow" (1 so far).` | *"That settles into place, waiting."* |
| *Missy, this trigger works only once* | `[trigger] Noted for "ember glow": it will work once, then be gone.` | *"The shape of it shifts, just slightly."* |
| *Missy, it lasts 2 hours* | `[trigger] Noted for "ember glow": it will last 2 hours.` | same line |
| *Missy, remember trigger* | `[trigger] SAVED "ember glow" — 1 action(s): movement-block. Planted at 80 (Blank). Options: works once, ends in 2 hours. …` | *"It settles somewhere you won't think to look for it."* |

- [ ] **Hidden word:** on Missy's screen, every line above shows `...` where "ember glow" was. On H's
  screen (and anyone else's), the words show in full.

H: *"Missy, wake up"*. Then H says *"Ember glow!"*

- [ ] Missy sees `...!` and is frozen.
- [ ] Missy: `/echs triggers` → `You have 1 trigger planted:` then `1. by H (#…), full strength (80, Blank), used up  ** HOLDING YOU NOW **`.
- [ ] H says *"ember glow"* again → nothing happens (used up).
- [ ] H: *"Missy, you are released from ember glow"* → Missy can move. Missy: `/echs triggers` → `no triggers planted`.
- [ ] H says *"ember glow"* once more → Missy now sees the words in full (it is no longer a trigger).
- [ ] **(v0.90.2)** Repeat this section, but end it with Missy typing `/echs safeword` instead of the release. *Expect the same:* `/echs triggers` → `no triggers planted`, and "ember glow" shows in full. On v0.90.1 it stayed listed and masked.

---

## 2. Whole words, lifespan cap, scope ask (Build 1)

On **Missy**, Triggers tab: tick *Triggers fire only on whole words*; set *Longest a new trigger lasts* to **15 minutes**.

Missy: `/echs trance H 80`. H: *"Missy, your trigger word is sleepy"*, *"Missy, you cannot move"*, *"Missy, it lasts 2 hours"*, *"Missy, anyone can use it"*, *"Missy, remember trigger"*.

- [ ] H's SAVED line ends with: `Her settings let a trigger live at most 15 minutes, so it ends then. Her settings only allow "Hypnotist only", so that is who can fire it. Her settings make every trigger fire on the whole words only.`

H: *"Missy, wake up"*. Then:

- [ ] H: *"hey sleepyhead"* → nothing.
- [ ] H: *"so sleepy"* → Missy frozen. H: *"Missy, you are released from sleepy"*.
- [ ] *(Optional, with a third player R)* R says *"sleepy"* → nothing (scope capped to Hypnotist only).
- [ ] *(Optional, come back later)* 15+ minutes after planting, H says *"sleepy"* → nothing; `/echs triggers` no longer lists it.

Reset Missy's Triggers tab: whole words **off**, lifespan **No limit**.

---

## 3. The inspector, Purge, Clear All (Build 2)

Missy: `/echs trance H 80`. H plants two quickly:
*"Missy, your trigger word is velvet dark"*, *"Missy, you cannot move"*, *"Missy, remember trigger"*, then
*"Missy, your trigger word is amber light"*, *"Missy, you cannot move"*, *"Missy, remember trigger"*.

While Missy is **still under**:
- [ ] Missy opens ECHS settings → **Planted** tab: two rows, each with **Details** and **Purge**, and **Clear All** below, greyed, with *"A hypnosis session is running on you. End it first…"* beside it.
- [ ] Missy: `/echs forgettrigger all` → the same refusal.

H: *"Missy, wake up"*. Then:
- [ ] Missy: `/echs triggers` → `You have 2 triggers planted:`, two lines with H's name and number, **no actions, no words**.
- [ ] Missy: `/echs triggers 1` → `Trigger 1, planted by H (#…) at Blank.` · `Strength now: …` · `Word: hidden. …` · `What it does: you cannot move.`
- [ ] Missy: `/echs triggers 9` → `no trigger 9 — you have 2.`
- [ ] H: *"velvet dark"* → Missy frozen. On **Planted**: that row is red with **HOLDING YOU NOW**, its button says **Holding**; clicking it gives *"…is holding you right now, so it can't be removed…"*. Clear All is greyed: *"A trigger is holding you right now…"*.
- [ ] H: *"Missy, you are released from velvet dark"*. Click **Purge** on it → *"Trigger 1 removed."*
- [ ] **Details** on the remaining one → the full view and a **Back** button.
- [ ] **Clear All** once → turns to **Confirm?**, note turns red, nothing removed. Wait 5 s → back to **Clear All**.
- [ ] Missy: `/echs forgettrigger all` → warning naming `/hypno forgettrigger all confirm`; nothing removed.
- [ ] Missy: `/echs forgettrigger all confirm` → `forgot 1 trigger(s)`.

---

## 4. Instant drop (Build 4)

Missy's *Drop triggers* is still **Off**. Missy: `/echs trance H 80`.

- [ ] H: *"Missy, when you hear moon river, you will drop into trance"* → H: `[trigger] Refused — they have not allowed "Drop triggers" on their Triggers tab.` Missy: *"Something reaches for a door in you that stays shut."* H: *"Missy, forget the trigger"*.

Missy sets *Drop triggers* → **Unlimited** (Triggers tab, scroll down, click the button twice: Off → One time → Unlimited).

- [ ] H: *"Missy, when you hear moon river, you will drop into trance"*, *"Missy, remember trigger"* → SAVED lists `trance-drop` and says `Options: works once` (one-time, because H didn't say otherwise).

H: *"Missy, wake up"*. Then H: *"moon river"*.
- [ ] Missy goes straight under, no prompt: frozen, screen fade, *"You drop straight under. (blank)"*; the room sees the usual trance line; H sees `[trigger] They drop straight into trance (Blank).`
- [ ] H's remote panel on Missy shows Missy hypnotised by H.
- [ ] Missy: `/echs triggers` → `no triggers planted` (used up). H: *"Missy, wake up"* → Missy wakes normally.

Unlimited: Missy: `/echs trance H 80`. H: *"Missy, your trigger word is moon river"*, *"Missy, you will drop into trance"*, *"Missy, it works every time"*, *"Missy, remember trigger"*, *"Missy, wake up"*.
- [ ] H: *"moon river"* → drop. H: *"Missy, wake up"*. H: *"moon river"* → drops again. Still listed. H: *"Missy, wake up"*.
- [ ] Missy sets *Drop triggers* → **Off**. H: *"moon river"* → no trance; H: `[trigger] The drop did not take — they have not allowed drop triggers.`; Missy: *"Something pulls at you, toward trance, and lets go."*

---

## 5. Words to say (Build 5)

Missy: `/echs trance H 80`. *Made to Speak* is still off:
- [ ] H: *"Missy, when you hear silver bell, you will say 'I obey.' three times"* → H: `[trigger] Refused — they have not enabled "Made to Speak" in their settings.` H: *"Missy, forget the trigger"*.

Missy ticks **Made to Speak** (Permissions tab). Repeat the line, then *"Missy, remember trigger"*.
- [ ] SAVED lists `say:3:I obey.`. Missy: `/echs triggers 1` → `What it does: you say "I obey." 3 times.`

H: *"Missy, wake up"*. H: *"silver bell"*.
- [ ] Missy says **I obey.** three times in the room, a second or two apart, capital and full stop intact.
- [ ] *(Gag)* Put a gag on Missy; H: *"silver bell"* → the three lines come out garbled. Remove the gag.

**Silence (the decided behaviour):** wait a minute first — at most six forced lines go out per minute, and the mantra and gag tests just used six. Then Missy sets *Drop triggers* → **Unlimited**. Missy: `/echs trance H 80`. H: *"Missy, your trigger word is star fall"*, *"Missy, you will drop into trance"*, *"Missy, you will say 'Yes.'"*, *"Missy, it works every time"*, *"Missy, remember trigger"*, *"Missy, wake up"*. H: *"star fall"*.
- [ ] Missy drops (and cannot speak normally), **and** "Yes." still appears in the room.

H: *"Missy, wake up"*. Missy: `/echs forgettrigger all` then `/echs forgettrigger all confirm` to clean up.

---

## 5b. Repeated touches and actions on the start line (v0.92.0)

Missy ticks *Made to Act*. Missy: `/echs trance H 80`.
- [ ] H: *"Missy, touch your breasts three times"* → three caresses in the room, a second or two apart.
- [ ] H: *"Missy, when you hear ember glow, touch your breasts three times"*, *"Missy, remember trigger"* → SAVED names **ember glow** with one action `act:Caress:breasts*3`.
- [ ] H: *"Missy, wake up"*, then *"ember glow"* → three caresses.
- [ ] H plants *"Missy, your trigger word is time to kneel"* (no pause) → SAVED names **time to kneel** (unchanged meaning).

---

## 6. Compulsions (Build 6)

Missy: `/echs trance H 80`. H: *"Missy, one minute after you wake, you cannot move"*, *"Missy, remember trigger"*.
- [ ] SAVED ends: `It fires 1 minute after they wake.`
- [ ] Missy: `/echs triggers 1` → `When: 1 minute after you wake.`

H: *"Missy, wake up"*.
- [ ] Missy can move. `/echs triggers 1` → `… — due in 1 minute`.
- [ ] About a minute later (within 5 s of due), Missy is frozen. H: release isn't by name here — Missy: `/echs safeword` to clear.

**Safeword discards:** Missy: `/echs trance H 80`. H: *"Missy, two minutes after you wake, you cannot move"*, *"Missy, remember trigger"*, *"Missy, wake up"*. Missy immediately: `/echs safeword`.
- [ ] `/echs triggers` → `no triggers planted`. Nothing happens two minutes later.

**When H speaks:** Missy: `/echs trance H 80`. H: *"Missy, when I speak, you cannot move"*, *"Missy, remember trigger"*.
- [ ] H talking *while Missy is under* → nothing fires.
- [ ] H: *"Missy, wake up"*, then H says *"hello"* → Missy frozen. Missy: `/echs safeword`.

**When H comes back:** Missy: `/echs trance H 80`. H: *"Missy, when I come back, you cannot move"*, *"Missy, remember trigger"*, *"Missy, wake up"*. H leaves the room and rejoins.
- [ ] Missy sees "H entered." then is frozen. H leaving and rejoining again → nothing (one-time). Missy: `/echs safeword`.

**Old meaning kept:** Missy: `/echs trance H 80`. H: *"Missy, when you wake up you will feel refreshed"*.
- [ ] Missy wakes up, as that line always did. H sees `[trigger] Nothing after that could be kept as a compulsion, so none was set up.`

---

## 6b. "You cannot move" actually holds (v0.90.2)

Missy: `/echs trance H 80`. H: *"Missy, you cannot move"*.
- [ ] Missy: `/echs effects` → `ON  frozen`.
- [ ] Missy, F12 console: `[Player.HasEffect("Freeze"), Player.CanWalk(), ChatRoomCanLeave()]` → `[true, false, false]`.
- [ ] Missy presses **Leave** → refused.
- [ ] Wait a minute (let the other add-ons do whatever they do), then repeat the console line → still `[true, false, false]`.
- [ ] Missy: `/echs safeword` → the console line gives `[false, true, true]`.

## 6c. Held still: pose and place (v0.91.0)

Missy: `/echs trance H 80`. H: *"Missy, kneel"*, then *"Missy, you cannot move"*.
- [ ] Missy's kneel/stand button is **greyed out** (like frog-tie cuffs make it) and does nothing when clicked. The pose menu (arms up) changes nothing; Missy sees *"You try to shift, and your body does not answer…"* once, not repeatedly.
- [ ] H uses BC's own "help her stand" on Missy → Missy snaps back to kneeling on both screens; Missy sees *"Someone tries to move you…"*.
- [ ] H: *"Missy, stand"* → she stands (the hypnotist's spoken commands still work).
- [ ] H puts an item on Missy (e.g. cuffs) → it goes on.
- [ ] *(Map room, if available)* Missy tries to walk → she doesn't move at all.
- [ ] Missy: `/echs safeword` → she can change pose and walk again.
- [ ] **Trance default:** Missy ticks *Trance Defaults → Cannot Move*, then `/echs trance H 80` → her own pose changes are refused. H: *"Missy, walk with me"* → she can move again.

---

## 7. Optional extras

- **Offline clock:** repeat the first compulsion with *"two minutes after you wake"*, log Missy out right after H wakes Missy, back in after three minutes → frozen within seconds of entering a room.
- **Reload while a one-shot holds:** repeat section 1, reload Missy's tab while frozen → still frozen, listed as used up; releasing removes it.
- **Loop guard:** Missy ticks *You can fire your own triggers*; plant *"Missy, your trigger word is echo chamber"*, *"Missy, you will say 'echo chamber'"*; fire it → said once, not forever.

---

**Anything that doesn't match:** note the section and step, and copy the exact lines from both
screens. The in-room lines plus H's `[trigger]` lines are usually enough to find the cause.
