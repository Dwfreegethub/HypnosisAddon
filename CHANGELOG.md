# What's New in Erotic Chat Hypnosis Suite (ECHS)

What changed in each update, in plain language, newest first.

Your userscript manager installs updates on its own, so you are usually on the newest version
already. To check which one you have, look at the first line ECHS prints in your chat when the
game loads, or at the title of the ECHS settings screen.

ECHS is in alpha. Every change below passes the automated checks, but not every one has been
tried in a live room yet. If something behaves differently from what is written here, please
report it and say which version your chat line shows.

---

## v0.87.0 · 25 September 2026

- **Hypnotists can shape a trigger while planting it.** Between naming the trigger word and saying
  "remember trigger", the hypnotist can now say things like *"this trigger works only once"*,
  *"it lasts 2 hours"*, *"anyone can use it"*, or *"only when you hear it exactly"*. The hypnotist
  is told each one was noted.
- **Triggers can work once.** A trigger set to work once is used up the moment it goes off, and
  disappears as soon as whatever it did to you lets go.
- **Triggers can have a time limit.** A trigger with a time limit ends when the limit runs out,
  even while you are logged off. Fading over time works just as before, and whichever comes first
  ends it.
- **New on the Triggers tab: "Longest a new trigger lasts".** Choose anything from 15 minutes to a
  day, or no limit (the default). Every trigger planted after that ends within your limit, whatever
  the hypnotist asks for, and they are told. Triggers you already have are not shortened.
- **New on the Triggers tab: "Triggers fire only on whole words".** With it ticked, a trigger such
  as "sleepy" no longer goes off inside "sleepyhead".
- **A hypnotist can ask for who may fire a trigger, but never beyond your own setting.** If they ask
  for more than you allow, your setting wins and they are told.

## v0.86.1 · 25 September 2026

- **`/bot` works again for room bots.** ECHS had taken over the game's `/bot` command, so
  talking to a room's bot answered "join the Hypno Testing room" instead. ECHS now leaves `/bot`
  alone and only uses `/hypno` and `/echs`. Thanks to Bella for reporting it.

## v0.86.0 · 24 September 2026

- **Settings lists now scroll.** The Permissions tab is a single list you can scroll with the mouse
  wheel or the arrows on its right-hand side, instead of two squeezed columns. Every setting has
  room for its full name, and there is space for the settings still to come. The other tabs look
  the same, just in one column.

## v0.85.4 · 24 September 2026

- **The Self-Touch Control setting is back on the Permissions tab.** It was hidden under the
  "Attempts before they must wait" button, so you could not see it or click it. That button now
  sits at the bottom of the right-hand column, with its explanation underneath, and nothing on the
  tab overlaps any more.

## v0.85.3 · 24 September 2026

- **ECHS is quiet in the browser console.** It no longer writes a line for every chat message,
  even with the console set to show everything, which was getting in the way of other add-on
  makers. If you are asked for console output with a bug report, type `/hypno debug` to switch it
  on (and again to switch it off). It is always on in the Hypno Testing room. Real errors still
  show either way.

## v0.85.2 · 24 September 2026

- **A stuttering hypnotist is understood again.** When the hypnotist is aroused, the game makes
  them stutter ("M-Missy, y-you c-cannot move"), and most commands of more than one word stopped
  working. They now land exactly as if they had been said plainly. A gag still works as a gag: a
  gagged hypnotist's muffled words are not understood.

## v0.85.1 · 23 September 2026

- **You can now cancel the setup questions.** Every question in the setup, and the summary at
  the end, has a **Cancel** button. It closes the setup without changing any of your settings, and
  forgets whatever you had ticked. Before, once you started the questions the only way out was to
  finish them. You can run the setup again at any time with the **Setup** button in the settings.

## v0.85.0 · 23 September 2026

- **Many more poses.** With Posture Control ticked, a hypnotist can now have you kneel with your
  knees spread, spread or close your legs, go on all fours or lie down, and put your hands or arms
  behind your back, over your head, or held out to the sides. *"Relax your arms"* puts them back.
  The What to Say tab lists every phrase.
