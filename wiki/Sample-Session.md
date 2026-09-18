# A Sample Session

A worked example, end to end: two people, the actual lines typed, and what each of them sees.

**Elena** is the hypnotist. **Missy** is the subject. Everything below is what the add-on really
does at v0.74.6 — the phrases are ones the parser matches, and the responses are the strings the
code emits.

> **About the responses.** Most of Missy's private lines and the room emotes are picked at random
> from two or three variants, so you will see a *different* line of the same kind. Where that
> happens it is marked **(one of several)**. Anything in `[square brackets]` is local to Missy and
> nobody else sees it.

---

## Before anything: Missy sets her permissions

Missy installs, reloads, and sees this in her chat log:

```
[Erotic Chat Hypnosis Suite (ECHS) v0.78.0 — nothing is switched on yet. Click the spiral to set up.]
[Your reactions are visible to the room by default; Trance Defaults turns that off.]
```

She opens **Preferences → Extensions → ECHS Hypnosis** and runs the wizard. She picks the
**Balanced** preset, which switches on *Hypnosis Enabled* plus the session-scoped basics, and then
ticks **Allow triggers to be planted in you** on the Triggers tab by hand, because she wants to try
that part.

Elena needs nothing switched on to *be* a hypnotist — her own permissions govern only what can be
done to **her**.

---

## Attempt one — which fails, and that is normal

They have talked a few times, so Missy's trust in Elena is low but not zero.

Elena opens Missy's profile, clicks the **spiral icon**, and clicks **Attempt Hypnosis**.

**Missy sees a box appear:**

```
Elena is trying to hypnotize you.
        [ Agree ]   [ Ignore ]   [ Fight ]
```

She has 60 seconds. She clicks **Ignore** — curious, but not helping. *(She could equally have
typed `/hypno ignore`, which is what you would do if you were in the wardrobe when the prompt
landed.)*

**Elena never learns which she chose.** She gets a 60-second induction window, and what she says in
it matters — every line adds to the roll, up to a cap. So she uses it:

> **Elena:** Missy, look at the way the light moves when I turn my hand.
> **Elena:** There is no hurry at all. Nothing you have to do.
> **Elena:** Just the sound of me talking, and how heavy that makes everything.

The window closes. The roll happens. It misses.

**Missy sees:**

```
[The attempt doesn't quite land.]
```

**Elena sees a vague band** — one of *barely responsive*, *slightly relaxed*, *more relaxed* or
*almost under*. Never a number. This time: **slightly relaxed**.

She has **two attempts by default** before a ten-minute cooldown. *(That is Missy's setting — she
can allow three.)* Elena has one left.

> **This is the normal first experience, and it is worth expecting.** A stranger cannot simply
> hypnotise you. If you want to see the real numbers behind it, Elena can type
> `/hypno chance Missy` and get the odds for all three choices.

---

## Attempt two — it lands

They talk for a while longer, which builds trust on its own. Elena attempts again.

This time Missy clicks **Agree**, which is worth a large bonus to the roll.

**Missy sees:**

```
[You slip under. (entranced)]
```

The tier in brackets is one of *drifting · yielding · entranced · deep · blank*, decided by how
comfortably the roll landed. A narrow success leaves her shallow; a comfortable one goes deep.

The **trance defaults** apply at the same moment — by default that is *cannot move*, *cannot speak*
and the **screen fade**, a soft white veil over her own view. All three are hers to change on the
Trance Defaults tab.

**The room sees** *(v0.72.9 added these; one of several)*:

> *Missy's eyes lose their focus, and she goes quiet.*

---

## A suggestion lands

Elena talks normally. No commands.

> **Elena:** Missy, you cannot move.

**Missy sees** — one of several:

```
[Your body simply stops listening to you.]
[You tell your legs to move. Nothing happens.]
[Somewhere far off you decide to move, and the message never arrives.]
```

**The room sees** — one of several:

