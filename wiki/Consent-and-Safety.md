# Consent and Safety

This add-on does real things to your client. This page is what you are agreeing to.

## Your client decides everything

Another player's add-on can only ever **ask**. When a hypnotist says *"Missy, you cannot move"*,
what happens is that your own client reads the line, checks it against your own settings, and
decides. Nothing about the decision happens on their machine.

This is structural, not a promise. A modified hypnotist client has nothing to read and nothing to
override — it does not know your permissions, your depth, or whether a suggestion matched. It is
told only a vague band of how the session is going, never numbers, and never which of Agree / Ignore
/ Fight you chose.

## Nothing is on until you turn it on

A fresh install has every permission off, including the master **Hypnosis Enabled** switch. If the
add-on appears to do nothing, that is why.

Permissions are **per feature**. You decide separately whether someone may stop you moving, silence
you, keep you out of your wardrobe, move your arousal, undress you, make you act, hide things from
you, show you a false reflection, or plant triggers.

**Turning a permission off releases whatever it was holding, immediately.** Revoking consent is
never harder than granting it — a release request is always honoured regardless of permission state,
and unticking a permission disarms that part of every trigger already planted, not just the
currently running one.

## Two gates, not one

A permission asks *may they ever do this to me*. **Depth** asks *how far under do I have to be
before it can happen*. Both must be satisfied every time.

So a permission you granted last week does not mean someone can do it to you now — they still have
to get you deep enough, and how deep they can get you depends on your relationship. See
[Depth and Trust](Depth-and-Trust).

## The things that deserve extra thought

Three features are gated harder than the rest, because two of them outlive the session and one lies
to you about your own body:

- **Clothing Illusion** — your own screen keeps showing clothes you are no longer wearing, while
  the room sees the truth.
- **Planting Triggers** — a word that fires on you later, in or out of trance, potentially days
  later.
- **Carry-Forward** — a suggestion that is simply still true after you wake.

These need a **Deep** trance on *earned* depth, which means arousal cannot buy them. See
[Triggers and Lasting Effects](Triggers-and-Lasting-Effects).

**Awareness suppression** deserves the same pause. It can hide clothing changes, bondage or touches
from you — you are still being changed, you are just not told. It is a separate permission from
everything else for exactly that reason.

## Arousal can open a door, but only a little way

Being worked up raises how far someone can reach, up to a hard ceiling of 30 — which is
**Yielding**, the second-shallowest tier. It is enough for a stranger to reach the shallow,
session-only things and nothing else, ever.

Arousal can never reach the three features above. That is the point of the earned/arousal split: a
decision you make while worked up cannot leave anything behind after you have calmed down.

## Every way out

None of these can be taken away by any feature, trigger, setting or lock:

**`/hypno safeword`** — clears the trance and every effect, from any state. This is the floor.
Because it is a slash command, it still works when you have been silenced: BC parses commands before
the speech block can see them.

**Unticking Hypnosis Enabled** — the same total release, from the settings screen.

**`/hypno wake`** — wake yourself, but only while the trance is still shallow. A deep trance will
refuse, and it will say so.

**Time** — trances time out after 30 minutes. A fired trigger wears off on its own timer. An
induction window closes on its own.

**The hypnotist's Wake Up button**, or a spoken wake word — *"wake up"*, *"you are awake"*,
*"come back to me"*. These are gated by no permission at all.

**Being released by name** — *"Missy, you are released from sleepy time"* undoes exactly what that
one trigger applied, and works outside a trance.

### One deliberate refusal

`/hypno forgettrigger` **refuses while that trigger currently has hold of you.** Deleting the thing
that is gripping you would be too quiet an escape — the safeword is the way out of that, and saying
so is the point.

## What the room sees

Anything in `[square brackets]` reached only you. Nobody else saw it, and nothing in the room
reacted to it.

Anything the room could genuinely have observed is **emoted** instead, so everyone present reads
it — reaching for yourself and stopping, going still, opening your mouth and producing nothing.

Perception effects are never emoted. Nobody can watch you fail to notice something.

**Trance Defaults → Others See Your Reactions** turns the emotes off entirely, if you would rather
the room saw nothing.

## Out of character

Anything in parentheses is discarded before the add-on reads the line at all. `(brb)` or
`(are you still okay with this?)` will never fire a suggestion, build trust, or set off a trigger.
That is BC's own convention and the add-on honours it.
