# Dish Pool Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the dish pool from the home page to a dedicated page with selected/all segmented views and reselect controls.

**Architecture:** Extend the existing `FlowMode` state machine with `dish-pool`. Keep the active pool tab in local React state, derive its options through a tested pure helper, and reuse the existing setup preference, dish form, and reselect actions.

**Tech Stack:** React 19, TypeScript, Vitest, CSS

---

### Task 1: Dish-pool view resolution

**Files:**
- Modify: `src/lib/singleSetup.ts`
- Modify: `src/lib/singleSetup.test.ts`

- [x] **Step 1: Write the failing test**

Add tests showing that `resolveDishPoolOptions(options, preference, "selected")`
returns only configured options and `"all"` returns every active selectable
option.

- [x] **Step 2: Verify the test fails**

Run: `npm test -- src/lib/singleSetup.test.ts`

Expected: FAIL because `resolveDishPoolOptions` is not exported.

- [x] **Step 3: Implement the helper**

Add:

```ts
export type DishPoolView = "selected" | "all";

export function resolveDishPoolOptions(
  options: FoodOption[],
  preference: SingleSetupPreference | null,
  view: DishPoolView,
) {
  return view === "all"
    ? activeSelectableOptions(options)
    : resolveSingleSetupPreference(options, preference);
}
```

- [x] **Step 4: Verify the test passes**

Run: `npm test -- src/lib/singleSetup.test.ts`

Expected: all tests pass.

### Task 2: Dedicated dish-pool view

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx`

- [x] **Step 1: Add the view state**

Add `"dish-pool"` to `FlowMode` and add local `DishPoolView` state defaulting to
`"selected"`.

- [x] **Step 2: Simplify home**

Remove the dish preview panel and home reselect button. Add a `菜品池` mode tile
that resets the pool view to `"selected"` and navigates to `"dish-pool"`.

- [x] **Step 3: Render the dish-pool page**

Add a page with a back action, selected/all segmented control, active count,
responsive option grid, `重选菜品`, and `新增菜品`.

- [x] **Step 4: Connect navigation**

Render the new flow mode and ensure the brand button returns from the dish pool
to home.

### Task 3: Responsive presentation

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: Add tool-page layout styles**

Add stable grid tracks for the page header, segmented control, and dish grid.

- [x] **Step 2: Add selected segment states**

Use `aria-pressed` and CSS state selectors for the active segment.

- [x] **Step 3: Add mobile rules**

At 640px, stack page actions, keep the segmented control full-width, and render
two dish columns without horizontal overflow.

### Task 4: Verification

- [x] **Step 1:** Run `npm test`.
- [x] **Step 2:** Run `npm run build`.
- [x] **Step 3:** Run `git diff --check`.
- [x] **Step 4:** Verify home, both pool segments, reselect, add-dish modal, and
desktop/mobile layouts in the in-app browser.