- **Legs and arms are separate.** Kneeling no longer drops your arms, and *"stand"* now only
  stands you up. If your hands were behind your back, they stay there.
- **Poses that can't happen say so.** If your bondage stops you kneeling, the room sees you try and
  fail instead of reading that you knelt.
- **Careful with "surrender" and "relax your arms".** They are pose commands now, so ordinary
  patter like *"surrender to my voice"* will raise your hands.
- All fours and lying down take your arms with them, the same as in the game's own pose menu.

## v0.84.3 · 23 September 2026

- **Locking your settings now locks Import too.** If you ticked "Lock settings while a session is
  on you", pasting a saved backup could still replace every permission in the middle of a session.
  The Import button is now greyed out while the lock holds, and the typed import command refuses
  and says why. Export and Reset still work, and the safeword is untouched.

---

## v0.84.2 · 23 September 2026

- **New players now get the welcome note.** When ECHS has nothing switched on yet, it is meant to
  tell you so the first time you join a room, and point you at the spiral to set it up. If you
  spent more than about twenty seconds on the room list after logging in, which is most people,
  that note never appeared. It now shows the first time you join a room, however long you took.

## v0.84.1 · 23 September 2026

- **"You cannot cum" holds more reliably.** If you were already about to climax when the denial
  landed, the orgasm used to wait and then happen the moment the denial lifted, for example when
  you woke. Now it is cancelled and you are kept right on the edge instead.
- **Denial no longer quietly switches itself off.** Changing your outfit, or another add-on
  resetting your appearance, could remove the denial without anyone being told. It now stays on
  until it is actually lifted.
- **Denial still ends when the trance ends**, unless the hypnotist makes it last past waking.

## v0.84.0 · 23 September 2026

- **A hypnotist can now aim a commanded touch at someone else.** "Missy, kiss Rei" kisses Rei on
  the lips. "Missy, kiss Rei's nipples" or "Missy, lick Rei on the neck" picks the spot. "Missy, kiss
  me" means whoever said it. Every verb that already worked on yourself works this way too.
- **It uses the person's full name or nickname, exactly.** A partial or misspelled name does nothing,
  and if two people share the name, nothing happens and the hypnotist is told why.
- **Kiss, spank and pet have a spot they go to if you don't name one** (lips, bottom, head). Other
  verbs ask you to name a part.
- **Touching anyone other than your hypnotist needs a new setting, "Made to Touch Others".** It is
  off until you turn it on. Being made to touch the hypnotist only needs "Made to Act", as before.
- **The other person's own game settings always decide.** If the game would not let you do it to them
  by clicking, it does not happen. If it doesn't land on the hypnotist, they are told which of their
  own settings stopped it. If it doesn't land on anyone else, the hypnotist is only told it didn't
  land, never why.
- These cannot be put into a trigger yet.

---

## v0.83.2 · 23 September 2026

- **"You cannot cum" really holds now.** In the first test of the last update, a toy was held back
  but touching yourself still got you there. ECHS now stops it itself, whatever tries to finish you,
  and keeps you right at the edge. You and the room are told when it holds you back.
- A direct order to cum still works while you are denied, the same as before.
- **Update, same day:** in testing, being told you cannot cum still did not always stop an orgasm.
  This is not fixed yet and is on the list to come back to.

---

## v0.83.1 · 23 September 2026

- **"You cannot cum" works now.** Being told you could not cum was accepted, but the game did not
  hear it, so a vibrator or a touch could still finish you. It now holds from the moment it is said
  until you are given permission, the trance ends, or you use the safeword.
- **More ways to say it.** "You must not cum", "you are not permitted to cum", "you're forbidden
  from cumming" and "don't you dare cum" all work now.
- **"You cannot cum until I allow you to" denies.** A line like that used to be read as permission,
  because it contains the words "allow you to cum". It now reads as the denial it is.

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
