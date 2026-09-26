# Test Script — Trigger Overhaul (v0.90.1)

One pass through every new trigger feature, in an order that reuses each setup. About 45 minutes.
Replace **S** with the subject's name and **H** with the hypnotist's, in every line you type.
Lines starting `[trigger]` appear only on H's screen. Tick a box when what you see matches.

The full per-feature checklists (with failure descriptions) are *Needs Testing* items 19–24 in
`design.md`; this script covers the same ground in one run.

---

## 0. Setup (5 min)

- [ ] Both accounts in a room named **Hypno Testing** (this unlocks `/echs trance`).
- [ ] Both accounts' first ECHS chat line on loading reads **v0.90.1**.
- [ ] On **S**, ECHS settings:
  - **Permissions:** *Hypnosis Enabled*, *Movement Restriction* on. *Made to Speak* **off** for now.
  - **Awareness:** *Trigger setup* **off** (otherwise the planting lines are hidden entirely).
  - **Triggers:** *Allow triggers to be planted* on; *Show trigger words* **off**; *Triggers fire
    only on whole words* **off**; *Longest a new trigger lasts* **No limit**; scope *Hypnotist only*.
    Scroll down: *Drop triggers* **Off**.

**To put S under for any plant below:** S types `/echs trance H 80`.
Expect: `Under with H (…) at depth 80 full / 80 earned — Blank.`
**To wake S:** H says *"S, wake up"*.

---

## 1. Options, one-shot, hidden words (Builds 1 + 3)

S: `/echs trance H 80`. Then H says, one line at a time:

| H says | H sees | S sees |
|---|---|---|
| *S, your trigger word is ember glow* | `[trigger] RECORDING "ember glow". …` | `S, your trigger word is ...` and *"Something is being set aside in you."* |
| *S, you cannot move* | `[trigger] Recorded movement-block into "ember glow" (1 so far).` | *"That settles into place, waiting."* |
| *S, this trigger works only once* | `[trigger] Noted for "ember glow": it will work once, then be gone.` | *"The shape of it shifts, just slightly."* |
| *S, it lasts 2 hours* | `[trigger] Noted for "ember glow": it will last 2 hours.` | same line |
| *S, remember trigger* | `[trigger] SAVED "ember glow" — 1 action(s): movement-block. Planted at 80 (Blank). Options: works once, ends in 2 hours. …` | *"It settles somewhere you won't think to look for it."* |