> *Missy goes very still, mid-motion.*
> *Missy stops moving, as though the idea had gone.*

**Why it worked**, in the order the add-on checks: Missy granted *Movement Restriction*; there is a
live trance with **Elena specifically**; Elena said Missy's **name**; and *Cannot move* needs
**Yielding**, which Entranced clears.

Drop any one of those and nothing happens — and **Elena is told which one stopped it**, so she can
fix it rather than guess.

---

## Planting a trigger

Elena wants something that outlives the trance. Planting needs **Deep** depth on **earned** trust —
so this only works because their relationship has built up; arousal cannot buy it.

> **Elena:** Missy, your trigger word is sleepy time.

**Missy sees:**

```
[Something is being set aside in you. You let it happen.]
```

She is **never shown the phrase**. Someone who can read their own trigger word can simply decide not
to react to it.

**Elena sees:**

```
[trigger] RECORDING "sleepy time". Say each suggestion, then "remember trigger" to save
(or "forget the trigger" to cancel).
```

Now Elena names the actions. **They are recorded, not performed** — otherwise she would freeze Missy
mid-setup and have to undo it.

> **Elena:** Missy, you cannot move.
> **Elena:** Missy, you cannot speak.

**Missy sees, each time:**

```
[That settles into place, waiting.]
```

**Elena sees:**

```
[trigger] Recorded movement-block into "sleepy time" (1 so far).
[trigger] Recorded speech-block into "sleepy time" (2 so far).
```

Then she commits:

> **Elena:** Missy, remember trigger.

**Missy sees:**

```
[It settles somewhere you won't think to look for it.]
```

**Elena sees:**

```
[trigger] SAVED "sleepy time" — 2 action(s): movement-block, speech-block.
Planted at 62 (Deep). Saying it will now fire them, in or out of trance.
```

> **A phrase must be at least 5 characters**, and it must be **unique to Missy** — nobody else can
> be holding "sleepy time" on her, and no phrase may overlap one that already exists. See
> [Triggers and Lasting Effects](Triggers-and-Lasting-Effects).

---

## Waking

> **Elena:** Missy, wake up.

**Missy sees:**

```
[You come out of trance. (they woke you)]
```

Everything the session applied comes off together — she has her movement and her voice back. Trance
defaults **can never be carried past waking**, so that is guaranteed.

The trigger is still there. It does not fire on waking; it is simply loaded.

*(Elena could equally have used the **Wake Up** button on the remote panel. Missy could have used
`/hypno wake` herself, if the trance were shallow enough — a deep one refuses and says so.)*

---

## Later — the trigger fires

An hour later, a different room, no session at all. Elena says, in ordinary conversation:

> **Elena:** That was a long day. I could do with a sleepy time nap.

**The trigger fires.** No name needed, no trance needed — that is the entire point of one.

Missy cannot move and cannot speak. She sees the same private lines as before, and the room sees the
same emotes. **It fires for Elena because she planted it**; whether anyone *else* saying those words
would set it off is Missy's **scope** setting, and the default is **Hypnotist only**.

The actions arrive **one at a time**, with a short pause between them, rather than all at once.

It holds for the duration on Missy's Triggers tab, then lets go. Or:

> **Elena:** Missy, you are released from sleepy time.

…which releases that one trigger by name, and works outside a trance.

---

## And at any point

```
/hypno safeword
```

Clears the trance and every effect, from any state, always. It is a slash command, so it still works
while Missy is silenced — BC parses commands before the speech block can see them.

---

## What to read next

- **[What to Say](What-to-Say)** — every phrase the parser knows
- **[Your First Session](Your-First-Session)** — the diagnostic version: what to check when
  something *doesn't* work
- **[Depth and Trust](Depth-and-Trust)** — why attempt one failed and attempt two didn't
- **[Triggers and Lasting Effects](Triggers-and-Lasting-Effects)** — uniqueness, override, decay
