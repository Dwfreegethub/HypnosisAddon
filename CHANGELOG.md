# What's New in Erotic Chat Hypnosis Suite (ECHS)

What changed in each update, in plain language, newest first.

Your userscript manager installs updates on its own, so you are usually on the newest version
already. To check which one you have, look at the first line ECHS prints in your chat when the
game loads, or at the title of the ECHS settings screen.

Your version is the number on that line, such as *v1.13.6*. A **D** after it means a dev build
(FUSAM's dev channel). Up to v1.13.5 every version carried "RC" (release candidate) instead. Every
change below passes the automated checks, but not every one has been tried in a live room yet. If something behaves differently from what is written
here, please report it and say which version your chat line shows.

---

## v1.19.3 · 26 November 2026

- **ECHS now uses people's nicknames everywhere,** the way the game does. *"Attempting an induction
  on bea_acct"* now says *Bunny* when that is her nickname, and so do the remote, the room list in
  commands, the trust list, and the name you're shown as when you hypnotize someone. You can still
  type either name in a command.

## v1.19.2 · 26 November 2026

- **A touch picker in the popup.** Suggestions › Touch now starts with a picker: choose who
  (them, you, or anyone else in the room), the touch, then click any body area to type the line.
  Switch it to **phantom** for a touch only they feel. Areas the game won't allow are faded.
- **"That will stay with you"** and its friends are now in the popup's Trance group.

## v1.19.1 · 26 November 2026

- **Starting an induction says one line, not two.** The extra *"Sent. Watch for what happens
  next."* is gone. If ECHS already knows they have hypnosis switched off, that's said on the same
  line.

## v1.19.0 · 26 November 2026

- **Phantom touch.** *"Missy, you feel a hand on your thigh"*, *"you feel lips on your neck"*,
  *"you feel hands all over you"*: you feel a touch nobody is giving you. Only you see it, and it
  does what a real touch would, by your own likes and dislikes in the game's settings.
- **The room only sometimes notices,** with a short reaction like *"Missy shivers, though nobody
  is touching her"*, never saying where. Off if *Others see your reactions* is off.
- Needs Arousal & Orgasm. Numbness stops it. It works in triggers too, and the popup's
  Suggestions tab lists it under Touch.

## v1.18.0 · 26 November 2026

- **Compulsions can wait for clothes coming off or going on.** *"Missy, whenever anyone undresses
  you, you are very aroused"*, *"whenever you take your bra off, …"*, *"whenever anyone puts
  panties on you, …"*: any garment, or the top, skirt, bra, panties, shoes or socks.
- **It doesn't matter who does it,** you included, unless the hypnotist names someone
  (*"whenever Rei takes your top off"*). Wardrobe changes count.
- **"This trigger holds while you are undressed"** keeps it going until that garment goes back
  on, with the arousal coming back meanwhile, like holding while an item is worn.
- The popup's Triggers tab has a line for it under Compulsions.

## v1.17.0 · 26 November 2026

- **Choose who can hypnotize you, one person at a time.** Anyone can now be **Blocked**,
  **Normal** or **Toy**. Blocked: they can never hypnotize you, command you, plant in you, or set
  off anything planted in you, whatever your other settings say. They're only told you aren't open
  to hypnosis. Toy: toy mode for them, even when your toy mode is off. Everyone starts on Normal.
- **Blocking someone who has you under wakes you,** and every trigger they planted in you is
  forgotten. If they hold your keys, you're asked whether to take those back too.
- **The popup's Keys tab is now called Access,** and has the three buttons for everyone in the
  room, plus a folded list of people who aren't here. The settings Stats tab has them on each row,
  and `/echs access` does it by typing. Your keyholders can see the list but can't change it.

## v1.16.44 · 26 November 2026

- **Nothing changes for you.** The developer's own test accounts now see which ECHS version each
  player runs, in small text on the popup's People tab, to spot old builds when helping someone.

## v1.16.43 · 26 November 2026

- **Giving and asking for keys: one button per level.** The popup's Keys tab shows *Give keys:
  minimal · moderate · full* (and *Request keys:* the same) instead of one button that changed
  level each time you clicked it, so a second click no longer types a different level. The level
  someone holds now is highlighted. As before, nothing happens until you press Enter.

## v1.16.42 · 26 November 2026

- **"Induction time" is now "Time to go under (after you answer)"**, on the Inductions tab. It
  starts once you answer, or once the minute to answer runs out. The box says so too: *58s to
  answer. No answer counts as Ignore.* A short setting used to look as if it wasn't working,
  because the box still counted down from 60.
- **The popup's Triggers tab** puts **Triggers in you** first when anything is planted in you, and
  doesn't show it when nothing is. With nobody under you, the planting lines are folded under one
  heading, *Planting triggers (put someone under first)*: click it to read them.
- **While you are under**, the Me tab's buttons say what they do then: **Fight it**, **Let it** and
  **Drift** (they were Fight, Agree and Ignore). They type the same commands as before.

## v1.16.41 · 26 November 2026

Small fixes from a look through ECHS as a newcomer would see it:

- **The induction box** draws every line at the same size. The line about how the hypnotist's
  voice feels to you used to shrink to a third of the others; now it wraps onto two lines.
- **The ECHS popup is bigger by default** (440 × 540), so its tabs fit on one row and the long
  Suggestions and Triggers lists have more room. A size you set yourself by dragging is kept.
- **The popup's Commands tab starts with `/echs induce`**, unless someone is hypnotizing you; then
  it starts with your answers to them, as before.
- **The Planted triggers page on someone's profile** says where to act on them: the Triggers tab in
  the ECHS popup.
- **The Stats tab** no longer shows its *value* and *detail* column headings over an empty list.

## v1.16.40 · 25 November 2026

- **One word for getting rid of a trigger: forget.** It is what you say (*"forget the trigger
  sleepy time"*) and what you type (`/echs forgettrigger`), and now it is on the buttons too. On the
  Planted tab, **Purge** is now **Forget** and **Clear All** is now **Forget All**. In the ECHS popup,
  **remove** is now **forget**, and the hypnotist is told *They forgot "sleepy time"*.
- **The Depth tab uses the Permissions tab's names.** *Cannot reach the wardrobe* is now **Clothing
  Restriction**, *Cannot move* is **Movement Restriction**, *Hears only one voice* is **Hearing**, and
  so on, so you can see they are the same settings.

## v1.16.39 · 25 November 2026

- **Calmer notices for the hypnotist.** They used to read like *[[trigger] RECORDING "sleepy doll"…]*
  and *SAVED … 1 action(s): movement-block. Planted at 80 (Blank)*. Now: *[Recording "sleepy doll": say
  what it does, then "remember trigger"…]* and *[Saved "sleepy doll": you cannot move. Planted at
  Blank depth…]*, with what each part does in words. The doubled bracket is gone from every notice,
  even ones sent by an older ECHS.
- **"can't be hypnotized right now: they aren't open to hypnosis."** No capital in the middle of
  the sentence any more.

## v1.16.38 · 25 November 2026

- **The Stats tab's trust list scrolls**, with a scroll bar and the mouse wheel, instead of Prev and
  Next pages. The heading says how many people are on it.
- **Export, Import and Reset moved to the General tab**, under *Your data*. Under the Extreme lock,
  Export and Reset still work there.

## v1.16.37 · 25 November 2026

The settings screen, spread out and tidied:

- **A new General tab**, last in the column: *Release everything if you disconnect*, *Pulse when a
  command lands*, *Show others that I run ECHS*, where you see other players' spirals, and the
  popup button. They used to sit on Trance Defaults, which is now only about the trance. Only a
  **full** keyholder can change the General tab.
- **Stats is always shown.** The *Advanced* button that hid it is gone.
- **Every choice is a dropdown.** The buttons you clicked to cycle through options (attempts,
  induction time, toy mode, drop triggers, pulse colour and the rest) only went forward. Now you
  pick the one you want.
- **The Triggers tab scrolls as one page.** Its tick boxes used to sit in a small box with the
  fifth one cut off.
- **The Depth tab scrolls** instead of having Prev and Next pages.
- **Tab descriptions are shown in full**, on two lines, instead of being cut off with "…".
- **Rest the pointer on a permission's name** to see what it allows.
- **The help pages read better:** the text uses the whole width, and a page no longer breaks in
  the middle of a sentence.

## v1.16.36 · 25 November 2026

- **Keyholders see what happened.** In the popup's Keys tab, after you click one of their settings,
  the line at the bottom used to say "Asked…" and stay that way. Now it changes to their answer:
  *Done: …*, *Refused: …*, or that their ECHS didn't answer.
- **A faded box says why.** Clicking a setting your keys can't switch on now says which keys it
  needs, instead of sending a request that went unanswered.
- **You're told when you get keys.** When someone gives you keys, changes your level or takes them
  back, a line in chat says so. (They need this version too.)
- **The settings you hold keys to come first** on the Keys tab.

## v1.16.35 · 25 November 2026

- **The popup's People tab shows who can be hypnotized.** Each name now says *open to hypnosis* or
  *not open to hypnosis* (someone who hasn't set ECHS up for it, or chose Hypnotist only). Before,
  everyone looked the same until you tried. Both players need this version for the tag to show.
- **Clearer line after `/echs induce`.** It used to say "They decide how to respond, on their own
  client", even when they refused at once. Now it says "Sent. Watch for what happens next.", or, for
  someone not open to hypnosis, that it will most likely be refused.

## v1.16.34 · 25 November 2026

- **The setup summary shows everything you allow.** On "Ready to apply", the *Allowed* list was one
  line in tiny text, cut off with "…". Now each group has its own line, at the same size as the rest
  of the page, and nothing is cut off.
- **Setup says it worked.** After Apply, or after clicking one of the ready-made setups, a line in
  chat says it was applied.

## v1.16.33 · 25 November 2026

- **A compulsion that can't be set up says so once.** If what comes after *"when anyone ... you,"*
  isn't something ECHS knows, the hypnotist used to get "RECORDING", "Noted" and "Nothing after
  that could be kept", all twice. Now it's one line naming the words and saying what to do instead.
- **"remember trigger" always gets an answer.** Said with nothing being recorded, it and the trigger
  options (*"this trigger works once"*, *"this trigger holds while you wear it"*) now say
  *"Nothing is being recorded right now"* instead of nothing at all.

## v1.16.32 · 25 November 2026

- **New compulsion: "whenever anyone sucks you".** It waits for someone sucking your nipples,
  fingers or toes, the places the game lets anyone suck. *"Sucks your strap-on"* and *"sucks your
  cock"* stay their own compulsion.

## v1.16.31 · 25 November 2026

- **"Suck my cock" works.** *"Missy, suck my cock"* (or *dick*, *penis*) used the game's plain suck,
  which can't reach a penis, so nothing happened. It now uses the same act as *"suck my strap-on"*.
  The compulsion works the same way: *"whenever anyone sucks your cock"*.

## v1.16.30 · 24 November 2026

- **You can tell your triggers apart.** `/echs triggers`, Settings > Planted and the popup now show
  each trigger as one line: who planted it, what sets it off and what it does, for example
  *"Mira: when anyone kisses you → kneel · works once"*. The trigger word stays hidden unless you
  show trigger words. How strong it is moved to the details.
- **New setting: My triggers list** (Triggers tab): *Full*, *Who only* (who planted each and how
  strong, as before) or *Hidden* (only how many, and no Planted tab), if you would rather not know.

## v1.16.29 · 24 November 2026

- **The remote no longer sits on "Checking…".** If someone runs ECHS but their session status never
  arrives, the remote says so after a few seconds and offers **Check again**.
- **The popup steps aside for the induction box.** While the Agree / Ignore / Fight box is up, the
  ECHS window folds to its top bar and Safeword button and moves up out of the way. It opens again
  once you answer.
- **The Me tab during an induction** shows what you chose, with the other two answers to change it,
  instead of a *Wake* button that did nothing there. After a miss it says *missed (1 of 2)*.
- **You can change your answer between attempts.** *"/echs fight"* after a miss used to say nobody
  was attempting; now it counts for their next try.
- **"Typed. Press Enter…" goes away** once you send the line.

## v1.16.28 · 24 November 2026

- **"You feel nothing when I touch you" numbs her again.** That line started setting up a *"when I
  touch you"* trigger instead, and the hypnotist's next suggestions went into it rather than
  happening. A *"when …"* that comes after a suggestion now belongs to that suggestion. To set up a
  trigger, say the *"when …"* part first: *"Sena, when I touch you, kneel"*.

## v1.16.27 · 24 November 2026

- **Finishing a compulsion from the popup.** Clicking *when anyone kisses you* (or *whenever anyone
  gags you*) on the Triggers tab now takes you to Suggestions, and a click there **adds** what they
  will do to that line (*"Sena, when anyone kisses you, kneel"*) instead of replacing it. What a
  trigger can't hold is greyed and says why: the trance moves (sink deeper, wake up) and the commands
  aimed at you (kiss me, fuck me). Press Enter, then *remember trigger* keeps it.

## v1.16.26 · 24 November 2026

- **The Extreme warning says how long again.** Setup's Extreme warning (and a keyholder's request to
  start Extreme for you) said the lock lasts *"undefined days"*. It now says 7 days, then 30 days at
  a time, as it should. This is a fix on its own: the new features on the dev build (v1.16.8 and up)
  come to stable with the next full release.

## v1.16.25 · 24 November 2026

- **The Extreme warning says how long again.** Setup's Extreme warning (and a keyholder's request to
  start Extreme for you) said the lock lasts *"undefined days"*. It now says 7 days, then 30 days at
  a time, as it should.

## v1.16.24 · 23 November 2026

- **"Fuck me" uses the toy she has on.** With nothing named, a dildo gag goes first, then a strap-on,
  then a dildo in hand; a penis only when you say *"with your cock"* (or it's all there is).

## v1.16.23 · 23 November 2026

- **"Fuck me" in the popup, and with a dildo.** The *Suggestions* tab now has *"fuck me"* (and *hard*,
  *my ass*, *my mouth*) and *"suck my strap-on"*. She can use a strap-on, a dildo in her hand (hands
  free) or a dildo gag; say which with *"fuck me with your dildo"*, *"with your strap-on"* or *"with
  your gag"*. If she hasn't got the one you name, you're told.

## v1.16.22 · 23 November 2026

- **The item compulsions are easier to find in the popup.** They have their own line in *Triggers*
  → *Compulsions*: *"whenever anyone puts an item on you, …"*, which opens the list (gags you,
  ties your arms, locks you in chastity and the rest). And the lists open to read even when
  nobody is under you.

## v1.16.21 · 23 November 2026

- **Held item compulsions slow down.** While the item stays on, arousal comes back after 2, 2 and 2
  minutes, then 5, then every 10; an orgasm after 5, then 10, then every 20. Before, both came every
  2 minutes, which got spammy.

## v1.16.20 · 23 November 2026

- **Item compulsions can hold while the item is on.** Add *"Missy, this trigger holds while you
  wear it"* when planting one: *"whenever anyone gags you, you are very aroused"* then holds for as
  long as the gag stays on, keeps her aroused (arousal and orgasm repeat every 2 minutes), and lets
  go when it comes off. The release words and the safeword still end it any time. It's in the popup.

## v1.16.19 · 23 November 2026

- **Chastity, plugs and vibes.** Three more things a compulsion can wait for: *"whenever anyone
  locks you in chastity, …"* (any chastity item: belt, cage, bra, shield), *"whenever anyone plugs
  you, …"* (a butt plug or tail) and *"whenever anyone puts a vibrator in you, …"* (a vibe, egg or
  dildo). All three are in the popup's list.

## v1.16.18 · 23 November 2026

- **"Suck my strap-on."** *"Missy, suck my strap-on"* (or *"suck on Rei's strap-on"*) has her suck
  the strap-on you're wearing; she needs her mouth free. And a compulsion can wait for it: *"Missy,
  whenever anyone sucks your strap-on, …"*, also in the popup's list.

## v1.16.17 · 23 November 2026

- **"Missy, fuck me."** With *Made to Act* she uses her strap-on on you: slowly, in the pussy, unless
  you say *hard* (or *rough*, *fast*) or name her ass or mouth. *"Fuck Rei"* works too with *Made to
  Touch Others*. Without a strap-on on, it's refused and you're told why. Being tied up doesn't stop
  a worn strap-on.
- **"rides you" is gone again.** The game has no activity for it, so it could never go off.

## v1.16.16 · 23 November 2026

- **"When anyone fucks you" and "rides you".** *"Missy, whenever anyone fucks you, you are very
  aroused"* waits for someone penetrating her with a strap-on or anything else the game allows
  (pussy, butt or mouth). It's in the popup's list.

## v1.16.15 · 23 November 2026

- **Compulsions that wait for an item.** *"Missy, whenever anyone gags you, you are very aroused"*
  now works, as do *blindfolds you*, *collars you*, *ties your arms*, *ties your legs*, *ties you up*
  (any restraint) and *locks something on you*. They're in the popup's list too. It counts items
  put on through the game's item menu; clothing doesn't count yet.

## v1.16.14 · 23 November 2026

- **The Stats tab's "last" date is right now.** Each person shows the date they last interacted with
  you directly: a whisper, a line with your name in it, or an induction. Someone only chatting in the
  same room no longer counts, and trust fading no longer resets everyone to "just now". People you
  haven't interacted with since this update show a dash until next time.

## v1.16.13 · 22 November 2026

- **Reactions: a trigger word that switches something on.** Plant *"sensitive"* with a
  *whenever* line in it: *"Missy, your trigger word is sensitive"*, *"Missy, whenever anyone gropes
  you, come for me"*, *"Missy, remember trigger"*. Groping does nothing until someone says
  "sensitive"; then every grope makes her come, until the word lets go (her trigger duration, a
  release, or the safeword). One word can carry several reactions. On the popup it's in *Shape it*.

## v1.16.12 · 22 November 2026

- **"Whenever…"** *"Missy, whenever anyone gropes you, come for me"* now plants a compulsion that
  works every time. So does *"every time Rei comes in, …"*. Before, ECHS didn't know "whenever",
  so she came on the spot and nothing was planted.
- **All on one line.** *"Missy, when anyone gropes you, come for me, this trigger works every
  time"* now works, the same as saying the last part on its own line.

## v1.16.11 · 22 November 2026

- **Instant actions.** Making someone cum, undressing them or setting their arousal is over the
  moment it lands, so a trigger that only does those no longer "holds" them for minutes after.
  A one-time one is gone at once, `/echs forgettrigger` works on it straight away, and there is no
  "loosens on its own" message long after the fact. A trigger that also does something lasting
  (*you cannot move*) still holds for its time. The popup and help mark the instant lines.
  Thanks to the player who suggested it.

## v1.16.10 · 22 November 2026

- **Releasing a compulsion.** *"Missy, you are released from the compulsion"* lets go of a
  compulsion holding her, as *"you are released from sleepy time"* does for a word. *"Missy,
  forget your compulsions"* removes your compulsions but keeps your trigger words. The one who
  planted it can release it, and so can whoever set it off (the one who groped you, say) while
  it holds you. Only the one who planted it can remove it.
- On the popup, a compulsion you planted now has **release** and **remove** buttons, which type
  those lines for you.

## v1.16.9 · 22 November 2026

- **"When anyone kisses you…"** A compulsion can now wait for something done to you: *"Missy,
  when anyone kisses you, you will blush"*, or *"when Rei spanks you, …"*, or *"when I tickle
  you, …"*. It can wait for a kiss, touch, hug, pet, spank, slap, tickle, pinch, grope, lick, bite
  or kick, your hair being pulled, or anything at all. The full list is on the wiki's Triggers page.
- **The popup's Triggers tab** now shows the planting lines, compulsions included, even when
  nobody is under you (greyed, so you can read them first). It also has a *works every time* line,
  and *when anyone … you* opens the list of what they can do: click one and it types the start.

## v1.16.8 · 22 November 2026

- **"Using ECHS since".** Your Stats tab now shows the date you started using ECHS, next to your
  experience. It counts from your last reset, and only you see it. If you had ECHS already, it
  starts from the first time you look.

## v1.16.7 · 22 November 2026

- The note ECHS shows when this update reaches you, summing up v1.15.0 to v1.16.6 below.

## v1.16.6 · 22 November 2026

- **A hypnotist can't keep inducing while being hypnotized.** If someone starts hypnotizing a
  person who is still in the middle of hypnotizing you, their induction on you ends, and you're
  told. It doesn't use up one of their tries. A trance that has already taken hold carries on as
  before. Both of you need this version or newer.

## v1.16.5 · 22 November 2026

- **More ways to move.** Under *Made to Act*, a hypnotist can now say *"wiggle your hips"*,
  *"shake your breasts"*, *"sway your hips"*, *"nod"*, or *"struggle"* (only while tied up). Each is
  the game's own action, done by the one under, and can be repeated or put in a trigger.
- **Sounds through a gag.** While gagged: *"moan"*, *"whimper"*, *"groan"*, *"giggle"*, *"growl"*
  and *"mumble"*.
- **More to do to someone else:** *"hug Rei"*, *"nuzzle me"*, *"kick Rei"*, *"grab Rei by the
  collar"*, *"cover my mouth"* (or *"hand gag Rei"*) and *"peck my hand"*. The same rules as
  *"kiss Rei"*: anyone but the hypnotist also needs *Made to Touch Others*, and their own game
  settings decide.
- **More faces:** *"frown"*, *"look sad"*, *"wince"*, *"raise your eyebrows"*, *"raise an
  eyebrow"*, *"furrow your brow"*, *"drool"* and *"cry"*. *"Dry your eyes"* takes the tears and
  drool away, and *"relax your face"* everything.
- All of these are on the ECHS popup's suggestion lists too.

## v1.16.4 · 22 November 2026

- **Anyone with your full keys can ask to take back another keyholder's keys.** You get a popup and
  nothing changes unless you accept. Your BC owner (with your full keys) still doesn't need to ask.

## v1.16.3 · 22 November 2026

- **Extreme from a keyholder.** Someone with your full keys can ask to put you under Extreme, or to
  extend it by 30 days. You see the whole Extreme warning in a popup, and nothing happens unless you
  accept.
- **The keys lock.** Locks who holds your keys: you can't give or take back keys while it holds. Your
  BC owner, if they hold your full keys, can set it without asking; anyone else with your full keys
  has to ask. Any full keyholder can lift it, and it ends on its own after 7 days without whoever set
  it in a room with you.
- **Your owner manages your keyholders.** Your BC owner, if they hold your full keys, can take
  anyone else's keys back without asking. You're told each time.

## v1.16.2 · 22 November 2026

- **Full keys reach further.** Someone holding your **full** keys can now also set your Triggers tab
  choices (who else can fire your triggers, how long they last, how fast they fade, drop triggers),
  how fast trust fades, and your Depth tab (how deep each thing needs you, and the choices under
  it). Minimal and moderate keys can't. You're told every change, as before.
- On their side, the Keys tab shows these under **Triggers**, **Stats** and **Depth**; Depth and
  Stats start folded. Numbers change with step buttons.
- **Full keys see what is planted in you**, and can remove a trigger only if you trust them more
  than whoever planted it. Never one you planted yourself, never one holding you, never under your
  Extreme lock. The word is shown only to whoever planted it, unless you show yourself your words.
- **The keyholder lock.** Someone with your full keys can ask to lock your settings; you get a popup
  and nothing locks unless you accept. While it holds, only your keyholders can change your settings,
  and any of your full keyholders can unlock them. It ends on its own if the one who locked it hasn't
  been in a room with you for 7 days. The safeword, switching ECHS off and `/echs reset confirm`
  always work.

## v1.16.1 · 22 November 2026

- **Ask for someone's keys.** On the Keys tab, **Request keys** (or `/echs keyholder request <name>
  <level>`) asks them for their keys. They get a popup to accept or decline; no answer in 30 seconds
  is a no. Nothing changes unless they accept, and the same person can ask again only after a few
  minutes. Both of you need this version or newer.

## v1.16.0 · 22 November 2026

- **Three levels of keys.** *take* and *grant* are now **minimal**, **moderate** and **full**:
  - **minimal**: they can only switch things off.
  - **moderate**: they can also shape your trance: your Trance Defaults and Awareness, the screen
    effect and eyes, induction time and how deep "sink deeper" goes. They still can't open new
    permissions, triggers, toy mode or auto-answer.
  - **full**: everything they can reach.
- **Your keyholders moved over:** *take* became **minimal** and *grant* became **moderate**. If you
  want someone to have full keys, give them again.
- **New buttons on the Keys tab.** One **Give keys** button per person; click it again for the next
  level. **Take keys back** removes someone. `/echs keyholder add <name> full` (or `minimal`,
  `moderate`) does the same by typing.

## v1.15.3 · 22 November 2026

- **Trigger words in OOC show as typed.** A trigger never fires from something said in brackets,
  and now it isn't hidden as "..." there either. Said in character, it is still hidden as before.

## v1.15.2 · 22 November 2026

- **"Days ago" on your trust list is back to how it was.** The v1.15.1 change didn't work as
  intended, so it has been taken out. The clearer directions to your settings stay.

## v1.15.1 · 22 November 2026

- **"Days ago" on your trust list is right now.** On the Stats tab, each person's "3d ago" is when
  you last did something together. It used to jump back to "just now" whenever trust slowly faded.
- **Clearer directions to your settings.** The first-time notice and the wiki now say to click the
  round spiral button in the room and then the gear (or Preferences > Extensions > ECHS Hypnosis).
  They used to point at a spiral on your own profile, which isn't there.

## v1.15.0 · 21 November 2026

- **ECHS tells you when it updates.** The first time you load a new version, a beep pops up with a
  short note on what changed; click it to open the full list. The same note stays in your chat with
  a *What's new* link, so you can read it later. Only you see it, and only once per version.

## v1.14.1 · 21 November 2026

- **Keyholders can change your spiral and your induction settings too.** On the **Keys** tab, a
  keyholder now also sees everything on your **Inductions** tab (attempts, induction time, your
  automatic answer, when you're away, toy mode and who it's for, how deep "sink deeper" goes) and
  your Trance Defaults choices: the screen effect (none, grey fade or the spiral), your eyes and eye
  colour while under, and the pulse colour. *take* can only switch them off (None, Unchanged, Ask
  me, Refuse, toy mode Off, Never deeper); *grant* can pick any of them. You're told every change,
  as before.

## v1.14.0 · 21 November 2026

- **Keyholders.** You can now let someone change your ECHS settings for you: anyone you name with
  `/echs keyholder add <name>`, and your BC owner if you allow it. *take* lets them only switch
  things off; *grant* lets them switch things on too. They reach the Permissions, Trance Defaults,
  Awareness and Triggers tick boxes, from the popup's new **Keys** tab, while you're in a room
  together. It works even under your Extreme lock, and a keyholder can end the lock for you. You are
  told every change, and nobody holds your keys until you choose.

## v1.13.6 · 21 November 2026

- **No more "RC".** Your version now shows as just the number, such as *v1.13.6*. If you use FUSAM's
  dev channel, it shows a **D** after it, so you can tell a dev build apart at a glance.

## v1.13.5 RC · 21 November 2026

- **"Take a sip."** A hypnotist can now say *"Missy, take a sip"* (or *"have a drink"*, *"sip your
  drink"*, *"drink up"*) and she sips the drink in her hand. It needs **Made to Act**, and a glass or
  mug in her hand with her hands and mouth free. A crafted ECHS drink works as usual. It's also on
  the popup's Touch list.

## v1.13.4 RC · 21 November 2026

- **A gear on the ECHS popup** takes you straight to the ECHS settings.

## v1.13.3 RC · 21 November 2026

- **Less spam while denied.** Held at the edge by *"you cannot cum"* while wearing something that
  keeps arousal up, you and the room were told every minute. Now the room is told once, and you are
  told again less and less often: after 2 minutes, then 4, 8, and at most every 15 minutes. Five
  quiet minutes and it starts over.

## v1.13.2 RC · 21 November 2026

- **The ECHS popup can be resized.** Drag its bottom-right corner; it remembers the size, as it does
  where you put it. Double-click its title bar to put it back to the normal size.

## v1.13.1 RC · 21 November 2026

- **"When you wake" triggers go off after any trance.** A trigger such as *"when you open your
  eyes, take something off"* only went off after a trance with whoever planted it, so it seemed
  not to work when someone else had you under. It now goes off whenever you wake from a trance,
  whoever put you under. Your safeword still clears it.

## v1.13.0 RC · 21 November 2026

- **The ECHS popup.** In a chat room, a round spiral button on the left opens a small window you can
  drag anywhere. It types into your chat box for you, so you don't have to remember the wording;
  nothing is sent until you press Enter.
  - **People:** everyone in the room running ECHS. Click a name to start an induction.
  - **Suggestions,** while someone is under you: everything you can say, in groups, typed with their
    name. What they haven't allowed is faded, and what needs them deeper is marked.
  - **Me,** while someone is hypnotizing you: Agree, Ignore or Fight, and Wake, Stay or Fight while
    you are under, with your depth.
  - **Triggers:** how to plant and shape one, the ones you planted (say it, release, remove), and
    the ones in you.
  - **Commands:** every `/echs` command.
  - The red **Safeword** button at the bottom always works, at once.
  - It's on for everyone; turn it off under Trance Defaults, **ECHS popup in rooms**. Unticking
    **Show others that I run ECHS** keeps you off other players' People list.

## v1.12.9 RC · 19 November 2026

- **Less traffic to the game server.** When ECHS saved your settings several times in a row (a
  trigger going off, a face command, old triggers being cleared out), it sent each save to the
  server separately. They now go as one, so your chat isn't held up behind them. Nothing about
  what is saved has changed.

## v1.12.8 RC · 19 November 2026

- **A long trust list no longer jams the game.** With trust set to fade and many people on your
  list, opening the Stats tab sent the game one save for every person at once. The game sends only
  a few messages a second, so your chat and clicks were stuck behind them, sometimes for minutes.
  It is now one save, and the [x] to forget someone works straight away again.

## v1.12.7 RC · 19 November 2026

- **The spiral is back on other players' profiles.** The game's latest update redrew the profile
  screen, which hid the ECHS spiral and made its panel open behind the profile. The spiral now sits
  with the game's own buttons on the profile, and the panel opens in front.

## v1.12.6 RC · 15 November 2026

- **The in-game help is up to date.** It told hypnotists to click an "H" icon; the icon is a spiral.
  It also now says a suggestion takes hold 2 to 5 seconds after it is said, how to let someone touch
  themselves again, who a trigger can be opened to (owner, lovers, friends), and that the
  hypnotist's roleplay during the induction counts toward the roll.

## v1.12.5 RC · 14 November 2026

- **Belly and all fours are really held now.** With *"no one can move you"*, another player could
  still put you on all fours or on your belly. The game delivers those moves in a way ECHS wasn't
  watching. It is now.
- **No more repeating messages.** After someone stopped trying to move you, *"does not budge"*
  could keep appearing every few seconds. The same move is now announced once; trying it again is
  still stopped, just without the message.

## v1.12.4 RC · 14 November 2026

- **Belly and all fours are held too.** Some ways of moving you send your pose along with your
  whole outfit instead of on its own, and those slipped past *"no one can move you"* (and your own
  hold, for moves of your own). They're caught now.

## v1.12.3 RC · 14 November 2026

- **Undoes 1.12.2.** With *"no one can move you"*, some moves were being stopped without a word,
  and the person moving you could see you in the new pose on their screen. Back to how 1.12.1
  behaved: every attempt is stopped, the room is told you didn't budge, and their screen is put
  right.

## v1.12.2 RC · 14 November 2026

- **"Does not budge" only when someone really tried.** While you were held with *"no one can move
  you"*, the room could be told you didn't budge when nobody had touched you, because another
  add-on on your own game was nudging your pose. Those nudges are still stopped, just quietly now.

## v1.12.1 RC · 14 November 2026

- **When "no one can move you" stops someone, the room is told.** Another player's add-on can
  announce the move (*"Biker raises Missy's hands"*) before it reaches you, so the room thought it
  worked. Now your character answers with *"Missy does not budge: her body stays exactly where it
  was."*, and everyone's screen is put back to your real pose. Turn off *Others See Your
  Reactions* if you'd rather the room heard nothing.

## v1.12.0 RC · 14 November 2026

- **"You cannot move" no longer stops other people adjusting you.** While you're held, you still
  can't change your own pose, leave or walk, but anyone else can now move you as usual. Before,
  their change was undone and you were told *you* had tried to move.
- **New: "no one can move you."** The hypnotist can hold you harder with *"no one can move you"*,
  *"you cannot be moved"*, *"you are frozen solid"* or *"you are a statue"*. Then nobody else can
  change your pose either, and you're told *"Someone tries to move you…"* when they try. The
  hypnotist's own pose commands still move you, and *"you can move again"* ends either hold.
- **New trance setting: "…and no one else can move you either."** On the Trance Defaults tab, under
  Cannot Move. Tick it if you want the trance itself to hold you the harder way. It starts off.

## v1.11.1 RC · 14 November 2026

- **Sight commands work again.** *"Your vision is dimming"*, *"you can barely see"* and
  *"you cannot see"* were heard but did nothing, and the hypnotist was told they did not land.
  They now darken your screen as they should, still within your own Sensory Deprivation setting.

## v1.11.0 RC · 11 November 2026

- **The hypnotist can now change your face.** With Posture Control ticked, while you are under:
  *"close your eyes"*, *"open your mouth"*, *"stick out your tongue"*, *"let your tongue hang out"*,
  *"bite your lip"*, *"smile"*, *"grin"*, *"smirk"*, *"pout"*, *"moan for me"*, *"blush"*,
  *"eyes wide"*, *"your eyes glaze over"* and *"hearts in your eyes"*. Everyone in the room sees it.
- **It lasts until it is let go or you wake.** *"Relax your face"* puts all of it back,
  *"open your eyes"* and *"close your mouth"* put back just that part, and waking or your safeword
  puts everything back. If you have spiral eyes on, opening your eyes brings the spirals back.
- **A trigger can change your face too,** like any other suggestion.

## v1.10.2 RC · 11 November 2026

- **Spirals now hide every eye shadow, Wings included.** Some eye shadows, like Wings, have a line
  the game will not fade out, so they stayed on. Those are now taken off while you are under and put
  back exactly as they were when you wake, crafted name and all.

## v1.10.1 RC · 11 November 2026

- **Fewer eye choices, and spirals look cleaner.** *Eyes while under* is now Dazed, Spirals or
  Hearts (Daydream and the second hearts are gone; if you had Pink hearts you now have Hearts).
  With Spirals, your eye shadow is hidden while you are under and comes back when you wake.

## v1.10.0 RC · 8 November 2026

- **Your eyes can change when you go under.** Two new choices on the Trance Defaults tab, both off
  unless you pick them: **Eyes while under** (Dazed, Spirals, Daydream, Hearts or Pink hearts) and
  **Eye colour while under** (Grey, Pink, Purple or Blue). Everyone in the room sees it, and your
  eyes go back to how they were when you wake, even if the game closed while you were under.

## v1.9.1 RC · 8 November 2026

- **Screen effect is now one choice.** On the Trance Defaults tab, *Screen Fade* and the spiral tick
  box are replaced by a **Screen effect** dropdown: *None*, *Grey fade*, or the spiral at *light*,
  *medium* or *heavy*. If you had ticked the spiral, you now have the medium one.
- **The spiral is lighter to start with, and flashes.** Light and medium are paler than before
  (heavy is the old strength). A command now gives the spiral a quick flash instead of a slow swell.

## v1.9.0 RC · 8 November 2026

- **A spiral instead of the grey fade.** Tick *Screen Fade as a turning spiral* on the Trance
  Defaults tab and, while you are under, a spiral in your pulse colour turns slowly over the room
  instead of the grey wash. When a command lands it swells brighter for a moment, in place of the
  glow at the edge of the screen. It is off unless you turn it on, and only you see it.

## v1.8.0 RC · 8 November 2026

- **Friends can fire your triggers.** A new choice, *Owner, Lovers and friends*, sits between Lovers
  and whitelist in who can fire your triggers, and in who toy mode is for. It reads your BC friend
  list. The whitelist choice and the ones above it now include your friends too.
- **If you had chosen whitelist, check it.** So that nobody's choice quietly grows, anyone set to
  whitelist (for triggers or for toy mode) has been moved to the new friends choice. Pick whitelist
  again on the Triggers or Inductions tab if you want it back.
- A hypnotist planting a trigger can now say *"your friends can use it"*.

## v1.7.3 RC · 8 November 2026

- **A smaller label on the ECHS spiral.** Hovering it now shows just the ECHS version, in small
  text, without the person's name, since the spiral is already over them.

## v1.7.2 RC · 8 November 2026

- **BCT users: the ECHS spiral follows BCT's "icons only on hover" setting.** With it on, the spiral
  shows only while your mouse is over the top of a character, like every other icon there.
  `/echs icons` now says so when that is why you can't see it.

## v1.7.1 RC · 8 November 2026

- **If the ECHS spiral doesn't show, `/echs icons` says why.** It reports whether the spiral is being
  drawn on your screen, your two icon settings, and which players in the room ECHS has heard from.

## v1.7.0 RC · 8 November 2026

- **See who else runs ECHS.** In a room, a small spiral now shows over each player who runs ECHS.
  Hover it to see their name and ECHS version. It sits in a gap between Bondage Club's own icons
  and other add-ons' icons; Bondage Club's hide-icons button hides it too.
- **Your choice, both ways.** On the Trance Defaults tab, **Show others that I run ECHS** (on unless
  you untick it) decides whether others see yours, and **ECHS icons over others** decides where you
  see theirs: in the top row, below it on the left if another add-on's icon covers it, or not at all.

## v1.6.0 RC · 8 November 2026

- **Choose how long an induction takes.** The Inductions tab has a new **Induction time** setting:
  60 seconds (the usual), 45, 30, 20 or 10. It is how long anyone gets to put you under before it
  lands or misses, and the hypnotist's countdown shows your time.
- **Toy mode now takes an induction too.** Instead of dropping you at once, it runs your induction
  time first, so to the hypnotist and the room it looks like any other induction. Then you go under
  with no roll, as before. The safeword stops it at any point.

## v1.5.2 RC · 8 November 2026

- **Commands said together take hold one at a time.** Say two or three commands in a row and each
  now waits its own 2 to 5 seconds after the one before it lands, instead of landing almost on top
  of it.
- **The planted list no longer says someone "answered just now" when they have left.** Ask about
  someone who isn't in the room and the list is marked as the last one you were given, with its date.

## v1.5.1 RC · 8 November 2026

- **A pose your bondage blocks no longer happens behind your back.** If you were told to kneel (or
  to take any other pose) while tied in something that stops it, the room could be told you knelt
  when you hadn't, and then you would drop to your knees the moment the restraint came off. Now the
  command simply doesn't land. A trigger that goes off by itself tells only you, once; a command
  someone says aloud shows the room you trying and failing.

## v1.5.0 RC · 5 November 2026

- **Search your trust list.** The Stats tab now has a **Find** box. Type part of someone's nickname,
  account name or member number and the list narrows as you type. Someone you last saw before this
  update can only be found by the one name saved for them, until you next see them.
- **Remove someone from the list with a click.** Each person on the Stats tab now has an **[x]**. It
  asks first, and a second click deletes their trust for good.

## v1.4.4 RC · 5 November 2026

- **Refusals only tell you to go deeper when that would help.** "Take them deeper first" now shows
  only if the subject has opened that feature to arousal, where going deeper counts. For anything
  that goes by earned depth, it no longer sends you off to try "sink deeper".

## v1.4.3 RC · 5 November 2026

- **Clearer refusal for triggers, carried suggestions and the clothing illusion.** These go by how
  deep someone's trust has earned, not how deep they are now. When the two differ, the refusal now
  shows both, for example *"at 90 [Blank] but only 44 [Entranced] earned"*.

## v1.4.2 RC · 5 November 2026

- **The command pulse is slower**, about two seconds from start to finish.
- **Pick your own pulse colour.** On the Trance Defaults tab, **Pulse colour** now has a **Custom**
  choice, with a box for a hex colour code like `#FF69B4`, the kind the game's colour picker uses.

## v1.4.1 RC · 5 November 2026

- **The command pulse is easy to see now.** It was too faint to notice. It's now a wide glow around
  the room view with a light wash of colour across it, and it lasts a little longer. You can still
  change its colour or turn it off on the Trance Defaults tab.

## v1.4.0 RC · 5 November 2026

The Extreme setup and lock are stronger. Your safeword works as always, and anyone already on an
Extreme lock keeps the settings they chose; only the lock's own rules below change for them.

- **Under the Extreme lock, triggers can only be added.** New ones can still be planted, but the
  hypnotist who planted one can no longer remove it until the lock ends, and they are told why when
  they try. They can still release one that is holding you.
- **Trances last longer under the lock.** You are asked whether to stay under after 60 minutes
  instead of 30, and staying gives another 60. If you don't answer, you still wake.
- **Carried suggestions stay under the lock.** `/echs carry drop` is refused.
- **The numbers are hidden under the lock.** Trust and experience leave the Stats tab,
  `/echs chance`, `/echs skill` and `/echs gates` are refused, and `/echs session` says you are under
  without saying how deep.
- **You can't pose yourself out of it.** `/echs kneel` and `/echs stand` are refused under the lock.
- **Choosing the Extreme setup now also** lets anyone not on your blacklist put you straight under,
  counts drinks and cigarettes as well as arousal, and freezes your view of your clothes in trance.

For everyone:

- **Commands take a moment to land.** A spoken command now takes hold 2 to 5 seconds after it is
  said, like words sinking in, always in the order they were said. Waking, releasing and the
  safeword never wait.
- **A pulse when a command lands.** A soft glow around the room view when a command takes hold or a
  trigger fires, so your eyes have something to follow. It's on by default; you can turn it off or
  change its colour on the Trance Defaults tab.
- **Hypnotists can list what they planted.** `/echs planted <name>`, or the new **Planted triggers**
  button on someone's spiral panel, shows the triggers you put in them, how they stand and what
  they do. Someone not in the room shows your last notes on them.
- **The spiral panel is simpler.** It now has the hypnotize or wake button and the new list. The old
  Movement, Clothing and Kneel buttons were left over from testing and are gone; say it instead.
- **A trance no longer cuts a trigger short.** If a trigger was holding you when you went under, it
  now keeps holding after you wake and finishes its time. Your safeword still clears everything.
- **A "when someone comes in" trigger no longer announces you when you're tied up.** If bondage
  stops the pose it asks for, the room used to see you try every single time. Now the room sees
  nothing, and you are told once, privately, along with how to remove it.

## v1.3.0 RC · 2 November 2026

- **Hypnotists can take a trigger back.** Say *"Missy, forget the trigger sleepy time"* to remove
  one you planted for good, or *"Missy, forget every trigger I gave you"* to remove all of yours,
  including "when someone comes in" and "after you wake" ones. Only the person who planted a
  trigger can remove it, and the subject doesn't need to be in trance. If it is holding them, it
  lets go first. The subject is told something set in them is gone, but not the word.

## v1.2.2 RC · 2 November 2026

- **"You are released from <trigger>" works every time.** If you had a "when someone comes in"
  or "after you wake" trigger, naming another trigger could let go of the wrong one, so the one
  you named kept holding. Releasing a trigger in the first few seconds after it fired also let
  the rest of it land anyway, or let a repeated phrase keep being said. Both are fixed.
- **A release line never sets the trigger off.** Some release lines that mentioned more than one
  person fired the trigger they named instead of releasing it.
- **The hypnotist is told what happened.** After a release you hear whether it let go, whether it
  wasn't holding them, or that nothing by that name is planted (for example, a typo).
- **New trigger words can be planted next to a "when" trigger.** Having one planted made every new
  trigger word get refused.

## v1.2.1 RC · 2 November 2026

- **"Strip" takes off everything it should.** Undershirts and bodysuits were never removed
  before, and now they are. Jackets and hoodies, clothing accessories, corsets, garters and
  single socks come off too. So do the extra clothing slots from the Echo clothing add-on
  (*Cloth 2*, *Bottom 2*, *Bra 2*, long sleeves and the rest). Shoes now come off before socks.
  Hats, glasses, masks and jewellery still stay on.

## v1.2.0 RC · 2 November 2026

- **Stay under longer if you want to.** When a trance's 30 minutes are up, a box asks whether you
  want to stay under for another 30. Click **Stay under** (or type `/echs stay`) to keep going, or
  **Wake up** to end it. If you don't answer within a minute, you wake, just as before. The
  hypnotist is told that you're being asked, and told if you choose to stay.

## v1.1.1 RC · 1 November 2026

- **More ways to end a follow.** As well as *"you can leave"*, the hypnotist can now say
  *"stop following me"*, *"quit following me"*, *"don't follow me"*, *"no more following"* or
  *"you don't need to follow me"*. *"Stop following me"* also works during a walking trance, where
  a plain *"stop"* still brings the subject back to full trance.

## v1.1.0 RC · 1 November 2026

- **Follow works now, with no leash needed.** When a hypnotist says *"follow me"* and it lands,
  they are told so, and when they leave the room the game brings the subject along. There is no
  leash or collar to put on and no **Hold Leash** button to click any more. Before, the subject
  only became leashable and nothing said what to do next, so most of the time nobody followed.
  While the hypnotist is in the room, the subject cannot walk out on their own. *"You can leave"*,
  waking, or the safeword ends it.
- **Both of you need ECHS for follow.** If the hypnotist doesn't run it, the subject is told the
  pull cannot take them anywhere.
- **Follow tells you when it can't work.** If the subject has switched off the game's own setting
  that lets others leash them, or the room blocks leashing, the phrase does not land and the
  hypnotist is told why.

## v1.0.1 RC · 28 October 2026

- **ECHS only ever runs once.** This gets ECHS ready for FUSAM, the add-on manager. If you load
  ECHS two ways at once, for example the Tampermonkey script *and* FUSAM, only the first one starts.
  Before, both copies would run, and things could happen twice (a drink counted double, for one).
  You only need one way of loading ECHS.

## v1.0.0 RC · 28 October 2026

- **ECHS 1.0, release candidate.** This is the build we intend to call 1.0. Your chat line and the
  settings title now read **v1.0.0 RC**. If nothing serious turns up, the "RC" comes off. If
  something needs fixing first, the fixes arrive as 1.0.1, 1.0.2 and so on. Updates keep arriving
  on their own, as before.
- **Everything now says `/echs`.** The in-game help, the command menu, the welcome line and every
  message ECHS prints name `/echs` instead of the old name. Nothing else changed, and the commands
  you're used to still work exactly the same.

## v0.101.0 · 28 October 2026

- **Drinks and cigarettes.** A crafted drink or cigarette can now make you easier or harder to
  hypnotize for a while. Put `[echs:relax]` or `[echs:stimulate]` in the item's name or
  description when you craft it.
  - **A drink** (Filled Glass or Mug) takes effect each time someone sips it to you. Your own sips
    count too.
  - **A cigarette** works while it's in your mouth. It is gentler than a drink.
  - It adds to arousal, wears off on its own, and never changes your trust in anyone.
- **It is off until you turn it on.** On the Depth tab, set **Chemicals count** to *Arousal +
  drugs* or *Drugs only*. Until then, a tagged drink tells you it did nothing and why.
- Type `/echs drugs` to see how relaxed or stimulated you are. The safeword clears it at once.
- The wiki has a new **Drinks and Cigarettes** page.

## v0.100.6 · 3 October 2026

- **The wiki is brought up to date.** Nothing in the game changed. Newly written up:
  - what happens when the hypnotist leaves the room;
  - that a trigger holding you survives a refresh;
  - giving several people commands in one line;
  - that an arousal stutter doesn't break a command;
  - the extra freeze and denial wordings;
  - that ((double parentheses)) count as out of character too.
- The wiki now shows only `/echs` commands.

## v0.100.5 · 3 October 2026

- **The backup download works again.** ECHS loads from GitHub, and if GitHub can't be reached it
  falls back to a second site (jsDelivr). That backup had been stuck handing out v0.98.4 since
  v0.99.0. It now asks for the exact version your loader is, so it can't fall behind like that.
  Nothing changes if GitHub works for you, which is almost everyone.

## v0.100.4 · 2 October 2026

- **Being bound by something else no longer reads as hypnosis.** If another add-on or item froze
  you, ECHS could block touching yourself and say *"Your hand doesn't move"*, even with no
  hypnosis going on. Now only a freeze ECHS put on you itself does that. The same goes for poses
  being held, the undress refusal, and the wardrobe message.
- A trance resumed after a reconnect keeps holding you exactly as before.

## v0.100.3 · 2 October 2026

- **Whispers don't need the subject's name any more.** Whisper *"kneel"* to someone you have under
  and it works like *"Missy, kneel"*. Lines said out loud still need the name, so ordinary room
  chat stays harmless, and anything in (parentheses) is still out of character and never a command.

## v0.100.2 · 2 October 2026

- While your settings are locked, you can now turn the pages of the Depth tab to read every
  feature's depth. Before, only the first page could be seen.

## v0.100.1 · 2 October 2026

- In setup, the **Next** and **Apply** buttons now turn white once you have picked an answer, like
  the other buttons, so it is obvious they are ready. Before an answer is picked, Next is a darker
  grey.

## v0.100.0 · 2 October 2026

- **A new Inductions tab.** How someone gets you under now has its own tab, right after
  Permissions. It holds:
  - how many tries they get;
  - your automatic answer;
  - what happens while you're away;
  - toy mode, and who it's for;
  - how far "sink deeper" can take you, which moved here from the Depth tab.
- **Permissions is easier to scan.**
  - Hypnosis Enabled and the settings lock stay at the top, always in view.
  - The rest are grouped under Body, Voice & senses, Touch & arousal, and Mind.
  - Made to Touch Others sits under Made to Act, and is greyed until Made to Act is ticked.
- Nothing you had set has changed; only where it's shown.

## v0.99.0 · 2 October 2026

- **A new setup.** The four templates have been redone and each applies with one click:
  - **Hypnotist only:** nobody can hypnotize you.
  - **Light / safe:** poses and being held still, and a trance never silences you.
  - **Balanced:** adds speech, touch, undressing, arousal, the wardrobe lock, and triggers from
    people close to you.
  - **Extreme:** everything on, every depth set to 20, and it locks your settings (below).
- **Five new setup questions** instead of the old ones: your role, how attempts are handled, what
  physical commands you allow, your senses, and triggers.
- **Every page of setup has a Cancel button** that changes nothing.
- **Extreme now asks first, and locks your settings.** After you confirm, your settings are
  read-only for a week, then 30 days at a time if you choose. `/echs safeword` always ends a trance,
  and `/echs reset confirm` unlocks early but erases your trust, triggers and stats too.
- Choosing Extreme before this update does not lock anything; only choosing it in the new setup
  does.

## v0.98.4 · 2 October 2026

- **How deep each feature needs you to be is now a number from 0 to 99**, set on the Depth tab.
  Type it in, or use the -5 and +5 buttons; the tier it falls in is shown beside it, like
  *45 [Entranced]*. Any depths you had already chosen carry over exactly: Drifting becomes 0,
  Yielding 20, Entranced 40, Deep 60, Blank 80. (The setup's "easy" answer and the Extreme preset
  set everything to Drifting, so those show as 0.)
- When a hypnotist is told something is too deep for you, they now see both numbers, like
  *needs 60 [Deep], at 45 [Entranced]*.
- **Locked settings are easier to read.** While a session locks your settings, the screen shows a
  yellow *Read-only* banner across the top. You can still look through every tab; nothing changes.
- **The trust list shows people by the name they go by**, their nickname if they have one, with
  their member number after it: *Rei (#123456)*. Someone briefly out of view no longer turns into a
  bare number.
- Scrolling the mouse wheel over a number box on the settings screen now moves it by one, not two.
- Clearing a number box and clicking away puts back the number you last saved, not an older one.
- Pop-up help on the settings screen is no longer hidden behind the number boxes and dropdowns.

## v0.97.4 · 27 September 2026

- **The yellow pop-up help on the settings screen is readable again.** Longer ones used to shrink to
  fit on one line; they now wrap onto several lines at a normal size.

## v0.97.3 · 27 September 2026

- **"Toy mode is for" now uses the same choices as trigger scope on the Triggers tab**, from a
  dropdown: owner only, owner and lovers (the default), and wider through your whitelist, Dominants,
  everyone except your blacklist, or everyone. If you had chosen "Friends and up", it becomes the
  whitelist choice.

## v0.97.2 · 27 September 2026

- Includes v0.96.3's fix: you are told when an induction is turned away.

## v0.97.1 · 27 September 2026

- **Depth shows as a whole number again.** A trance held up by your trust could show a depth like
  31.34328358208955. It now rounds.

## v0.97.0 · 27 September 2026

- **How deep you go no longer depends on luck.** The roll now only decides whether an induction
  lands. How deep comes from your trust in the hypnotist, your relationship, their skill, your
  arousal and your answer: Agree takes you deeper, Fight keeps you shallow. Long trust and going
  along with it can now reach Deep without an owner. `/echs chance <name>` shows where each answer
  would land. If an induction would land at nothing, it slips away and counts as a miss.
- **"Sink deeper" goes a long way when you are shallow, and only a little when you are deep.** No
  more half steps.
- **Fighting back up is fairer at every depth.** Typing `/echs fight` while under now pushes back at
  once. You get one push a minute.
- **New: answer ahead of time.** At the bottom of the Permissions tab you can answer every induction
  as Agree, Ignore or Fight without the box. If you are away from the keyboard for 10 minutes, it
  turns them away unless you choose otherwise.
- **New: toy mode.** Off unless you turn it on. For the people you choose (lovers and up unless you
  change it), an induction puts you straight under to your *"sink deeper"* limit with no roll, and
  that includes triggers if your limit is Deep or deeper. The safeword always works.

## v0.96.3 · 27 September 2026

- **You are told when an induction is turned away.** If you try to hypnotize someone who is already
  under, still in their wait after your last tries, or not open to hypnosis, your chat now says so
  and why, with how long is left on a wait. Before, only their Information Sheet showed it, so
  `/echs induce` looked as if it had worked.

## v0.96.2 · 26 September 2026

- **A fighting subject stands more of a chance.** When a *"sink deeper"* misses and you are
  fighting, even a push back that falls just short now brings you up a little. Two of those make a
  full step up, and near the surface one can wake you. `/echs chance` shows it.

## v0.96.1 · 26 September 2026

- Whether you are fighting, going along or neither now survives a page reload mid-trance. Before,
  a reload quietly turned a Fight into "neither".

## v0.96.0 · 26 September 2026

- **Fighting it once you are under.** Type `/echs fight` while in a trance and you resist going
  deeper for the rest of it (`/echs agree` or `/echs ignore` to stop). When a *"sink deeper"* misses
  outright while you are fighting, you may come back **up** a depth instead, and from Drifting you
  wake up. The shallower you are, the better your chance; your hypnotist's skill, and a little your
  trust in them, make it harder. Choosing Fight at the prompt counts too.
- **Half steps.** A *"sink deeper"* that only just misses still takes you a little deeper, not yet
  enough to change anything; two of those make a full step.
- `/echs chance <name>` shows your odds of going deeper, and of fighting back up, while you are
  under with them.

## v0.95.0 · 26 September 2026

- **New: going deeper mid-trance.** Once you are under, your hypnotist can say *"Missy, sink
  deeper"* (or go, drop, fall, sleep, relax deeper, or *"deeper and deeper"*) to take you one depth
  further. It is a roll: your trust in them, their skill, how long you have been under and your
  answer at the prompt all count, and each step down is harder. At most once a minute, and only
  after one of their suggestions has landed. If you have told them *"I trust you"*, it always takes.
- **Your limit:** the Depth tab's new *"Sink deeper" stops at* setting. It is **Entranced** unless
  you change it, and it can be turned off. Going deeper this way never unlocks triggers,
  suggestions that outlive the trance, or the clothing illusion.
- Your hypnotist is told whether it took, but never your exact depth.

## v0.94.0 · 26 September 2026

- **New: giving your trust.** Say *"I trust you, Eri"* (or whisper *"I trust you"* to Eri, or type
  `/echs trust Eri`). If Eri tries to hypnotize you in the next 5 minutes, you are not asked: it goes
  ahead as Agree, and your trust in Eri counts as at least 65 for that induction and the trance it
  leads to. It is used up by that one induction; next time you are asked again. It never unlocks
  triggers, suggestions that outlive the trance, or the clothing illusion. Your safeword clears it.

## v0.93.1 · 26 September 2026

- While your sight is taken, the trance's soft white veil steps aside, so the dark stays dark
  instead of turning grey. It comes back as soon as you can see again. The same goes for a real
  blindfold worn in a trance.

## v0.93.0 · 26 September 2026

- **New: hearing only one voice.** A hypnotist can say *"Missy, you hear only my voice"*, and Missy
  hears only them, or *"Missy, you only hear what is said to you"*, and she hears only lines that use
  her name. Everything else said in the room is hidden, with the odd line that other voices are
  there and don't matter. She still sees emotes and activities, and text in (parentheses) always
  gets through. What she can't hear can't command her. It works in a trigger too, where "my voice"
  means whoever says the trigger word. It needs the new **Hearing** permission, off by default.
- **New: sight.** *"Missy, your vision is dimming"*, *"Missy, you can barely see"* and *"Missy, you
  cannot see"* use Bondage Club's own three levels of blindness, so your own game settings still
  decide how dark it can get: with Sensory Deprivation on Light, it stops at very dark. *"Missy, you
  can see again"* ends it. Nobody else sees a change. It needs the new **Sight** permission, off by
  default.
- The wiki's Sensory Modulation page is written, and the phrases it listed that were never built
  are gone.

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
  alone and only uses its own `/echs` command. Thanks to Bella for reporting it.

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
  makers. If you are asked for console output with a bug report, type `/echs debug` to switch it
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
  name, the version and `/echs help`. Only you see it. The settings screen title shows the
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
  project called HSC. `/echs` is now its command. Your settings and the install
  link did not change.

## v0.77.0 · 17 September 2026

- **New: follow.** With the new *Follow / Leash* permission switched on (it is off by default), a
  hypnotist can tell an entranced subject *"follow me"*, and the subject is led from room to room
  on the game's own leash. Only that hypnotist can take the leash. *"You can leave"* lets them go.
  The subject needs the game's own leashing allowed, and a room that blocks leashing stops it.

## v0.76.0 · 17 September 2026

- **A missed induction now says so.** The subject, the hypnotist and, if the subject shows their
  reactions, the room all see that it did not take, without saying why.
- **New commands:** `/echs induce <name>` starts an induction, and `/echs retry` tries again
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
