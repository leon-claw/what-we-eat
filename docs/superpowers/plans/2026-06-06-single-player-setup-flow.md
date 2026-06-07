# Single Player Setup Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mandatory startup setup flow that configures the single-player deck before the home page, and restore vertical scrolling during swipe gestures.

**Architecture:** Keep transient setup selections in `App`, start on a dedicated setup-choice view, and snapshot the resolved deck when the name step submits. The home page starts games from that snapshot. Allow vertical browser gestures on the swipe card with `touch-action: pan-y`.

**Tech Stack:** React 19, TypeScript, Vitest, CSS

---

### Task 1: Setup option resolution

**Files:**
- Create: `src/lib/singleSetup.ts`
- Create: `src/lib/singleSetup.test.ts`

- [x] Test and implement category filtering, stale option removal, direct deck
  resolution, and filtered deck resolution.

### Task 2: Page-based setup state

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`

- [x] Add category, option, and identity views.
- [x] Remove the startup identity modal.
- [x] Snapshot the chosen options before starting a single round.
- [x] Keep multiplayer nickname validation inside the room page.

### Task 3: Setup pages and navigation

**Files:**
- Modify: `src/App.tsx`

- [x] Replace the single entry with direct and filtered actions.
- [x] Add category and option multi-select pages.
- [x] Add the page-based name form and filtered-route step indicator.
- [x] Preserve selections while navigating backward.

### Task 4: Responsive motion and presentation

**Files:**
- Modify: `src/styles.css`

- [x] Add forward/back page transitions and reduced-motion handling.
- [x] Add responsive stepper, selection grids, selected states, and sticky
  setup actions.

### Task 5: Verification

- [x] Run `npm test`, `npm run build`, and `git diff --check`.
- [x] Verify direct and filtered routes in the in-app browser on desktop and
  mobile widths.

### Task 6: Make setup a startup gate

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`
- Test: `src/lib/singleSetup.test.ts`

- [x] Add a startup-choice view and make it the initial view.
- [x] Complete direct or filtered setup by navigating to home instead of
  starting a game.
- [x] Restore the home page to single-player and multiplayer game entry.
- [x] Prevent header controls from bypassing incomplete setup.

### Task 7: Restore vertical scrolling

**Files:**
- Modify: `src/styles.css`
- Test: `src/styles.test.ts`

- [x] Add a failing CSS regression test for vertical swipe-card scrolling.
- [x] Change the active card touch action from `none` to `pan-y`.
- [x] Verify vertical scrolling and horizontal card gestures through the
  gesture contract and regression test.

### Task 8: Final verification

- [x] Run `npm test`, `npm run build`, and `git diff --check`.
- [ ] Verify startup gating, both setup paths, home entry, and scrolling in the
  in-app browser.

### Task 9: Versioned setup preference

**Files:**
- Modify: `src/lib/singleSetup.ts`
- Modify: `src/lib/singleSetup.test.ts`

- [x] Add failing tests proving `all` remains dynamic, `selected` ignores stale
  IDs, and selected preferences deduplicate IDs.
- [x] Run `npm test -- src/lib/singleSetup.test.ts` and confirm the new imports
  fail because the preference helpers do not exist.
- [x] Add `SingleSetupPreference`, `buildSingleSetupPreference`, and
  `resolveSingleSetupPreference`.
- [x] Run `npm test -- src/lib/singleSetup.test.ts` and confirm all tests pass.

### Task 10: Guest preference store

**Files:**
- Create: `src/lib/setupPreferenceStore.ts`
- Create: `src/lib/setupPreferenceStore.test.ts`

- [x] Add failing tests for saving/loading both modes, normalizing selected
  IDs, rejecting invalid data, and clearing storage.
- [x] Run `npm test -- src/lib/setupPreferenceStore.test.ts` and confirm it
  fails because the module does not exist.
- [x] Implement a `FoodSelectionPreferenceStore` interface, a storage-backed
  factory, and a local-storage guest implementation.
- [x] Run `npm test -- src/lib/setupPreferenceStore.test.ts` and confirm all
  tests pass.

### Task 11: Restore setup and reselect

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [x] Derive the configured deck from the saved preference and current options.
- [x] Open home on refresh when name and preference are valid.
- [x] Clear an invalid selected preference and require setup again.
- [x] Snapshot the resolved deck only when a single-player round starts.
- [x] Add a home reselect action that clears the preference but keeps the name.
- [x] Make reselect direct mode return home immediately and filtered mode use a
  two-step flow without the name page.

### Task 12: Verification

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `git diff --check`.
- [x] Verify initial setup, refresh restore, reselect, and direct/filtered paths
  in the in-app browser when browser automation is available.
