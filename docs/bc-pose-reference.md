# BC Pose Reference

Verified by DW against upstream `Typedef.d.ts`, 2026-09-23, and pasted into the pose-library thread.
`POSE_GROUPS` in `src/effects.ts` is built from this. DW's fuller copy carries per-claim sourcing;
this is the summary as pasted.

## Complete catalogue — 15 poses. Anything not listed is not a pose.

| Category | Poses |
|---|---|
| BodyHands | TapedHands |
| BodyUpper | BaseUpper, BackBoxTie, BackCuffs, BackElbowTouch, OverTheHead, Yoked |
| BodyLower | BaseLower, Kneel, KneelingSpread, LegsClosed, Spread |
| BodyFull | Hogtied, AllFours |
| BodyAddon | Suspension |

## Corrections to common wrong names

| Wrong | Correct |
|---|---|
| OverHead | OverTheHead |
| HandsBehindBack | BackCuffs |
| Yoke | Yoked |
| ArmsCrossed / CrossedArms / Crossed | Does not exist. BC has no crossed-arms pose |
| Sit / SitClosed | Not a pose. Sitting is furniture/item-driven. "Sit" exists only as an activity |
| Surrender | Does not exist. Closest is OverTheHead |

## Neutral / reset

- `null` or `""` are both accepted; upstream admits this is inconsistent. Prefer `null`.
- Explicit neutrals are `BaseUpper` and `BaseLower`.

## Standalone vs item-locked

- `AllowMenu` on the pose object = freely settable by the player.
- `AllowMenuTransient` = only available if a worn item supports it.
- `Character.CanChangeToPose(name)` is the live per-character check. Prefer it over any static list.
- Items declare `Can<PoseName>` prerequisites and can force poses via `Property.SetPose`.

## API shapes differ — the wrong one fails silently

- Client: `CharacterSetActivePose(Player, "Kneel")` — single name, null resets
- Bot library: `Player.SetActivePose(["OverTheHead", "Kneel"])` — array, [] resets

## Setting a pose is LOCAL ONLY

`CharacterSetActivePose` changes nothing for anyone else. It must be followed by:

    ServerSend("ChatRoomCharacterPoseUpdate", { Pose: Player.ActivePose })

In this add-on that is handled by `setSuggestedPose()` in `src/effects.ts`. All pose code goes
through that helper; never call `CharacterSetActivePose` directly.

## Unconfirmed

The runtime identifier of the catalogue array is expected to be `PoseFemale3DCG` but is NOT
verified. Do not code against it. Confirm in the BC console first:

    Object.keys(window).filter(k => /^Pose|Pose$/.test(k) && Array.isArray(window[k]))
      .map(k => ({ global: k, len: window[k].length, sample: window[k][0] }))

Also not read: the body of BC's pose setter, so that setting one category leaves the others alone
is inferred from the categories, not seen. *Needs Testing* item 17, step 1, checks it live.
