# Your First Session

> **Alpha Notice**  
> ECHS is in active alpha development. Real-time feedback, induction balancing, and diagnostic outputs are continually being refined. Both `/echs` and `/hypno` are fully recognized prefixes.

---

> **Looking for a worked example instead?** [A Sample Session](Sample-Session) walks through an entire scene with two named characters and the exact lines typed in chat. **This page is the diagnostic companion** — covering what each player controls, how inductions function under the hood, and why an attempt often doesn't land on the first try.

---

## 1. From the Hypnotist's Side

### Step 1: Open Their Profile and Click the Spiral Icon
The spiral icon is visible on every player's profile card because client-side extensions cannot detect third-party add-ons without sending a ping. Clicking it sends a quiet background query. Within about three seconds, the panel will either open or inform you that the target is not running the add-on, complete with a *Check again* button. The icon remains visible regardless, ensuring the profile card never becomes a public list of who has the script installed.

### Step 2: Click "Attempt Hypnosis" (or type `/echs induce <name>`)
*Prefer the keyboard?* **`/echs induce Missy`** in chat does exactly the same as the button, and **`/echs retry`** tries the same person again after a miss.

The target receives a private induction dialog offering three choices: **Agree**, **Ignore**, or **Fight**. You are never told which option they picked. Silence for 60 seconds automatically defaults to Ignore.

### Step 3: Use the Induction Window
You have a 60-second window while the prompt is active. This window is designed for roleplay, and roleplaying during it genuinely impacts the outcome: every line you speak adds to your induction roll up to a built-in cap.

### Step 4: The Induction Roll
When the window closes, the subject's client calculates the roll:
* **Success:** You receive a broad, descriptive status indicating how deep they dropped (*drifting, yielding, entranced, deep,* or *blank*).
* **Failure:** You receive a status indicator describing how close the attempt was (*barely responsive, slightly relaxed, more relaxed,* or *almost under*). Never raw numbers.

Hypnotists get **two attempts by default** before a 10-minute cooldown engages (the subject can configure this to three attempts in their settings).

### Step 5: Speak Naturally
Once they are under, deliver suggestions using ordinary chat dialogue:
> *"Missy, you cannot move."*

If permissions and depth gates align on their end, the suggestion executes. **Always include their character name** — suggestions require addressing the target directly.

---

## 2. From the Subject's Side

### Step 1: Respond to the Prompt
When an induction begins, a dialog appears on your screen with a 60-second timer:
* **Agree:** Significantly boosts the hypnotist's roll.
* **Fight:** Substantially penalizes their roll.
* **Ignore:** Neutral modifier (identical to letting the timer expire in silence).

Your choice is completely private and is never disclosed to the hypnotist. You can also respond via chat commands:
* `/echs agree` (or `/hypno agree`)
* `/echs ignore` (or `/hypno ignore`)
* `/echs fight` (or `/hypno fight`)

This is especially helpful if your wardrobe or another UI screen is open when the prompt lands.

### Step 2: Going Under
If the attempt succeeds, your client enters a trance state. The resulting depth tier depends on the roll margin: a narrow success leaves you in a light, shallow trance, while a decisive success sends you deeper.

### Step 3: Receiving Suggestions
When a spoken suggestion passes all checks, your client applies the effect and displays a private notification in brackets. If a suggestion is blocked, the *hypnotist* receives private diagnostic feedback explaining which gate stopped it, preventing scene confusion.

### Step 4: Exiting the Scene
You are always in control of your boundaries. See [Consent and Safety](Consent-and-Safety) for full details. 

The universal exit:

`/echs safeword` (or `/hypno safeword`)  
Instantly clears active trances, releases any trigger holding you, and restores all character controls from any state. Slash commands always bypass speech restrictions.

*(Note on Waking:* In a shallow trance, the subject can surface on their own with `/echs wake`; a deep trance refuses and says so. Otherwise a trance ends when the hypnotist speaks a wake phrase like *"Missy, wake up"*, clicks the Wake Up button on their panel, when the session timer expires, or with the safeword).*

---

## 3. Why Nothing Happened (The Four Gates)

Every hypnotic suggestion is evaluated against four sequential gates on the subject's client:

1. **Permission Gate:** The specific feature must be enabled in the subject's **Permissions** settings.
2. **Session Gate:** There must be an active, valid trance session bound to that specific hypnotist.
3. **Name Gate:** The subject's character name must appear in the chat line.
4. **Depth Gate:** The subject's current trance depth must meet or exceed the threshold assigned to that feature on their **Depth** tab.

A phrase can match the dictionary perfectly and still fail if the subject is not deep enough. Use `/echs match <phrase>` (or `/hypno match <phrase>`) to verify wording and test the name gate independently.

---

## 4. The Walking Trance

A subject immobilized by default trance settings can be difficult to move around the club. To keep a scene mobile:

* *"Missy, walk with me"* engages a **walking trance** — the subject remains under trance and fully suggestible, but regains movement while the visual screen veil thins to a faint hint.
* *"Missy, be still"* restores standard hypnotic immobility.

The walking trance provides roleplay flexibility without altering current depth tiers or permission settings.