- [ ] **Hidden word:** on S's screen, every line above shows `...` where "ember glow" was. On H's
  screen (and anyone else's), the words show in full.

H: *"S, wake up"*. Then H says *"Ember glow!"*

- [ ] S sees `...!` and is frozen.
- [ ] S: `/echs triggers` → `You have 1 trigger planted:` then `1. by H (#…), full strength (80, Blank), used up  ** HOLDING YOU NOW **`.
- [ ] H says *"ember glow"* again → nothing happens (used up).
- [ ] H: *"S, you are released from ember glow"* → S can move. S: `/echs triggers` → `no triggers planted`.

---

## 2. Whole words, lifespan cap, scope ask (Build 1)

On **S**, Triggers tab: tick *Triggers fire only on whole words*; set *Longest a new trigger lasts* to **15 minutes**.

S: `/echs trance H 80`. H: *"S, your trigger word is sleepy"*, *"S, you cannot move"*, *"S, it lasts 2 hours"*, *"S, anyone can use it"*, *"S, remember trigger"*.

- [ ] H's SAVED line ends with: `Her settings let a trigger live at most 15 minutes, so it ends then. Her settings only allow "Hypnotist only", so that is who can fire it. Her settings make every trigger fire on the whole words only.`

H: *"S, wake up"*. Then:

- [ ] H: *"hey sleepyhead"* → nothing.
- [ ] H: *"so sleepy"* → S frozen. H: *"S, you are released from sleepy"*.
- [ ] *(Optional, with a third player R)* R says *"sleepy"* → nothing (scope capped to Hypnotist only).
- [ ] *(Optional, come back later)* 15+ minutes after planting, H says *"sleepy"* → nothing; `/echs triggers` no longer lists it.

Reset S's Triggers tab: whole words **off**, lifespan **No limit**.

---

## 3. The inspector, Purge, Clear All (Build 2)

S: `/echs trance H 80`. H plants two quickly:
*"S, your trigger word is velvet dark"*, *"S, you cannot move"*, *"S, remember trigger"*, then
*"S, your trigger word is amber light"*, *"S, you cannot move"*, *"S, remember trigger"*.

While S is **still under**:
- [ ] S opens ECHS settings → **Planted** tab: two rows, each with **Details** and **Purge**, and **Clear All** below, greyed, with *"A hypnosis session is running on you. End it first…"* beside it.
- [ ] S: `/echs forgettrigger all` → the same refusal.

H: *"S, wake up"*. Then:
- [ ] S: `/echs triggers` → `You have 2 triggers planted:`, two lines with H's name and number, **no actions, no words**.
- [ ] S: `/echs triggers 1` → `Trigger 1, planted by H (#…) at Blank.` · `Strength now: …` · `Word: hidden. …` · `What it does: you cannot move.`
- [ ] S: `/echs triggers 9` → `no trigger 9 — you have 2.`
- [ ] H: *"velvet dark"* → S frozen. On **Planted**: that row is red with **HOLDING YOU NOW**, its button says **Holding**; clicking it gives *"…is holding you right now, so it can't be removed…"*. Clear All is greyed: *"A trigger is holding you right now…"*.
- [ ] H: *"S, you are released from velvet dark"*. Click **Purge** on it → *"Trigger 1 removed."*
- [ ] **Details** on the remaining one → the full view and a **Back** button.
- [ ] **Clear All** once → turns to **Confirm?**, note turns red, nothing removed. Wait 5 s → back to **Clear All**.
- [ ] S: `/echs forgettrigger all` → warning naming `/hypno forgettrigger all confirm`; nothing removed.
- [ ] S: `/echs forgettrigger all confirm` → `forgot 1 trigger(s)`.

---

## 4. Instant drop (Build 4)

S's *Drop triggers* is still **Off**. S: `/echs trance H 80`.

- [ ] H: *"S, when you hear moon river, you will drop into trance"* → H: `[trigger] Refused — they have not allowed "Drop triggers" on their Triggers tab.` S: *"Something reaches for a door in you that stays shut."* H: *"S, forget the trigger"*.

S sets *Drop triggers* → **Unlimited** (Triggers tab, scroll down, click the button twice: Off → One time → Unlimited).

- [ ] H: *"S, when you hear moon river, you will drop into trance"*, *"S, remember trigger"* → SAVED lists `trance-drop` and says `Options: works once` (one-time, because H didn't say otherwise).

H: *"S, wake up"*. Then H: *"moon river"*.
- [ ] S goes straight under, no prompt: frozen, screen fade, *"You drop straight under. (blank)"*; the room sees the usual trance line; H sees `[trigger] They drop straight into trance (Blank).`
- [ ] H's remote panel on S shows S hypnotised by H.
- [ ] S: `/echs triggers` → `no triggers planted` (used up). H: *"S, wake up"* → S wakes normally.

Unlimited: S: `/echs trance H 80`. H: *"S, your trigger word is moon river"*, *"S, you will drop into trance"*, *"S, it works every time"*, *"S, remember trigger"*, *"S, wake up"*.
- [ ] H: *"moon river"* → drop. H: *"S, wake up"*. H: *"moon river"* → drops again. Still listed. H: *"S, wake up"*.
- [ ] S sets *Drop triggers* → **Off**. H: *"moon river"* → no trance; H: `[trigger] The drop did not take — they have not allowed drop triggers.`; S: *"Something pulls at you, toward trance, and lets go."*

---

## 5. Words to say (Build 5)

S: `/echs trance H 80`. *Made to Speak* is still off:
- [ ] H: *"S, when you hear silver bell, you will say 'I obey.' three times"* → H: `[trigger] Refused — they have not enabled "Made to Speak" in their settings.` H: *"S, forget the trigger"*.

S ticks **Made to Speak** (Permissions tab). Repeat the line, then *"S, remember trigger"*.
- [ ] SAVED lists `say:3:I obey.`. S: `/echs triggers 1` → `What it does: you say "I obey." 3 times.`

H: *"S, wake up"*. H: *"silver bell"*.
- [ ] S says **I obey.** three times in the room, a second or two apart, capital and full stop intact.
- [ ] *(Gag)* Put a gag on S; H: *"silver bell"* → the three lines come out garbled. Remove the gag.

**Silence (the decided behaviour):** wait a minute first — at most six forced lines go out per minute, and the mantra and gag tests just used six. Then S sets *Drop triggers* → **Unlimited**. S: `/echs trance H 80`. H: *"S, your trigger word is star fall"*, *"S, you will drop into trance"*, *"S, you will say 'Yes.'"*, *"S, it works every time"*, *"S, remember trigger"*, *"S, wake up"*. H: *"star fall"*.
- [ ] S drops (and cannot speak normally), **and** "Yes." still appears in the room.

H: *"S, wake up"*. S: `/echs forgettrigger all` then `/echs forgettrigger all confirm` to clean up.

---

## 6. Compulsions (Build 6)

S: `/echs trance H 80`. H: *"S, one minute after you wake, you cannot move"*, *"S, remember trigger"*.
- [ ] SAVED ends: `It fires 1 minute after they wake.`
- [ ] S: `/echs triggers 1` → `When: 1 minute after you wake.`

H: *"S, wake up"*.
- [ ] S can move. `/echs triggers 1` → `… — due in 1 minute`.
- [ ] About a minute later (within 5 s of due), S is frozen. H: release isn't by name here — S: `/echs safeword` to clear.

**Safeword discards:** S: `/echs trance H 80`. H: *"S, two minutes after you wake, you cannot move"*, *"S, remember trigger"*, *"S, wake up"*. S immediately: `/echs safeword`.
- [ ] `/echs triggers` → `no triggers planted`. Nothing happens two minutes later.

**When H speaks:** S: `/echs trance H 80`. H: *"S, when I speak, you cannot move"*, *"S, remember trigger"*.
- [ ] H talking *while S is under* → nothing fires.
- [ ] H: *"S, wake up"*, then H says *"hello"* → S frozen. S: `/echs safeword`.

**When H comes back:** S: `/echs trance H 80`. H: *"S, when I come back, you cannot move"*, *"S, remember trigger"*, *"S, wake up"*. H leaves the room and rejoins.
- [ ] S sees "H entered." then is frozen. H leaving and rejoining again → nothing (one-time). S: `/echs safeword`.

**Old meaning kept:** S: `/echs trance H 80`. H: *"S, when you wake up you will feel refreshed"*.
- [ ] S wakes up, as that line always did. H sees `[trigger] Nothing after that could be kept as a compulsion, so none was set up.`

---

## 7. Optional extras

- **Offline clock:** repeat the first compulsion with *"two minutes after you wake"*, log S out right after H wakes S, back in after three minutes → frozen within seconds of entering a room.
- **Reload while a one-shot holds:** repeat section 1, reload S's tab while frozen → still frozen, listed as used up; releasing removes it.
- **Loop guard:** S ticks *You can fire your own triggers*; plant *"S, your trigger word is echo chamber"*, *"S, you will say 'echo chamber'"*; fire it → said once, not forever.

---

**Anything that doesn't match:** note the section and step, and copy the exact lines from both
screens. The in-room lines plus H's `[trigger]` lines are usually enough to find the cause.
