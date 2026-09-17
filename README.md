# BC Hypnosis Add-on

A hypnosis add-on for [Bondage Club](https://www.bondageprojects.com/club_game/), where how far
someone can take you depends on how well you actually know them.

One player acts as hypnotist: they ask, you accept or resist, and if the induction lands you go
under to a depth the roll decided. From there they work in ordinary speech — *"Missy, you cannot
move"*, *"Missy, touch your breasts"* — and your own client decides, every time, whether that is
something you have agreed to. Suggestions can be made to outlive the trance, or planted as trigger
words that fire days later.

**Everything is off until you turn it on, and `/hypno safeword` always works.**

## Who it is for

Two people who want a hypnosis scene with some actual structure to it — a relationship that builds,
depth that has to be earned, and effects that persist past the moment. It needs the add-on on both
sides for the full experience, though a few things (trigger words, for one) work on you even if the
other person has nothing installed.

If you want to freeze someone instantly on demand, this is the wrong add-on. The whole design is
that access is slow.

## Install



1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) or
   [Violentmonkey](https://violentmonkey.github.io/).
2. Open the install link [HypnosisAddon](https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js). Your userscript manager will show an install prompt;
   accept it.
3. Reload Bondage Club and log in.
4. In your preferences, and extensions you will have a Hypnosis Add-on, when you enter it you can follow the wizard or choose your own settings. 

**Alternatively, via FUSAM.** [FUSAM](https://sidiousious.gitlab.io/bc-addon-loader/) manages
several BC add-ons from one place. Listing there is intended but not yet arranged.

Nothing works until you have been through setup, because every permission starts switched off. That
is deliberate, and it is the next section.

## Consent, honestly

This add-on does real things to your client, and you should know what you are agreeing to before you
switch any of it on.

**Nothing is enabled by default.** On a fresh install every permission is off, including the master
*Hypnosis Enabled* switch. A brand-new install genuinely does nothing at all until you choose
otherwise — if it seems dead, that is why.

**Your client decides everything.** Another player's add-on can only ever *ask*. Whether a request
lands is settled on your machine, against your settings, every time. A modified hypnotist client has
nothing to read and nothing to override.

**Permissions are per-feature and revocable.** You choose separately whether someone may stop you
moving, silence you, keep you out of your wardrobe, touch your arousal, make you act, hide things
from you, or plant triggers. Turning a permission off releases anything it was holding, immediately.

**Some things are designed to outlive the session.** Trigger words can fire long after the trance
ends, and carried suggestions survive waking. These sit behind their own permissions and a deeper
trance requirement than anything session-scoped, and they fade over time unless reinforced.

**Some things are designed to be deceptive.** The clothing illusion makes your own screen show
clothes you are not wearing. Awareness suppression can hide clothing changes, bondage or touches
from you. These are behind separate permissions for a reason — turn them on only if being misled is
something you actually want.

**The exits, which nothing can take away from you:**

- **`/hypno safeword`** — clears the trance and every effect, from any state. No feature, trigger
  or setting can reach it. It is a slash command, so it still works when you have been silenced.
- **Unticking *Hypnosis Enabled*** — the same total release, from the settings screen.
- **`/hypno wake`** — wake yourself, if the trance is shallow enough.
- Trances time out on their own, and so do most effects.

## Documentation

**[The wiki](https://github.com/Dwfreegethub/HypnosisAddon/wiki)** is the full guide: what to say,
how depth and trust work, triggers, the settings screens, and troubleshooting. Start with
[Getting Started](https://github.com/Dwfreegethub/HypnosisAddon/wiki/Getting-Started).

In-game, the **`?`** button on the settings panel opens the same material as five tabs, and
`/hypno help` opens it from chat. `/hypno` on its own lists what you can type.

## Contributing

Build instructions, the test suite, the repo's rules, and a long list of Bondage Club API traps
worth knowing are in **[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)**. The design and every settled
decision behind it are in [`docs/design.md`](docs/design.md).

## Status

Pre-alpha, v0.73.2. Built and tested against BC R131. Expect rough edges and read
[`docs/design.md`](docs/design.md) before assuming anything is finished.
