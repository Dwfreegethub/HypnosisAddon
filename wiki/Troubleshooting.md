# Troubleshooting

## The add-on does nothing at all

**Check the spiral icon is in the top bar.** If there is no icon and nothing in the browser console,
the userscript is not running. A userscript with a non-matching `@match` fails completely
silently — BC is served from more than one host, so check your userscript manager shows it as active
on the page you are actually on.

**If the icon is there, this is almost certainly correct behaviour.** Every permission starts off,
including the master switch. Open settings and run the wizard. See
[Getting Started](Getting-Started).

## I said something and nothing happened

Work down the gates in order — they are checked in this sequence:

1. **Is the permission on?** `/hypno session` lists what is granted.
2. **Is there a live trance with that specific person?** Not just any trance — theirs.
3. **Is their name in the line?** Every suggestion needs it. `/hypno match <phrase>` reports the
   name gate separately from the wording.
4. **Are they deep enough?** `/hypno gates` shows what each feature needs. A line can match
   perfectly and still be waiting for a deeper trance.

**The hypnotist is told which gate stopped it.** If they got nothing at all, the wording did not
match — start at `/hypno match`.

## The wording did not match

Contractions and punctuation are ignored, so that is not it. Common causes:

- **No name in the line.** The most common by far.
- **You started with "I" or "we" and never said "you".** Those lines are ignored deliberately, so
  that *"I kneel beside you"* does not make anyone kneel.
- **You wrapped it in parentheses.** Anything in brackets is treated as out-of-character and
  discarded before the add-on reads it.
- **You used a phrasing that is not in the table.** Check the in-game **What to Say** tab — it is
  generated from the code and is authoritative. [What to Say](What-to-Say) here is hand-written and
  covers the common forms.

## A suggestion refused with something about depth

That is the depth gate, not a bug. They need to take you deeper, and how deep they *can* take you
depends on your relationship — see [Depth and Trust](Depth-and-Trust).

If you would rather that feature were reachable sooner, the **Depth** tab moves it. It is a consent
setting, not a difficulty setting.

## Something is stuck on me

In order of escalation:

1. Wait — most effects wear off on a timer, and trances end after 30 minutes.
2. Have whoever applied it release it. A trigger releases by name:
   *"Missy, you are released from sleepy time"*.
3. **`/hypno safeword`** — clears everything from any state, always.

**`/hypno forgettrigger` refusing is deliberate**, not a bug: you cannot delete a trigger while it
has hold of you. The safeword is the way out of that.

## I have been silenced and cannot type

Slash commands still work. BC parses commands before the speech block can see them, so
`/hypno safeword` is always reachable — this is deliberate, and it is why speech blocking is safe to
consent to.

## I clicked the spiral on someone and it said they do not have the add-on

The icon shows on **everyone**, because there is no way to know who is running it without asking.
The panel gives them about three seconds to answer, then says so, with a *Check again* button. A
late reply still restores the panel.

The icon deliberately does not hide itself for people who lack it — that would turn the Information
Sheet into a directory of who in the room is running this.

## My trigger stopped working

- **It may have faded.** `/hypno triggers` shows each one's current strength. A trigger's strength
  *is* the depth it fires at, so a worn one fires its shallow actions and stops landing the deeper
  ones; far enough gone, it gives only a vague pull.
- **A permission may have been revoked.** Each action re-checks its own permission at firing time,
  so turning off Movement Restriction disarms the movement half of every trigger already planted.
- **Check the scope.** If it was planted by someone else and your scope is *Hypnotist only*, only
  they can fire it. Firing your **own** triggers is a separate setting and is off by default.

## The room saw something I did not expect

Anything in `[square brackets]` went only to you. Anything the room could genuinely have observed is
emoted so everyone reads it. Perception effects are never emoted.

**Trance Defaults → Others See Your Reactions** turns the emotes off entirely.

## Known rough edges at v0.73.2

- **Some ordinary deepening language can be read as a touch command.** Because *"feel"* is one of
  the commanded-activity verbs, a line like *"Missy, your arms feel heavy"* can be parsed as
  *caress your arms*. If a hypnotist gets an unexpected activity during an induction, this is
  probably why. Known and open.
- **A trigger phrase inside a command line can swallow the command.** If one of your trigger phrases
  happens to appear in a line that also contains a suggestion, the suggestion may not be evaluated.
  Known and open.
- **Trigger decay has not had a full live run** — it is off by default, so you will only meet it if
  you turn it on.

## Getting more detail

`/hypno effects` for what is on you, `/hypno session` for what is granted and what phase you are in,
`/hypno storage` if you suspect settings are not loading. Between them they usually narrow a problem
to one of matching, permissions, session, or depth in a single try.
