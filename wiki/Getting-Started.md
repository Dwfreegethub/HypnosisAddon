# Getting Started

> 🛡️ **EMERGENCY EXIT:** Type `/echs safeword` at any time to break trances and drop all effects immediately.

---

## Installing

### The easy way: FUSAM

ECHS is listed on **[FUSAM](https://sidiousious.gitlab.io/bc-addon-loader/)**, the add-on manager many players already use for other Bondage Club add-ons.

1. If you don't have FUSAM yet, install it from **[its page](https://sidiousious.gitlab.io/bc-addon-loader/)**.
2. In Bondage Club, click the **Addon Manager** button. It is on the login screen and in **Preferences**.
3. Find **Erotic Chat Hypnosis Suite (ECHS)** and set it to **stable**. Choose **Account** to have it on every device you log in from, or **Browser** for just this one.
4. Reload Bondage Club and log in, then open **Preferences → Extensions → ECHS Hypnosis** to run the setup wizard.

**Updates are automatic:** FUSAM loads the newest stable version every time. The **dev** option gets changes before they are released, but those have had less testing.

**Only use one way to load ECHS.** If you switch to FUSAM from the userscript or the bookmark, remove the old one. If two are left on, only the first one starts, and it says so in the browser console.

### With a userscript manager

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
* **[Hypnotist only](Settings-Reference#10-setup-wizard)** — you hypnotize others; nobody can hypnotize you.
* **[Light / safe](Settings-Reference#10-setup-wizard)** — poses and being held still, nothing more. A trance never silences you, and you are always asked first.
* **[Balanced](Settings-Reference#10-setup-wizard)** — movement, poses, speech, touch, undressing, arousal and the wardrobe, plus triggers from people close to you.
* **[Extreme](Settings-Reference#the-extreme-lock)** — everything on, no questions asked: anyone not on your blacklist can put you straight under, and triggers can be added but not removed while it lasts. It **locks your settings read-only for a week** (see [Settings Reference](Settings-Reference#the-extreme-lock)) and asks you to confirm first.

Or answer five short questions instead (your role, how attempts are handled, what physical commands you allow, your senses, and triggers). Every page has a **Cancel** button that changes nothing. You can re-run setup or change any setting by hand afterward, outside an active session.

---

## Your First Induction

### If You're the Hypnotist

1. **Start it.** Open their profile and click the **spiral icon** with the game's own buttons, then **Attempt Hypnosis**. Or type `/echs induce Missy` in chat, which does the same. Or open **[the ECHS popup](The-ECHS-Popup)** (the round spiral button in the room) and click their name. The icon shows on everyone, because ECHS can't tell who has it until it asks; within about three seconds the panel says whether they do.
2. **Use the induction window.** It runs 60 seconds, or less if they have shortened it (as low as 10). It is there for roleplay, and it counts: each line you write describing the induction adds to your chance, up to a cap.
3. **See how it went.** If it takes, you are told roughly how deep they went (*drifting, yielding, entranced, deep* or *blank*). If not, how close it came (*barely responsive* up to *almost under*), never numbers. You get **2 tries** (they can allow 3), then wait 10 minutes. `/echs retry` tries the same person again.
4. **Talk.** Say suggestions in ordinary chat with their name, *"Missy, you cannot move"*, or whisper them, which needs no name. Each one takes hold 2 to 5 seconds later. If one can't, you are told which check stopped it. The phrases are on **[What to Say](What-to-Say)**.
5. **Wake them** with *"Missy, wake up"*, or **Wake Up** on their profile panel.

A trance holds them still by default. *"Missy, walk with me"* lets them move while staying under, and *"Missy, be still"* holds them again.

### If You're the Subject

1. **Answer the box.** When someone starts an induction, a box asks you to **Agree** (it lands more easily and you go deeper), **Ignore**, or **Fight** (much harder to land, and you stay shallow). Nobody is told which you chose, and doing nothing counts as Ignore. If another screen is covering the box, type `/echs agree`, `/echs ignore` or `/echs fight`.
2. **Going under.** The roll only decides whether it lands. How deep you go comes mostly from who they are to you: your trust in them and your BC relationship. The numbers are on **[How an Induction Works](How-Inductions-Work)**.
3. **While you are under,** what lands is shown to you in [brackets], privately. You can change your answer at any time, and `/echs fight` while under pushes back up (see [Fighting your way up](How-Inductions-Work#6-fighting-your-way-up)).
4. **Getting out.** The hypnotist wakes you, or the trance ends on its own after 30 minutes (you are asked if you want to stay under). In a shallow trance `/echs wake` works for you, and **`/echs safeword` always works**, from any state.

**Skipping the box.** Say *"I trust you, Eri"* and Eri's next induction within 5 minutes goes ahead as Agree. On the **Inductions** tab you can answer every induction ahead of time, or turn on **toy mode** so the people you choose put you under with no roll. Both are explained on **[How an Induction Works](How-Inductions-Work#7-answering-ahead-of-time-being-away-and-toy-mode)**.

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

* Click the round **spiral button** in a chat room for **[the ECHS popup](The-ECHS-Popup)**: it types commands and suggestions for you.
* Click the **`?`** button on the ECHS settings panel to open the built-in guide.
* Type **`/echs help`** in chat to open the manual directly from your text box.
* Type **`/echs`** on its own to print a quick cheat sheet of commands in chat.

---

## Next Steps

* → **[A Sample Session](Sample-Session)** — A walkthrough of a real session from start to finish.
* → **[How an Induction Works](How-Inductions-Work)** — Why an induction lands, how deep, and how to skip the box.
* → **[What to Say](What-to-Say)** — The full vocabulary and sentence structures recognized by the parser.
* → **[Consent and Safety](Consent-and-Safety)** — Essential reading on client boundaries and emergency exits before turning on deeper modules.
