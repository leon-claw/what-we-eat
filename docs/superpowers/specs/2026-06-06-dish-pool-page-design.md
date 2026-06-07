# Dish Pool Page Design

## Goal

Move dish-pool browsing and management out of the home page into a dedicated
page. Keep the home page focused on starting a single-player game, entering a
multiplayer room, and opening the dish pool.

## Navigation

- Add `dish-pool` to the existing `FlowMode` state machine.
- The home page shows a `菜品池` entry beside the two game entry actions.
- Opening the dish pool uses the existing forward page transition.
- The dish-pool back action returns to home with the existing back transition.
- The brand button returns to home when the dish-pool page is active.

## Dish Pool Views

The page owns a local view mode:

```ts
type DishPoolView = "selected" | "all";
```

- The page defaults to `selected` every time it is opened from home.
- A segmented control switches between:
  - `已选菜品（N）`: the current resolved single-player configuration.
  - `总菜品池（N）`: every active selectable option.
- In `all` setup mode, both views contain the same options.
- Selected mode uses the persisted setup preference and continues to ignore
  stale or archived IDs.
- The active segment controls both the heading count and the rendered grid.

## Page Actions

- `重选菜品` is available in the dish-pool page header. It clears the current
  preference and enters the existing reselect flow while preserving the player
  name.
- `新增菜品` remains available on the dish-pool page and opens the existing
  dish form.
- The home page no longer shows either the dish preview list or the reselect
  button.

## Presentation

- Use a compact segmented control rather than separate text buttons.
- Render every option in the active view in a responsive grid.
- Each item shows its image, name, and taxonomy path.
- The page uses an unframed full-width layout; individual dishes are the only
  repeated cards.
- Empty selected state uses a concise message and the reselect action remains
  available.

## Verification

- Home contains no dish preview list.
- Home contains a single `菜品池` entry.
- Opening the page defaults to `已选菜品`.
- Switching to `总菜品池` updates the count and grid.
- `重选菜品` enters the existing no-name reselect flow.
- `新增菜品` opens the existing modal.
- Desktop and 390px mobile layouts have no horizontal overflow.
