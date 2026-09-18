# Settings Reference

Open with the **spiral icon** in the top bar, or through **Preferences → Extensions → ECHS
Hypnosis**. Tabs run down the left edge.

Everything here is a **permission** — "do I allow this to be done to me" — not a self-trigger.
Ticking one never applies anything to you.

**Settings lock while a session is on you**, including during the induction. If you need out, that
is what the safeword is for.

## Permissions

| Setting | What it allows |
|---|---|
| **Hypnosis Enabled** | The master switch and the hard floor. Turning it off releases the trance and every effect immediately, exactly as the safeword does. Turning it back on re-applies nothing |
| **Movement Restriction** | *"you cannot move"* |
| **Clothing Restriction** | Keeps you out of the wardrobe |
| **Posture Control** | Kneel and stand |
| **Follow / Leash** | *"follow me"* / *"stay close"* — a compulsion to stay at the hypnotist's side, including across room changes. Uses Bondage Club's own leash: while it is on, the hypnotist leads you with the ordinary **Hold Leash** button and you cannot walk away. Needs your BC leashing to be allowed |
| **Speech Restriction** | *"you cannot speak"* — room chat only; slash commands always work |
| **Self-Touch Control** | Being **stopped** from touching yourself |
| **Made to Act (touch yourself on command)** | Being **made** to. See [Commanded Activities](Commanded-Activities) |
| **Arousal & Orgasm** | Arousal level, denial, forced orgasm, and numbness |
| **Clothing Illusion** | Your own screen shows clothes you are not wearing |
| **Undressing** | *"take something off"* / *"strip"* |
| **Lock settings while a session is on you** | Whether this tab locks mid-trance |

Also here: the **attempt limit** (two or three tries before a cooldown; two by default), and on a
fresh install a one-click **starter set** offer that turns on five safe session-scoped basics and
undoes in one click.

> **Triggers and carry-forward are *not* on this tab** — they live on the Triggers tab below.

## Trance Defaults

What happens automatically when you go under, before anyone says anything.

| Setting | Default | Meaning |
|---|---|---|
| **Cannot Move** | on | The trance itself stops you moving |
| **Cannot Speak** | on | …and speaking |
| **Silence OOC too (text in parentheses)** | **off** | By default, *"(brb)"* still gets through while you are silenced. Tick this and it doesn't |
| **Screen Fade** | on | A soft white veil over your own view while under. Thins to a hint during a walking trance |
| **Clothes Look Unchanged** | off | Applies the clothing illusion automatically on entering trance |
| **Others See Your Reactions** | **on** | The room-visible emotes. Turn this off and the room sees nothing |
| **Release everything if you disconnect** | off | Drop all effects rather than serving out the remainder on reconnect |

## Awareness

What you can be made not to notice.

- **Clothing Changes** · **Bondage Changes** · **Touches / Activities** — three separate grants
- **Trigger setup (hide what is planted)** — hides the whole planting exchange, so you never learn
  your own trigger word

## Triggers

- **Allow triggers to be planted in you** — the permission itself
- **Suggestions that outlive the trance** — carry-forward
- **You can fire your own triggers** — off by default
- **Show trigger words when you list them** — off by default
- **Duration** — how long a fired trigger holds you, or until released
- **Decay rate** — Never · Very slowly · Slowly · Typical · Fast · Very fast. **Never** by default
- **Scope** — the seven-rung ladder of who can fire your triggers. Default *Hypnotist only*

## Depth

- **Per-feature tier selector** — move any feature up or down the five-tier ladder for yourself
- **Chemical reach** — whether the illusion and triggers may be reached by arousal rather than
  earned trust. Carry-forward is drawn locked and cannot be opened
- **Honouring hypnotist skill** — ignore it · only from people you trust · up to a cap from anyone
- **Reset to defaults**

## Stats (behind the Advanced button)

Read-only, plus one dial.

- Per-person trust and your own experience
- **Trust decay rate** — off unless you choose
- Relationship floors currently applying

## The setup wizard

On a fresh install or after a reset, opening settings shows the **setup screen** instead of the
tabs. The **Setup** button in the top bar re-runs it whenever you like.

Four presets — *Hypnotist only · Light / safe · Balanced · Extreme* — or five questions. It changes
consent settings, so it never appears mid-session.

## Your data

- `/hypno export` and `/hypno import <blob>` — move settings between characters or back them up
- `/hypno reset confirm` — wipes everything. It releases any trance **first**, then wipes, and says
  so in that order

Settings live in BC's own per-account extension storage, with a local backup keyed to your member
number.
