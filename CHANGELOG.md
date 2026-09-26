# What's New in Erotic Chat Hypnosis Suite (ECHS)

What changed in each update, in plain language, newest first.

Your userscript manager installs updates on its own, so you are usually on the newest version
already. To check which one you have, look at the first line ECHS prints in your chat when the
game loads, or at the title of the ECHS settings screen.

ECHS is in alpha. Every change below passes the automated checks, but not every one has been
tried in a live room yet. If something behaves differently from what is written here, please
report it and say which version your chat line shows.

---

## v0.92.7 · 26 September 2026

- **No more stray stars on ECHS lines in the room.** Some players' lines, such as
  "**Valerie rises, without seeming to decide to.*", showed extra asterisks, because another add-on
  on their side sometimes skipped a step. ECHS now checks its own lines before they are sent. The
  player whose lines showed the stars needs this version.

## v0.92.6 · 26 September 2026

- **"You will be frozen" now works** as a way of saying "you cannot move", on its own, in a trigger,
  or after "when you wake". So do *"you'll be frozen"* and *"you will be stuck"*. *"You will not be
  frozen"* is not read as a freeze.

## v0.92.5 · 26 September 2026

- **The hypnotist's pose commands work while you are held still, with WCE's animation engine on.**
  With that WCE setting on, "arms behind your back" and similar commands were refused while you were
  held, and you saw "You try to shift…" over and over. They now go through, and the repeated line is
  gone.
- While held still, you also can no longer change your pose through one route WCE opened up.

## v0.92.4 · 26 September 2026

- **"After you wake" suggestions no longer wake you up on the spot.** Wordings such as *"after you
  wake up, …"*, *"when you awaken, …"*, *"once you are awake, …"* and *"upon waking, …"* were not
  recognised, and because they contain "wake" they woke you instead. They now plant the suggestion
  for after the trance, as intended.
- If the hypnotist says something after "when you wake" that ECHS cannot keep, you now stay in
  trance and the hypnotist is told, instead of being woken. A line that also says "wake up" still
  wakes you.

## v0.92.3 · 26 September 2026

- **The hypnotist can pose you again while you are held still.** Once "you cannot move" really held,
  other add-ons such as WCE and LSCG also saw you as frozen, and refused the hypnotist's spoken pose
  commands. The hypnotist's commands now go through, as intended. A real restraint that stops you
  moving still stops them.

## v0.92.2 · 26 September 2026

- **You can load ECHS from a bookmark,** with no userscript manager needed, which also works on
  phones and tablets. Getting Started on the wiki shows how to set it up. Click the bookmark each
  time you open Bondage Club; it always loads the newest version, and clicking it twice does no
  harm.

## v0.92.1 · 26 September 2026

- **Updates reach you within minutes.** ECHS now loads straight from GitHub, and only uses its
  other source (jsDelivr) if GitHub can't be reached. On 26 September jsDelivr got stuck serving
  an older version for hours after new ones were out. This needs the small ECHS script in your
  userscript manager to update, which it does on its own, or you can update it by hand.

## v0.92.0 · 26 September 2026

- **A hypnotist can make you touch yourself more than once.** *"Missy, touch your breasts three
  times"* (or *"3 times"*, *"twice"*, up to five) repeats it, a second or two apart. It works in a
  trance and inside a trigger. In a trigger the whole repeat uses one of its eight action slots.
- **An action said on the same line as the trigger word is recorded.** *"When you hear ember glow,
  touch your breasts three times"* now plants the word "ember glow" with the touch. Before, the
  whole line became the trigger word. This needs a pause, such as a comma, a dash, "and" or
  "then". Without one, the line is read as before.

## v0.91.3 · 26 September 2026

- **While you are held still, the kneel/stand button is greyed out,** the same as when an item
  such as frog-tie cuffs keeps you from standing. Before, it let you play the struggle game and
  then told the room you had stood up, when you had not.
- **The "your body does not answer" line no longer repeats over and over.** You see it when you
  actually try to move, at most every 30 seconds.

## v0.91.2 · 26 September 2026

- **"You cannot move" now really stops you changing pose,** even with other add-ons such as WCE or
  LSCG running. In v0.91.0 those add-ons could handle the pose change first, so the pose menu and
  the kneel button still worked while you were held.

## v0.91.1 · 26 September 2026

- **Refreshing the game now always loads the newest ECHS.** Before, your browser could keep using
  an older copy for up to a week, even after an update was out, unless you did a hard refresh. This
  needs the small ECHS script your userscript manager installed to update itself. It does that on
  its own, or you can update it by hand from your userscript manager.

## v0.91.0 · 26 September 2026

- **"You cannot move" now holds you still.** You stay in the pose and the place you are in:
  - You can't change your own pose, arms included.
  - You can't leave the room.
  - In a map room, you can't walk.

  Before, it only stopped you leaving the room.
- **The hypnotist can still pose you.** Their spoken commands, such as *"Missy, kneel"*, still move
  you. Nobody else can change your pose while you are held; if someone tries, it is undone and you
  are told.
