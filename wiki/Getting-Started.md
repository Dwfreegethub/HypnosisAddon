# Getting Started

> 🛡️ **EMERGENCY EXIT:** Type `/echs safeword` at any time to break trances and drop all effects immediately.

---

## Installing

1. Install a userscript manager: **[Tampermonkey](https://www.tampermonkey.net/)** or **[Violentmonkey](https://violentmonkey.github.io/)**.
2. Open **[the install link](https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/HypnosisAddon.user.js)** and accept the prompt shown by your userscript manager.
3. Reload Bondage Club and log into your account.
4. Open **Preferences → Extensions → ECHS Hypnosis** to run the setup wizard or tweak your settings by hand.

**Updates are automatic.** The script includes an update URL, so your userscript manager checks for and pulls new versions on its own schedule — you do not need to reinstall to stay updated.

### Without a userscript manager: the bookmark loader

No Tampermonkey or Violentmonkey, or playing on a phone or tablet? Use a bookmark instead.

1. Open **[the bookmark loader](https://raw.githubusercontent.com/Dwfreegethub/HypnosisAddon/main/bookmarklet.txt)**. It is a single line starting with `javascript:`. Copy **all** of it.
2. Make a new bookmark (any page will do, then edit it). Name it **ECHS**, and paste the line into its **address / URL** field in place of the web address.
3. Open Bondage Club, then click the bookmark. ECHS starts, just as the userscript would. You can click it on the login screen or after logging in.

* **Click it each time** you open Bondage Club. A bookmark does not run on its own the way a userscript does.
* **It always loads the newest version**, so there is nothing to update.
* **Clicking it twice does no harm:** it tells you ECHS is already loaded. It also knows if the userscript already loaded it.
* Some browsers remove the `javascript:` part when you paste. If the bookmark does nothing, check the address still starts with `javascript:`.

*(Note: Listing on FUSAM is planned for a future release, but is not yet arranged.)*

**Does the other player need it installed?** For a full, interactive session, yes — both of you need the script running. However, two things will work on you even if your partner has nothing installed:
* **Trigger words:** Matching happens entirely inside your own local client. As long as someone says the word in chat, your script picks it up.
* **Lingering effects:** Any effect or carried suggestion someone applied to you before they left the room will continue running until it expires or is released.

---

## First Run

The first time you load into a room after installing, two status lines will appear in your chat log:

`[Erotic Chat Hypnosis Suite (ECHS) — nothing is switched on yet. Check your settings to set up.]`  
`[Your reactions are visible to the room by default; Trance Defaults turns that off.]`

These appear **once per install** to let you know the script is alive and running safely in the background. You will also see a small black status box in the lower-right corner of your screen showing the add-on name (**ECHS**) and current build version.

### Configuring Your Settings
To configure your permissions or run the setup wizard, navigate to:
* **Preferences → Extensions → ECHS Hypnosis**

Here, you can choose one of four starting templates, each applied with one click:
* **[Hypnotist only](Settings-Reference#9-setup-wizard)** — you hypnotize others; nobody can hypnotize you.
* **[Light / safe](Settings-Reference#9-setup-wizard)** — poses and being held still, nothing more. A trance never silences you, and you are always asked first.
* **[Balanced](Settings-Reference#9-setup-wizard)** — movement, poses, speech, touch, undressing, arousal and the wardrobe, plus triggers from people close to you.
* **[Extreme](Settings-Reference#the-extreme-lock)** — everything on, easy to reach, no questions asked. It **locks your settings read-only for a week** (see [Settings Reference](Settings-Reference#the-extreme-lock)) and asks you to confirm first.

Or answer five short questions instead (your role, how attempts are handled, what physical commands you allow, your senses, and triggers). Every page has a **Cancel** button that changes nothing. You can re-run setup or change any setting by hand afterward, outside an active session.

### Instant Trance: Toy Mode
If you prefer hands-free play with an owner or partner without seeing induction confirmation boxes:
1. Open **Preferences → Extensions → ECHS Hypnosis → Inductions**.
2. Set **Toy mode** to **On**.
3. Choose who it applies to under **Toy mode is for** (default *Owner and Lovers*; it can widen to *Owner, Lovers and whitelist* or further).

When an authorized partner attempts an induction, **no prompt box appears**. You slip immediately into trance down to your configured *"Sink deeper" stops at* ceiling. Your safeword (`/echs safeword`) always works. See [How an Induction Works](How-Inductions-Work#7-answering-ahead-of-time-being-away-and-toy-mode).

### Initiating Hypnosis via Profiles
Once installed, when you click on any player to open their profile screen, you will see a **spiral icon on the left side** of their profile card. 

Clicking that spiral opens their hypnosis panel, where **Attempt Hypnosis** sends the induction request.

**Or type it:** `/echs induce <name>` (for example `/echs induce Missy`) does exactly the same from chat, and `/echs retry` tries the same person again. See [Commands](Commands#starting-a-hypnosis--for-the-hypnotist).

---

## If Nothing Seems to Be Happening

**That is completely normal.** On a fresh install, every single permission begins switched off, including the master switch. Until you complete the wizard or enable modules by hand, the add-on does nothing at all.

---

## What to Switch on First

If you want to get a feel for how sessions work without diving into deep changes, starting with shallow, session-scoped permissions is best. These clear out automatically the moment a trance breaks, leaving nothing behind:

* **Movement Restriction** — *"you cannot move"* (freezes)
* **Speech Restriction** — *"you cannot speak"* (mutes)
* **Posture Control** — pose commands: kneel, stand, spread, all fours, arm positions
* **Clothing Restriction** — prevents wardrobe access during trance

It is best to leave **Clothing Illusion**, **Sensory Modulation**, **Triggers**, and **Carry-Forward** off until you have skimmed **[Consent and Safety](Consent-and-Safety)**. Those features either outlive the session, alter your visual perception, or mislead your client, and they carry stricter safeguards for that reason.

---

## Finding Help Later

* Click the **`?`** button on the ECHS settings panel to open the built-in guide.
* Type **`/echs help`** in chat to open the manual directly from your text box.
* Type **`/echs`** on its own to print a quick cheat sheet of commands in chat.

---

## Next Steps

* → **[A Sample Session](Sample-Session)** — A walkthrough of a real session from start to finish.
* → **[What to Say](What-to-Say)** — The full vocabulary and sentence structures recognized by the parser.
* → **[Consent and Safety](Consent-and-Safety)** — Essential reading on client boundaries and emergency exits before turning on deeper modules.
