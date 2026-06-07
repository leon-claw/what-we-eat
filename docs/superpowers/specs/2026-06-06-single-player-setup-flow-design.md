# Single Player Setup Flow Design

## Goal

Replace the global name modal with a mandatory page-based startup flow based on
the approved ProcessOn diagram. Users complete this flow before reaching the
home page where a game can be started.

## Routes

### Direct setup

`Startup choice -> Name -> Home`

- The configured single-player deck uses every active selectable food option.
- The name page is still shown even when a saved name exists.
- A saved name pre-fills the input.

### Filtered setup

`Startup choice -> Categories -> Options -> Name -> Home`

- Category selection is multi-select.
- Option selection is multi-select and only shows options from selected
  categories.
- At least one category and one option are required.
- A three-step indicator appears on all filtered setup pages.
- Returning from options to categories preserves selections. Options belonging
  to a category removed before continuing are discarded.

### Starting a game

`Home -> Single player -> Swipe`

- The home page is unavailable until startup setup is complete.
- The home page only presents single-player and multiplayer game entry.
- Single-player uses the deck configured by the startup flow.
- A completed guest setup is restored from local storage and skips directly to
  home. An actively restored multiplayer room may continue directly to its room
  page.

### Reselecting dishes

`Home -> Reselect -> Startup choice`

- Reselecting clears the previous dish preference immediately and restarts the
  setup choice.
- The saved player name is preserved.
- Direct mode saves immediately and returns home.
- Filtered mode uses `Categories -> Options -> Home` with a two-step indicator.
- A future account-backed store can replace the guest store without changing
  the setup flow.

## Page Behavior

- Every setup step is a full page in the existing app shell.
- Forward navigation slides and fades in from the right.
- Back navigation slides and fades in from the left.
- Reduced-motion users receive no transition animation.
- Multiplayer room entry remains unchanged and continues to collect its
  nickname in the room form.
- The header name control opens the name page in edit-only mode and returns to
  home after saving.
- Header controls cannot bypass the mandatory startup flow.

## Round Snapshot

Completing startup stores a versioned preference, not a resolved option
snapshot:

```ts
type SingleSetupPreference =
  | { version: 1; mode: "all" }
  | { version: 1; mode: "selected"; optionIds: string[] };
```

- `all` resolves against every current active selectable option, so later
  additions appear automatically.
- `selected` resolves explicit option IDs in taxonomy order. Missing, archived,
  or non-selectable options are ignored.
- If a selected preference resolves to no options, it is cleared and setup is
  required again.
- Starting a single-player round snapshots the currently resolved deck into
  `singleSessionOptions`. Restarting that round continues to use the snapshot.

## Storage Boundary

The setup flow depends on a small preference-store interface with `load`,
`save`, and `clear` methods. The guest implementation uses local storage. A
future authenticated implementation can persist the same preference under an
account without exposing storage concerns to the UI.

## Scrolling

- The page remains vertically scrollable on all views.
- The active swipe card uses `touch-action: pan-y`: horizontal gestures remain
  available to the card engine while vertical gestures scroll the page.

## Verification

- The first visible page is the startup choice, not the home page.
- Direct setup enters the name page without a step indicator and reaches home
  with the complete option count.
- Filtered setup enforces category and option selection before reaching home.
- The step indicator displays `选择分类 -> 选择菜品 -> 输入名字`.
- Refreshing after setup opens home with the restored configured option count.
- Reselecting clears the old preference, preserves the name, and skips the name
  step.
- All mode includes options added after the preference was saved.
- A selected preference ignores stale IDs and forces setup when none remain.
- Starting a filtered single-player game contains exactly the chosen options.
- Button and gesture voting continue to work.
- Desktop and mobile layouts do not overflow and can scroll vertically.