- **The trance's own *Cannot Move* works the same way.** It holds you until you wake, or until the
  hypnotist lets you walk.
- **Items can still be put on you** while you are held.
- **Your safeword always ends it.**

## v0.90.2 · 25 September 2026

- **A trigger that works once now disappears however it lets go.** After it had fired, releasing
  it by name removed it, but using your safeword or waking up left it behind. It stayed in your
  trigger list, and its word stayed hidden in chat.
- **Only words that are still triggers are hidden.** Once a trigger is used up, has run out of
  time, or has faded away, its word shows in chat again as normal text.
- **"You cannot move" works again, and no longer claims to when it doesn't.** Another add-on could
  quietly wipe the freeze a moment after ECHS put it on, so you were told you had frozen while you
  could still walk and leave the room. ECHS now keeps hold of its own effects: being frozen, the
  wardrobe block, orgasm denial and being leashed. It puts them back if another add-on removes them.
  If one still fails to take hold, the hypnotist is told, and you see a line saying it did not
  settle. Your safeword clears all of them, as always.
- **Commands work with names that have spaces in them.** A command like `/echs induce Missys
  Helper` or `/echs chance Missys Helper` read only the first word of the name. That picked the
  wrong person, or nobody, when two players' names started the same way.

## v0.90.1 · 25 September 2026

- **Typing `/echs` now tells you how to start.** The short menu lists `/echs induce <name>`, which
  starts hypnotizing someone just like the *Attempt Hypnosis* button, and `/echs retry`, which
  tries the same person again.

## v0.90.0 · 25 September 2026

- **Drop triggers.** A hypnotist can plant a trigger that drops you straight into trance when
  it is said, with no prompt and no roll. While planting, they say *"you will drop into
  trance"*, or put it on the same line: *"when you hear ember glow, you will drop into trance"*.
- **They are off unless you turn them on.** New on the Triggers tab (scroll down):
  - **Drop triggers: Off** (the default): no drop can be planted in you or work on you.
  - **One time:** each drop trigger works once, then it is gone.
  - **Unlimited:** it works each time, until it fades, if the hypnotist asked for that. If they
    did not, it still works only once.
- **A drop follows the same rules as an ordinary hypnosis attempt.** It does not work if you are
  already in a trance, if someone else is part-way through hypnotizing you, or if the person
  saying it is not in the room. Whoever says it becomes your hypnotist, and you go as deep as the
  trigger is strong.
- **Waking works as usual**, and the safeword always works.
- If a drop does not work, the person who said it is told why.
- **Triggers can make you speak.** While planting, a hypnotist can say *"you will say 'I obey'"*,
  or *"… three times"* for a mantra. When the trigger fires, you say those exact words aloud in
  the room.
  - This needs the new **Made to Speak** setting on the Permissions tab. It is off unless you turn
    it on.
  - A gag still garbles the words, and your owner's speech rules still apply.
  - A trigger can speak for you even while a trance keeps you from speaking on your own.
  - To stop runaway loops, at most six such lines go out a minute, and a line said this way never
    sets off your own triggers.
- **Compulsions: triggers that wait for something instead of a word.** While you are under, a
  hypnotist can set one up and finish with "remember trigger":
  - *"five minutes after you wake, you will kneel"*
  - *"when Rei comes in, …"*
  - *"when I speak, …"*

  How they work:
  - They never go off while you are in a trance.
  - They work once, unless the hypnotist says they work every time.
  - The time after waking keeps counting while you are logged off.
  - Your safeword clears any that are waiting for you to wake.
  - They show in `/echs triggers` and on the Planted tab like any other trigger, and you can purge
    them the same way.

## v0.89.0 · 25 September 2026

- **You no longer see your trigger words in chat.** When someone says one of your trigger words,
  or plants a new one in you, you see "..." in its place. The trigger still works. This happens
  only on your own screen: everyone else in the room sees the message as it was sent.
- It covers normal chat, whispers and emotes, and the ungarbled copy the game can show beside a
  gagged player's words.
- Your own messages are never changed.
- **Want to see them?** Tick *Show trigger words* on the Triggers tab, and your words show in
  chat, just as they do in the list.

## v0.88.0 · 25 September 2026

- **`/echs triggers` is a short summary now.** It says how many triggers you have, who planted
  each one and how strong it still is. It no longer says what they do.
- **To see what a trigger does, add its number:** `/echs triggers 2`. You have to go out of your
  way to look. The trigger word stays hidden unless you have ticked *Show trigger words*.
- **New settings tab: Planted.** It lists your triggers. **Details** shows what one does, and
  **Purge** removes it. A trigger that is holding you cannot be purged. Use the safeword, or wait
  for it to let go.
- **Clear All, on the Planted tab, removes every trigger at once,** including any you cannot see.
  It asks you to click twice. It will not run while a trigger is holding you or a hypnosis session
  is running, so clear that first.
- **`/echs forgettrigger all` follows the same rules.** It warns you first, and only removes
  everything when you type `/echs forgettrigger all confirm`.

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
