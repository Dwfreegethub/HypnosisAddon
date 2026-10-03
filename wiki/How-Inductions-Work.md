# How an Induction Works

> **New in v0.97.** How deep you go now comes from **how well you know the hypnotist**, not from luck. The roll still decides *whether* an induction takes, but once it does, trust, your relationship and your answer decide how deep you go, give or take a few points. Before v0.97, a single roll decided both, so a hypnotist you barely knew could drop you to Blank one time and to Drifting the next.
>
> Also new: you can answer every induction ahead of time, choose what happens while you are away from the keyboard, turn on **toy mode** for people you choose, and push your way **up** out of a trance by fighting it.

This page explains the whole thing in plain words, with the real numbers underneath for anyone who wants them. To see your own numbers with someone in the room, type:

```text
/echs chance <name>
```

---

## 1. Two separate questions

Every induction asks two things, one after the other:

1. **Does it take?** A roll against a chance from 5% to 95%.
2. **How deep?** Decided mostly by who they are to you. The roll plays no part here; only a small random spread of a few points is added.

A hypnotist you trust will land you at roughly the same depth every time. A stranger may get you to take it now and then, but only lightly.

---

## 2. Does it take?

These add up to the chance:

| What | Effect |
|---|---|
| **Your trust in them** | The biggest part. Trust 40 adds 40. |
| **Your BC relationship** | Counts as trust of at least **15** for a friend, **30** for a lover, **65** for an owner. |
| **Your arousal** | Adds up to **+25** at a full meter. Only if your BC arousal meter is on *Hybrid* or *Automatic*, and your Depth tab lets arousal count. |
| **Your answer** | **Agree +25**, Ignore 0, **Fight −25**. |
| **Their words** | Up to **+15** for describing the induction in chat while the box is up (+5 per line, 15 characters or more, no repeats). |
| **Their skill** | Up to **+35**, but only as much as you allow in your Depth tab (*A hypnotist's skill*). A stranger's claimed skill counts for at most 30 by default. |
| **Your practice** | Up to **±20**: the more inductions you have been through, the more it helps when you Agree and the better you resist when you Fight. |

Fighting always keeps a small chance (at least 5%, a little more against a skilled hypnotist), and fighting is never better for them than ignoring.

**"I trust you."** Saying *"I trust you, Eri"* (or `/echs trust Eri`) means Eri's next induction within 5 minutes skips the box and goes ahead as **Agree**, with your trust counted as at least 65. See [Your First Session](Your-First-Session#giving-your-trust-ahead-of-time).

---

## 3. How deep?

Once it takes, your depth is:

* **half your trust in them** (trust 60 → 30),
* **plus half your relationship's depth**: a lover adds **20**, an owner **30**,
* **plus your answer**: **Agree +20**, Ignore 0, **Fight −20**,
* **plus**, for the moment only, a little for their skill (up to +20) and your arousal (up to +15),
* **plus or minus a few points** (2d10 − 11: −9 to +9, usually close to 0).

**Floors.** Unless you fight, you never land shallower than:

* **Entranced** (40) with a lover, **Deep** (60) with an owner,
* **half your trust** in them, whoever they are.

Fighting removes the floors. If fighting (or a very low trust) would land you at nothing, **it slips away**: you feel it nearly take you, and it counts as a miss.

The deepest an induction ever lands is 95.

### Earned depth and "in the moment" depth

Skill and arousal take you deeper **for now**, but they never count toward **earned depth**. Triggers, the clothing illusion and suggestions that outlive the trance need earned depth by default. A skilled stranger can't plant anything in you, and nor can arousal on its own. See [Depth and Trust](Depth-and-Trust).

---

## 4. Some examples

With no skill, no practice, no arousal and nothing said during the box. Depth is rounded.

| Who | Trust | Agree | Ignore | Fight |
|---|---|---|---|---|
| **A stranger** | 0 | 25% · lands 11–29 (Drifting–Yielding) | 5% · usually slips away, else Drifting | 5% · slips away |
| **A friend** | 10 | 40% · lands 16–34 | 15% · lands 5–14 (Drifting) | 5% · slips away |
| **A lover** | 20 | 55% · lands 41–59 (Entranced) | 30% · lands 40 (Entranced) | 5% · lands 1–19 (Drifting) |
| **An owner** | 20 | 90% · lands 60–69 (Deep) | 65% · lands 60 (Deep) | 40% · lands 11–29 |
| **Someone you trust a lot** | 80 | 95% · lands 51–69 | 80% · lands 40–49 | 55% · lands 11–29 |

The tiers are Drifting 0–19, Yielding 20–39, Entranced 40–59, Deep 60–79, Blank 80–100. How deep each feature needs you to be is a number you can set in your Depth tab.

---

## 5. Going deeper once under

A hypnotist can say *"Missy, sink deeper"* (or *go deeper*, *drop deeper* and so on). It's a roll:

* It starts at 40%. **Trust**, **skill**, **arousal**, **your answer** (Agree +20, Fight −25) and **time under** (+2 a minute, up to +20) all help or hurt. So does your **practice** when you Agree. **The deeper you already are, the harder it gets.** It is never below 10% or above 95%, and it always takes if you gave them your trust.
* **A success takes you 15–25 deeper** while you are below Entranced, 10–15 from Entranced, and 5–10 from Deep. It takes you 5 more if your trust in them is over 60, or they own you.
* **At most once a minute**, and only after one of their suggestions has landed in between.
* **Your limit:** your Inductions tab's *"Sink deeper" stops at* (Entranced unless you change it, or *Never deeper*). It never raises earned depth.

See [What to Say](What-to-Say#going-deeper-mid-trance) for the phrases.

---

## 6. Fighting your way up

If you answered Fight, or type `/echs fight` while under:

* Every deepening is harder, and **one that misses may bring you up instead**.
* Typing `/echs fight` while under is a push of its own, straight away.
* At most **one push a minute**, whatever sets it off.
* Your chance is best when you are shallow (55% at Drifting, down to 10% at Blank), and grows with your practice. Their skill, your trust in them and your arousal make it harder. It is never below 3% or above 75%.
* **A win brings you up 20–30** below Entranced, 10–15 from Entranced, and 5–10 from Deep. Up past the surface, and you wake.
* Only you are told when a push fails. The hypnotist is told when you come up, but never which answer you chose.

`/echs agree` or `/echs ignore` stops fighting. `/echs safeword` always ends everything at once.

---

## 7. Answering ahead of time, being away, and toy mode

All on the **Inductions** tab. See [Settings Reference](Settings-Reference#2-inductions-tab).

* **When someone tries to hypnotize me:** *Ask me* (the default), *Agree*, *Ignore* or *Fight*. Anything but *Ask me* answers every induction for you with no box. The hypnotist is never told which.
* **When I'm away:** after 10 minutes with no key, click or touch, you are *away*.
  * *Refuse* (default): automatic answers and toy mode turn them away. They are told you are away from the keyboard, and you are told who tried.
  * *Ignore*: you are treated as Ignore, and toy mode is off.
  * *Keep my answer*: being away changes nothing.
* **Toy mode** (off by default): for the people you choose, an induction puts you **straight under to your "sink deeper" limit**, with no box, no roll, no attempt limit and no waiting. It counts as earned depth, so if your limit is Deep or Blank, that includes triggers. If your limit is *Never deeper*, it still takes without a roll, as if you had agreed.
* **Toy mode is for:** the same choices as trigger scope: *Owner only*, *Owner and Lovers* (default), adding your whitelist, adding Dominants, *Everyone except blacklist*, or *Everyone*.

The safeword always works, in every one of these.

---

## 8. Tries and waiting

Each hypnotist gets **2 tries** in a row (you can make it 3 on the Inductions tab). When they run out, they must wait **10 minutes** before trying you again. Every refusal is told to the hypnotist in chat, with how long to wait. A trance ends on its own after **30 minutes**.

**If the hypnotist leaves the room:**
* **Before the induction lands:** it is given up if they are not back within about 30 seconds, or are gone when it would land. It does **not** use up one of their tries.
* **During a trance:** you are told *"[name] is not in the room. If they are not back within 5 minutes, this ends on its own."* If they return in time you are told they are back, and the trance carries on. If not, it ends exactly like any other ending. Triggers they planted and suggestions carried past waking stay.

---

## 9. How the numbers grow

* **Trust** in a person grows as you talk: one step at most every 5 minutes per person, double if they speak to you by name or whisper, and 5 steps for every induction of theirs that takes. It rises fast at first and slows near the top: about **50** after an hour or two of real conversation, **90** only after many sessions together. Your Stats tab can make it fade when you don't see someone (it never fades unless you set it to).
* **Your practice** grows with every induction you go through, a little more when it takes, and a little with every deepening.
* **A hypnotist's skill** grows on their own client with every induction they try, more when it takes. You decide how much of it to believe.

None of these ever reset on their own.
