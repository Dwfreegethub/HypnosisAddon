# Commands

Most features are **spoken**, not typed. These are the exceptions.

`/hypno` on its own prints a short menu. `/hypno help` opens the in-game guide. `/hypno commands`
lists everything.

## Session — usable from any state

| | |
|---|---|
| `/hypno agree` | Accept an attempt — cooperative, improves their roll |
| `/hypno ignore` | Neither help nor resist |
| `/hypno fight` | Resist — lowers their roll |
| `/hypno wake` | Wake yourself, if the trance is shallow enough |
| **`/hypno safeword`** | **Hard stop. Clears the trance and every effect. Always works.** |
| `/hypno effects` | What is actually on you right now |
| `/hypno session` | What phase you are in, and what you have permitted |

`/hypno safeword` is the floor. No feature, trigger, lock or setting can reach it, and because BC
parses commands before the speech block sees them, it still works when you have been silenced.

`/hypno effects` is the one to reach for after a reconnect, or any time the question is *why can I
not do that* — `session` answers what phase you are in, `effects` answers what is on you, and those
are different questions.

## Diagnostics — look without changing anything

| | |
|---|---|
| `/hypno match <phrase>` | Did those words match? Reports the name gate separately |
| `/hypno chance <name>` | Your real odds for all three choices against that person |
| `/hypno triggers` | Every trigger, its strength, and the tier it still reaches |
| `/hypno carry` | What is currently being carried past waking |
| `/hypno gates` | The depth tier each feature currently needs |
| `/hypno skill` | Your hypnotist experience, and how much others honour it |
| `/hypno storage` | Where your settings actually loaded from |
| `/hypno kneel` · `/hypno stand` | Pose yourself directly, bypassing all gating |

`/hypno match` is the fastest way to bisect "nothing happened": it tells you whether the wording was
the problem, separately from permissions, session and depth.

## Data

| | |
|---|---|
| `/hypno export` | Print your settings as a blob you can save |
| `/hypno import <blob>` | Load one back |
| `/hypno reset confirm` | Wipe everything — releases any trance first, and says so |
| `/hypno triggerdecay [rate]` | Read or set how fast planted triggers fade |
| `/hypno forgettrigger <n>` | Delete a trigger by its number. Refuses while it holds you |
| `/hypno forgettrust <member>` | Forget your relationship history with one person |

## Testing commands

There is a **Testing** group — force-state commands, trigger aging, the test-bot channel — that is
live **only** in a chat room named *Hypno testing*, and off everywhere else and when not in a room.
Outside that room it is not listed in the help and refuses if typed.
