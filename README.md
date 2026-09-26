# Erotic Chat Hypnosis Suite (ECHS)

A conversational, text-driven hypnosis framework for [Bondage Club](https://www.bondageprojects.com/club_game/), where how deep someone can take you depends on trust, skill, and mutual desire.

*Formerly "BC Hypnosis Add-on". The repository, installation link, and saved settings are unchanged — only the in-game display name. Not affiliated with or to be confused with HSC (Hypnotic Slave Club).*

> **⚠️ Alpha Testing Notice**  
> **ECHS is currently in active alpha development.** Not all features are fully implemented, balance tuning is ongoing, and mechanics, settings, or syntax may change between updates. Expect occasional rough edges and report unexpected behavior on the repository.

---

## How It Works

One player acts as the hypnotist: they initiate an induction, and your client determines whether the suggestion takes hold and how deep into trance you drift.

From there, suggestions unfold naturally through everyday speech and whispers — *"Missy, you cannot move"*, *"Missy, touch my cheek"*, *"Missy, everything is fading to black"*. Instead of relying on rigid, click-heavy menus, **ECHS** evaluates incoming dialogue against your client settings in real-time, executing only the actions and sensory shifts you have explicitly consented to. Suggestions can outlive the trance, or be planted as subconscious trigger words that fire whenever uttered.

**Everything is off until you turn it on, and `/echs safeword` (or legacy `/hypno safeword`) always works.**

---

## Who It Is For

Players who want immersive, structured hypnosis roleplay:
* A progression system where depth and control are earned through familiarity and trust.
* Natural, dialogue-driven commands over cluttered UI buttons.
* Long-term dynamics featuring carried suggestions and dormant triggers.

While having ECHS installed on both sides delivers the full experience, several mechanics (such as planted trigger words and speech monitoring) function seamlessly on you even if your partner does not run the script.

---

## Core Capabilities

* **Conversational Control:** Induce, deepen, and command entirely through typed room dialogue, whispers, or saved trigger phrases.
* **Sensory Modulation:** Progressive blindness and hearing impairment (garbling, muffled room murmurs, or complete quiet) that strictly respect your native game limits and visual comfort settings.
* **Autonomous & Interpersonal Touch:** Support for directed self-touch, touching the hypnotist, or interacting with room bystanders, gated by current trance depth and room permission lists.
* **Arousal & Orgasm Pacing:** Command-based arousal manipulation, teasing, and edging controls.
* **Deceptive Awareness:** Optional modules for wardrobe illusions and suppressed touch/bondage awareness for deep trance immersion.

---

## Installation

1. Install a userscript manager: [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open the install script: [Install ECHS](https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js). Your userscript manager will prompt you to confirm the installation.
3. Reload Bondage Club and log in.
4. Open your in-game **Preferences**, navigate to **Extensions**, and select **ECHS Hypnosis** to configure your boundaries and triggers.

### No userscript manager? Use the bookmark loader

This also works on phones and tablets.

1. Open the [bookmark loader](https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/bookmarklet.txt) and copy the **whole** line. It starts with `javascript:`.
2. Create a bookmark named **ECHS** and paste that line into its **URL / address** field.
3. Open Bondage Club and click the bookmark. You can do this on the login screen or after logging in.

Click it each time you open the game. It always loads the newest version, and clicking it twice does no harm. Full steps are on the wiki's [Getting Started](https://github.com/Dwfreegethub/HypnosisAddon/wiki/Getting-Started) page.

*Note: Listing on [FUSAM](https://sidiousious.gitlab.io/bc-addon-loader/) is planned for a future release.*

---

## Consent & Safety Architecture

ECHS alters client rendering and interaction dispatch. Safety controls are hardwired into the foundation:

* **Zero-Permission Default:** Every feature, module, and permission starts completely disabled on a fresh install. If the add-on seems inactive, it is waiting for your explicit setup.
* **Client-Side Sovereignty:** Another player's client can only ever *request* an action. Your local client evaluates every single incoming command against your current settings. No external script can force an override.
* **Granular, Revocable Permissions:** You control individual permissions for immobility, muting, sensory impairment, touch targets, arousal control, and triggers. Revoking a permission releases that effect instantly.
* **Emergency Releases Always Available:**
  * **`/echs safeword`** (or `/hypno safeword`) — Instantly breaks trance and wipes every active effect, bypasses all mutes, and cannot be intercepted or disabled.
  * **Unticking *Hypnosis Enabled*** — Immediate full release via the settings screen.
  * **`/echs wake`** (or `/hypno wake`) — Allows subjects to surface independently if their trance is sufficiently shallow.
  * **Automatic Timeouts:** All active trances, freeze states, and sensory blocks expire naturally over time.

---

## Documentation

* **What's New:** See the **[changelog](CHANGELOG.md)** for what changed in each update, in plain language.
* **Full Guide:** Visit the [ECHS Wiki](https://github.com/Dwfreegethub/HypnosisAddon/wiki) for comprehensive guides on commands, depth formulas, trust ratings, and trigger setups.
* **In-Game Help:** Click the **`?`** icon in the ECHS settings panel to read the full manual, or run `/echs help` (or `/hypno help`) in the chat bar.
* **Quick Reference:** Type `/echs` (or `/hypno`) in chat to print a list of active commands.

---

## Contributing & Development

Development rules, testing workflows, and API guidelines are documented in **[`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md)**. Mechanical balance and design decisions are outlined in [`docs/design.md`](docs/design.md).
