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

### Fighting It Once You Are Under
Your choice at the prompt lasts the whole trance, and you can change it while under: `/echs fight`, `/echs agree` or `/echs ignore`. It matters when the hypnotist tries to take you deeper (*"sink deeper"*):
* **Fighting** makes each deepening harder, and one that misses may bring you **up** instead. Far enough, and that wakes you.
* Typing `/echs fight` while under is a push of its own, straight away. You get at most one push a minute, whatever sets it off.
* The shallower you are and the more practised, the better your chance of fighting up, and the further a win takes you. Their skill, your trust in them and your arousal make it harder.
* `/echs chance <name>` shows both odds while you are under with them. The hypnotist is never told which you chose, though they see you come up.

### Giving Your Trust Ahead of Time
If you already know you want to go under for someone, say so in the room: *"I trust you, Eri"* (or *"Eri, I trust you"*, or whisper *"I trust you"* to them). You can also type `/echs trust Eri`.

* **Their name is needed.** A bare *"I trust you"* said to the room goes to no one, and you are told how to say it.
* **For the next 5 minutes,** if Eri starts an induction on you, the prompt does not appear. It goes ahead as **Agree**.
* **Your trust in them counts as at least 65** for that induction and the trance it leads to, so it is more likely to land. It reaches ordinary suggestions and arousal. It does **not** reach triggers, suggestions that outlive the trance, or the clothing illusion, which still need trust you have really built.
* **It is used up by that one induction**, however long the trance lasts. The next time, you are asked again. If Eri does not try within 5 minutes, it lapses.
* Said while Eri's prompt is already on your screen, it answers it as Agree.
* Your safeword clears it. Nothing about it is saved: a reload forgets it.

### Step 2: Going Under
If the attempt succeeds, your client enters a trance state. The roll only decides *whether* it lands. How deep you go comes from your trust in them, your BC relationship, their skill, your arousal and your answer (Agree takes you deeper, Fight keeps you shallow), give or take a few points. Trust and a relationship hold you at least so deep, unless you fight. If it would land at nothing, it slips away and counts as a miss.

### Answering Ahead of Time
On the Permissions tab you can answer every induction before it happens: **Agree**, **Ignore** or **Fight**, with no box. The hypnotist is never told which. If you are away from the keyboard (10 minutes with no key, click or touch), your *When I'm away* setting decides: turn them away (the default), treat it as Ignore, or keep your answer.

**Toy mode**, on the same tab, is for when you want to be put under with no roll at all: for the people you choose (lovers and up by default), an induction puts you straight under to your *"sink deeper"* limit, with no attempt limit. That includes triggers, if your limit is Deep or deeper. It follows your *When I'm away* setting too, and the safeword always works.

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
