# Depth and Trust

> **Alpha Notice**  
> ECHS is in active alpha development. Depth curves, interaction scaling, and roll balances are actively being tuned. Both `/echs` and `/hypno` are fully recognized prefixes.

---

You do not need to memorize formulas or understand the underlying math to play. At its heart, ECHS relies on two simple questions:

* **Permission:** *May they ever do this to me?* (Checked in your Permissions menu).
* **Depth:** *How far under do I need to be before it works?* (Checked against your current trance state).

Both must pass every time. Giving someone permission to undress you doesn't mean they can strip you on greeting — they still have to guide you deep enough into trance first.

---

## The Five Depth Tiers (Defaults)

Depth is measured on a scale from 0 to 100, divided into five recognizable tiers. 

*Remember: All tier thresholds and feature assignments are completely customizable in your **Depth** tab. Moving a command to a deeper tier is a comfort setting, not a skill challenge.*

| Tier | Default Range | What It Feels Like | Default Features Unlocked |
|---|---|---|---|
| **Drifting** | 0–19 | Barely under; light, floating headspace. | **Awareness Suppression:** Not noticing clothing changes, ropes, or casual touches. |
| **Yielding** | 20–39 | Noticeably affected; suggestions start taking physical hold. | **Physical Restrictions:** Freezing, muting, posture (kneeling, standing, and every leg and arm pose), wardrobe lock, self-touch block, and commanded touch (on herself, the hypnotist or someone else). |
| **Entranced** | 40–59 | Clearly under; conscious willpower steps aside. | **Surrender:** Leash/follow, involuntary undressing, arousal control, forced climaxes, and triggers that make you speak. |
| **Deep** | 60–79 | Heavy trance; minimal self-direction. | **High-Impact:** Clothing illusions\*, planting dormant triggers\*, carry-forward waking suggestions\*. |
| **Blank** | 80–100 | Fully receptive; thought and resistance fade. | Deepest trance; maximum suggestibility. |

*\*Requires **Earned Depth** by default (trust built over time), meaning quick arousal spikes cannot unlock them.*

---

## How You Reach Depth (The Simple Version)

You don't need a spreadsheet to play. Your receptivity to a hypnotist comes down to three natural factors:

1. **Familiarity & Trust:** Spending time together, talking in room chat, and participating in successful sessions builds a local trust score on your machine.
2. **Relationships:** Established Bondage Club relationships give your partner an immediate natural baseline:
   * **Friends:** Get a slight head start in the door.
   * **Lovers:** Start with enough baseline depth to reach physical suggestions and arousal control.
   * **Owners:** Automatically have enough baseline access to reach everything you've permitted.
3. **Arousal (The Heat of the Moment):** Being worked up lowers your natural resistance. A full arousal meter adds a quarter of itself to the landing chance, and up to 15 points to how deep you go. But arousal alone can *never* leave triggers behind or alter your perception: it never counts toward earned depth.

**How deep an induction lands.** The roll only decides whether it lands. How deep comes from your trust, your relationship (a lover holds you at Entranced, an owner at Deep), their skill, your arousal, and your answer: Agree takes you 20 deeper, Fight 20 shallower and lets you land below those floors, give or take a few points either way. A landing at nothing slips away and counts as a miss. `/echs chance <name>` shows where each answer would land.

**Going deeper once under.** The induction sets where you start. After that, a hypnotist can say *"Missy, sink deeper"* to take you further, as a roll, at most once a minute and only after a suggestion of theirs has landed. Shallow, one success goes a long way; already deep, only a little. Your Depth tab's *"Sink deeper" stops at* setting is how far it can go (Entranced unless you change it, or off). It never reaches the earned-only features. See [What to Say](What-to-Say#going-deeper-mid-trance).

Want to see exactly where you and a partner stand? Type:
```text
/echs chance <name>
