# What's New in Erotic Chat Hypnosis Suite (ECHS)

What changed in each update, in plain language, newest first.

Your userscript manager installs updates on its own, so you are usually on the newest version
already. To check which one you have, look at the first line ECHS prints in your chat when the
game loads, or at the title of the ECHS settings screen.

ECHS is in alpha. Every change below passes the automated checks, but not every one has been
tried in a live room yet. If something behaves differently from what is written here, please
report it and say which version your chat line shows.

---

## v0.83.0 · 23 September 2026

- **Updates reach you faster.** ECHS now loads its newest version each time you open the game,
  instead of waiting for your userscript manager to check for updates. You don't need to do anything:
  your manager moves you over on its own, and your settings stay as they are.
- **If ECHS can't load, it tells you.** A red note appears in the bottom-right corner. Refreshing the
  page usually fixes it.

---

## v0.82.3 · 22 September 2026

- **Double brackets count as out of character now.** Typing `((brb))` while you were silenced got
  refused as if you had spoken. It now goes through, the same as `(brb)` always did.
- **The trance fog stays on the room.** The white haze used to cover everything on screen,
  including the menus, the settings and the item dialogs. It now covers only the characters on the
  left side of the room.
- **Preset descriptions show in full.** In the setup screen, the Balanced and Extreme descriptions
  were cut off partway, and with some fonts all four were. They now wrap onto a second line instead.
- **The "loaded" note in the corner fades away.** It used to stay for the whole session. It now
  shows for a few seconds after the game loads and then disappears. Your version is still on the
  first line of your chat and in the settings title.
- **Less clutter in the browser console.** Only real problems show at the normal level now.

---

## v0.82.2 · 22 September 2026

- **A trance that runs out on its own now says so, to everyone who should know.** A trance ends by
  itself after thirty minutes. Before, the subject got one short line in brackets and nobody else
  was told anything, so the hypnotist had no way to tell the trance had ended. Now the subject is
  told the trance has worn off and that it was the thirty-minute limit, the room sees them come back
  up (only if *Others see your reactions* is on), and the hypnotist gets a line in their own chat
  saying the trance reached its limit. None of it says anything about how the subject chose to
  respond to the induction.
- **Coming back after your trance ran out while you were away no longer tells you that you are
  still under.** You are told it ran out, and that is all.

---

## v0.82.1 · 22 September 2026

- **Triggers now survive a disconnect or a refresh.** If a trigger was holding you and you dropped,
  refreshed the page or logged back in, it used to let go the moment you returned. Now it comes
  back and finishes the time it had left. Time you spend logged out still counts, so a trigger that
  would have ended while you were gone has ended when you return.
- **Coming back after something wore off no longer leaves you stuck.** If a trigger or something
  carried out of a trance ran out while you were away, it no longer holds you when you log back in,
  and you are told it ran its course.
- As always, the safeword clears everything, and *Release everything if you disconnect* in the
  settings still sends you back clear.

---

## v0.82.0 · 22 September 2026

Fixes to awareness hiding and the clothing illusion.

- **"You may notice…" no longer switches awareness back on by accident.** Ordinary patter like
  *"you may notice a warmth spreading"* used to lift every kind of awareness hiding and end the
  clothing illusion, in the middle of a scene, without telling anyone. To give awareness back now,
  say what comes back: *"you can notice everything again"*.
- **"You won't notice when I strip you" now does what it says.** It used to strip the subject
  instead of hiding the stripping. The same goes for *"…when I undress you"*.
- **Gags, collars, toys and locks now count as bondage** when chat messages are hidden. Before,
  some of them were treated as clothing, so they leaked through when bondage was hidden, and were
  hidden when only clothing should have been. Lock messages now count as bondage as well.
- **The clothing illusion no longer hides your name** above your character.
- **Clearer wording in the settings:** hiding awareness hides the *chat messages* about what is
  done to you; the clothing illusion changes *what you see of your own body*. If a subject should
  neither read about a change nor see it, they need both.

Worth knowing: one line still carries one suggestion. *"Strip, and you won't notice a thing"*
now hides the awareness, where it used to strip. It does not do both.

## v0.81.1 · 22 September 2026

- **Bondage gear no longer keeps self-touch locked.** Wearing gear that freezes you made ECHS
  refuse self-touch as if you were hypnotised, even after a safeword, and even for players who had
  never switched ECHS on. Now only ECHS's own restrictions block self-touch, and only while
  *Hypnosis Enabled* is ticked. If the gear itself stops you, that is the game's own rule, not
  ours.
- **The Europe site works under both spellings**, `bondage-europe.com` and `bondageeurope.com`.
  Before, ECHS never started on the second one.

## v0.81.0 · 22 September 2026

- **ECHS says which version you are on.** When the game loads, a line in your own chat shows the
  name, the version and `/hypno help`. Only you see it. The settings screen title shows the
  version too.

## v0.80.0 · 21 September 2026

- **A hypnotist has to still be in the room.** Before, a hypnotist could start an induction, walk
  out, and the subject would still go under with nobody there. Now:
  - If the hypnotist leaves before the induction lands, it does not happen, and it does not use
    up one of your attempts.
  - If the hypnotist leaves while you are in a trance, you are told, and the trance ends after
    five minutes unless they come back. Triggers and carried suggestions are kept.
  - Waking up always works, whether or not the hypnotist is there.

## v0.79.1 · 21 September 2026

- **Orders to two people on separate lines now work.** A message like *"Missy, kneel"* with
  *"Natalia, stand"* on the next line used to send one order to both of them. Each now gets their
  own, and it works even with no punctuation between the two.

## v0.79.0 · 21 September 2026

- **Two people, two orders, one line.** *"Missy, kneel. Ella, stand."* used to make both of them
  do the same thing. Each now follows only the part addressed to them.
- On purpose, trigger words still listen to the whole line, so if two subjects share a trigger
  phrase, saying it sets off both.

## v0.78.1 · 19 September 2026

- **ECHS now works on the Asia server.** Before, it never started there at all.

## v0.78.0 · 18 September 2026

- **Renamed to Erotic Chat Hypnosis Suite (ECHS)**, so it is not confused with an unrelated
  project called HSC. `/echs` now works everywhere `/hypno` does. Your settings and the install
  link did not change.

## v0.77.0 · 17 September 2026

- **New: follow.** With the new *Follow / Leash* permission switched on (it is off by default), a
  hypnotist can tell an entranced subject *"follow me"*, and the subject is led from room to room
  on the game's own leash. Only that hypnotist can take the leash. *"You can leave"* lets them go.
  The subject needs the game's own leashing allowed, and a room that blocks leashing stops it.

## v0.76.0 · 17 September 2026

- **A missed induction now says so.** The subject, the hypnotist and, if the subject shows their
  reactions, the room all see that it did not take, without saying why.
- **New commands:** `/hypno induce <name>` starts an induction, and `/hypno retry` tries again
  after a miss.

## v0.75.0 · 17 September 2026

- **A practised hypnotist's skill now counts with someone new.** Before, it only helped once the
  pair already trusted each other. Beginners are no worse off than they were.

## v0.74.5 to v0.74.7 · 16 to 17 September 2026

- **ECHS updates itself** if you installed it from the install link.
- **Out-of-character asides still get through while you are silenced.** Text in (parentheses)
  goes through; anything in character is still blocked. To silence asides too, tick *Silence OOC
  too* under Trance Defaults.
- **Trigger phrases can be five letters long**, down from six.

---

The full technical history, with the reasoning behind each change, is in
[`docs/CHANGELOG.md`](docs/CHANGELOG.md).
