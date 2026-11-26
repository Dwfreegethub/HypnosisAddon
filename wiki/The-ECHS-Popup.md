# The ECHS Popup

> 🛡️ **EMERGENCY EXIT:** the red **Safeword — stop everything** button at the bottom of the popup, or `/echs safeword`, always works.

ECHS is played by talking, so there's a lot to remember: commands, suggestion wordings, how to plant a trigger. The popup puts it on screen. It's a small window in chat rooms that **types things into your chat box for you**. Nothing is sent until you press **Enter**, so you can change the line first, or turn it into a whisper.

* [Opening it](#opening-it)
* [The tabs](#the-tabs)
* [People](#people)
* [Suggestions](#suggestions-while-someone-is-under-you)
* [Me](#me-while-someone-is-hypnotizing-you)
* [Triggers](#triggers)
* [Commands](#commands)
* [What it shares, and with whom](#what-it-shares-and-with-whom)
* [Turning it off](#turning-it-off)

---

## Opening it

In a chat room, a **round spiral button** sits on the left edge of the screen. Click it to open the window, and click it again (or the window's **×**) to close it.

* **Move either one** by dragging it. The button moves by dragging the button itself; the window moves by dragging its title bar (the **ECHS** line). Both stay where you leave them, even after you log out.
* **The gear ⚙** in the title bar opens the ECHS settings. Leave them the game's usual way and you're back in the room, with the window as you left it.
* **Resize the window** by dragging its bottom-right corner. It keeps that size too. **Double-click the title bar** to put it back to the normal size.
* A strip of the window always stays on screen, so you can't lose it off the edge.
* The button hides while you have a character's item menu open, so it never covers the game's own buttons. It only appears in chat rooms.

## The tabs

The tabs change with what is going on, and the window switches to the one you need by itself:

| Tab | Shows when | What's in it |
|---|---|---|
| **Me** | Someone is trying to hypnotize you, or you are under | Your own answers and ways out |
| **People** | Always | Who in the room you can hypnotize |
| **Suggestions** | Someone is under **you** | What you can say to them |
| **Triggers** | Always | Planting triggers, the ones you planted, and the ones in you |
| **Access** | Always | Who holds your keys, who can hypnotize you (Blocked / Normal / Toy), and the settings of anyone whose keys you hold. It was called **Keys** before v1.17.0. |
| **Commands** | Always | Every `/echs` command. `/echs induce` comes first, unless someone is hypnotizing you; then the answers to it (`agree`, `ignore`, `fight`) do. |

When someone starts on you, it switches to **Me**; when someone goes under you, it switches to **Suggestions**. Otherwise it stays on whatever tab you picked.

The **Safeword** button is at the bottom of every tab. It is the one button that acts at once instead of typing: it ends any trance and releases every effect, exactly like `/echs safeword`.

---

## People

Everyone else in the room who runs ECHS. **Click a name** to type the induction for them, `/echs induce Missy`; press Enter to start it. They still choose, on their own screen, how to respond.

* A small tag shows what is already known about a session with them: *under you*, *induction under way*, *missed: you can try again*, or *resting: 5 min* while they are on cooldown from you.
* With no session, it says whether they can be hypnotized at all: *open to hypnosis*, or *not open to hypnosis* for someone who hasn't set ECHS up for it or chose Hypnotist only. Someone on an older ECHS shows no tag. You can still try someone who isn't open; `/echs induce` says it will most likely be refused.
* If two people share a name, or a name looks like a number, it types their member number instead, so it can never go to the wrong person.
* Players who untick **Show others that I run ECHS** (Settings → General) are not listed. See [What it shares](#what-it-shares-and-with-whom).

## Suggestions (while someone is under you)

Everything you can say to them, in groups you open and close with **+** and **−**:

**Trance · Body & pose · Face · Moving & following · Speech, sight & hearing · Clothes · Awareness · Arousal · Touch**

* **Click a line** to type it with their name: *Missy, kneel*. Their name is what makes a suggestion theirs (or whisper it, which needs no name: edit the line before you send it).
* Lines marked **↺**, in green, **give something back**: *↺ you can see again*, *↺ stand*, *↺ wake up*. Each sits straight under the things it undoes.
* A **+1**, **+2**… beside a line opens the other wordings that work too. Click any of them to type it instead.
* **Two or more people under you?** A row of their names appears at the top. Pick one, and everything you click is typed with their name.
* **The touch picker** (since v1.19.2) opens the **Touch** group. Pick **who** (themselves, you, or anyone else here; in a crowded room the rest are in a list), **real** or **phantom**, and the **touch** (touch, kiss, lick, grope, pinch, spank and the rest), then click **where**: every body area is there. *kiss*, *Rei*, *neck* types *"Missy, kiss Rei's neck"*; *phantom*, *kiss*, *neck* types *"Missy, you feel lips on your neck"*, a touch only they feel. Areas the game won't allow that touch on are faded. A phantom touch is only ever on them, and a few touches (pet, suck, finger) have no phantom version.
* **Trance** also has *that will stay with you*, *all of this will stay with you* and *↺ nothing stays with you*, for keeping what you said after they wake (since v1.19.2).

### Faded lines

While someone is under you, their ECHS tells yours which kinds of suggestion they allow, and whether they are deep enough for each:

* A **faded** line is something they haven't allowed. A whole group with nothing allowed reads **(not allowed)**.
* A line tagged **deeper** is allowed, but needs them deeper first. *Sink deeper* (in Trance) is the way there.
* A line tagged **instant** is over the moment it lands (an orgasm, undressing, arousal, made-to-act actions). In a trigger it starts no timer. Untagged lines hold them until released or until the trigger wears off.
* Faded lines still type when you click them, and the status line tells you it won't land. Their ECHS always has the final say.
* **↺** lines, *wake up* and *sink deeper* are never faded: giving something back and ending a trance are always allowed.
* If they tick a permission, or go deeper, mid-trance, the list catches up within a few seconds.
* Someone on an older ECHS doesn't send this. Their list stays fully lit, with a line saying so.

## Me (while someone is hypnotizing you)

* **Someone is trying to hypnotize you:** *Agree*, *Ignore* or *Fight*. They are never told which. While ECHS's box is on the screen, the window folds up to its top bar and the Safeword button and moves out of the way, so it never covers the box. It opens again once you answer.
* **While the induction runs:** what you chose, and the other two answers to change it. After a miss: that it missed (*1 of 2*). Your answer still counts if they try again, and you can still change it.
* **While you are under:** who has you, your depth in the names the Depth tab uses (*Drifting*, *Yielding*…), and *Wake*, *Fight it* (push back up, and fight going deeper), *Let it* (stop resisting), *Drift* (neither help nor resist going deeper) and *What is on me* (`/echs effects`). They type `/echs wake`, `fight`, `agree`, `ignore` and `effects`. When your time is up and you are asked, **Stay** appears too.
* Each button types its command; press Enter. The Safeword button stays at the bottom.
* Under the [Extreme lock](Settings-Reference#the-extreme-lock), your depth line is hidden, as it is everywhere else.

## Triggers

Three parts. Each line types with the right name, as on Suggestions. **Triggers in you** comes first when anything is planted in you, and isn't shown when nothing is.

**Planting** (while someone is under you; it needs a Deep trance, on earned depth). With nobody under you, the same lines are folded under **Planting triggers (put someone under first)**: click it to read them, greyed; clicking one says to put someone under first:

1. **Plant a trigger:** *your trigger word is …* (type the word, then Enter), then what it does, picked from Suggestions, then *remember trigger*. *↺ cancel the trigger* starts again.
2. **Shape it** (before *remember trigger*): a **reaction** (*whenever anyone … you, …*, a pick-list like the compulsion one: it works only while this trigger holds them), works only once, works every time, lasts 2 hours, who can use it (anyone, only you, their owner, lovers or friends), only when they hear it exactly, a drop into trance, or making them say something three times.
3. **Compulsions**, waiting for a moment instead of a word: *five minutes after you wake, …*, *when you open your eyes, …*, *when someone comes in, …*, *when I speak, …*, *when anyone … you, …*, and *this trigger works every time*. Clicking *when anyone … you* opens the list of what they can do (kisses you, spanks you, tickles you, hugs you and the rest). Items have a line of their own (since v1.16.22): *whenever anyone puts an item on you* opens gags you, ties your arms, locks you in chastity, plugs you and the rest, and clothing has one too (since v1.18.0): *whenever anyone undresses you* opens takes your top off, puts a bra on you and the rest. Poses too (since v1.19.7): *whenever you kneel* opens you stand up, you get on all fours, you raise your arms, you move and the rest. The lists open to read even with nobody under you; clicking one types *"Bea, when anyone spanks you, "* and takes you to **Suggestions** to finish it. There, a click **adds** to that line (*"Bea, when anyone spanks you, kneel"*) instead of typing a new one, and what a trigger can't hold is greyed: the trance moves (sink deeper, wake up) and the commands aimed at you (kiss me, hug me, fuck me). Press Enter, then *remember trigger* keeps it. Changed your mind? **start over** stops the adding, and typing over the line does too. Change *anyone* to a name or *I* if you like.
4. **Keep one strong:** *that trigger holds*, while they are under with you.

Lines that need finishing end where you type on, and the status line says what's missing. More on how all of this works: **[Triggers and Lasting Effects](Triggers-and-Lasting-Effects)**.

**What you planted**, for each person here you have planted in: their answer about your own triggers (never anyone else's), with each one's strength and what it does, and:

* **say it** (fires it), **release** (lets go of it while it holds them), **forget** (gets rid of it for good).
* A compulsion has no word, so it is numbered among yours (*Compulsion 1: when anyone blindfolds you*) and its row has **release** and **forget** only. They type *"you are released from the second compulsion"* and *"forget the second compulsion"*, which act on that one alone (since v1.19.6). With more than one, an **All N compulsions** row has **release all** and **forget all**, which type *"you are released from the compulsion"* and *"forget your compulsions"*.
* A compulsion has no word, so only **↺ forget everything I planted** takes it away.
* It asks them at most twice a minute, so leaving the tab open can't flood the room.

**Triggers in you:** your own, numbered the same as `/echs triggers`, one line each: who planted it, what sets it off and what it does. The words stay hidden unless you have **Show trigger words when you list them** on (Triggers tab). *My triggers list* on the same tab can show less, down to only how many.

* **details** (`/echs triggers 2`), **forget** (`/echs forgettrigger 2`), and **forget all**, which asks first.
* **How fast your triggers fade:** the six speeds, with yours highlighted.
* Under your Extreme lock, *forget* and the speeds are faded: they still type, and say they will be refused.

## Access

Called **Keys** before v1.17.0. When you hold someone's keys, **Settings you hold keys to** comes first on the tab. When someone gives you keys, changes your level or takes them back, a line in chat says so.

**Your keyholders:** your BC owner, the people you've named, and everyone else here, each with **Give keys: minimal · moderate · full**. Each button types its own level; the level they hold now is highlighted. Anyone who holds your keys also has **Take keys back**. These type the `/echs keyholder` command, like everything else; press Enter. The last changes made to your settings are listed underneath. See [Keyholders](Consent-and-Safety#keyholders-someone-who-can-change-your-settings-for-you).

**Who can hypnotize you** (since v1.17.0): everyone here running ECHS, each with **Blocked · Normal · Toy**, the one they have now highlighted. **Blocked**: they can never hypnotize you, command you, plant in you or set off anything planted in you. **Normal**: your usual settings decide (everyone starts here). **Toy**: toy mode for them, even when your toy mode is off or *Toy mode is for* leaves them out. Each button types `/echs access`; press Enter. People you've given a level who aren't in the room are under **Not here**, folded at first. While your settings are locked the buttons are faded and say why. See [Blocking someone](Consent-and-Safety#blocking-someone-or-giving-one-person-toy-access).

If you hold someone's keys, their list shows under **Who can hypnotize them**, read-only: only they can change it.

**Ask for keys:** everyone here whose ECHS can answer (v1.16.1 or newer), unless you already hold their full keys, with **Request keys: minimal · moderate · full**, one button per level like Give keys. Press Enter to send. They get a popup; their answer shows in chat and under their name.

**Settings you hold keys to:** for anyone here who has given you their keys, their tick boxes from four settings tabs, and a row of buttons for each choice on their Inductions tab and for their screen effect (the spiral), eyes, eye colour and pulse colour. **Clicking one asks their ECHS to switch it**; it doesn't type anything, because there is no chat line for it. The line at the bottom of the window says *Asked…* and then their answer: *Done: …*, *Refused: …*, or that their ECHS did not answer. Whatever your level of keys can't do is faded, and clicking a faded box only says which keys it needs, without asking: with **minimal** keys, boxes that are off and every choice but the one that switches it off; with **moderate**, the Permissions and Triggers boxes that are off, and toy mode, auto-answer and who toy mode is for. With **full** keys there is more: their Triggers tab choices, **Stats** (how fast trust fades) and **Depth**. Depth and Stats start folded; click the heading to open one. A number (a depth, or minutes a fired trigger lasts) has step buttons (**−20 −5 +5 +20** for a depth, **−60 −5 +5 +60** minutes) instead of a row of choices. **Planted in them** (full keys, folded at first) lists their triggers: the word only if you planted it or they show their own words, who planted it, and what it does. **forget** takes two clicks; if it's faded, clicking it says why (they trust the planter at least as much as you, they planted it themselves, it's holding them, or their Extreme lock is on). With **full** keys there is also **lock who holds their keys** (if you're their BC owner it happens at once; otherwise they must accept; **unlock** takes two clicks), and **start Extreme for them** or **extend their Extreme lock** (they see the full warning and must accept). Their other keyholders are listed too, each with **take their keys back**: they get a popup and must accept, unless you're their BC owner (then it's two clicks and happens at once). And **lock their settings**: they get a popup and must accept. Once locked, the window says who locked them, and any full keyholder sees **unlock their settings** (click it twice). If their Extreme lock is on, **end their Extreme lock** appears: click it twice.

## Commands

Every `/echs` command in groups: **Hypnosis**, **Your data**, **Checking things** (and, in the Hypno Testing room only, **Testing room only**). Each shows what it does. A command that needs something after it, like a name, types with a space at the end so you can carry on. All of them are on **[Commands](Commands)** too.

---

## What it shares, and with whom

* **Who runs ECHS.** The People tab lists everyone in the room who runs ECHS. To stay off it, untick **Show others that I run ECHS** on the General tab. That one box also removes the spiral over you. Your ECHS still answers a hypnotist who opens your profile, because the profile panel needs it; other players' ECHS simply leaves you out.
* **What you allow, while you are under.** Your ECHS tells **only the person who has you under** which kinds of suggestion you allow, and whether you are deep enough for each. It never sends your depth itself. It is a hint for their list: your ECHS still checks every line, by your own settings.
* Nothing in the popup sends anything to the room. It only types into your chat box; you send.

## Turning it off

Settings → **General** → **ECHS popup in rooms**: choose **Off** for no button and no window. All the `/echs` commands and spoken lines work exactly as before. It's your own display choice, so no lock stops you changing it.
