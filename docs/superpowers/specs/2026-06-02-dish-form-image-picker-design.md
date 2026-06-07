# Dish Form Image Picker Design

## Goal

Improve the add-dish flow so image selection feels focused and lightweight:

- The add-dish form opens a separate image picker dialog instead of embedding the full image grid.
- Image choices are presented as images only, without dish-name text overlays.
- The add-dish dialog has eased open and close animations.

## Current Behavior

`DishForm` renders the image choices directly inside the form. Each image choice includes the dish image, a dish-name text overlay, and a selected check indicator. The add-dish dialog is mounted and unmounted immediately from `App`, so closing does not allow an exit animation.

## Proposed Behavior

The add-dish dialog keeps the form as the primary surface. Its image field shows:

- A preview of the currently selected image.
- A button that opens an image picker dialog.

The image picker dialog appears above the add-dish dialog. It contains a grid of image-only buttons. Selecting an image updates `form.imageUrl` and closes the picker. The selected image still shows a check indicator and selected border, but no dish-name text is displayed in the grid.

## Animation

Use a soft pop animation for the add-dish dialog:

- On open: backdrop fades in; form fades in while moving slightly upward from a lower position and scaling from slightly smaller to normal size.
- On close: the same properties animate in reverse before calling `onClose`.

The image picker uses the same visual language, with its own backdrop layer above the form. It can close immediately after selection or via its close button/backdrop, with a matching soft exit transition.

## Component Changes

`DishForm` will own local visibility state for:

- Whether the add-dish dialog is closing.
- Whether the image picker is open.
- Whether the image picker is closing.

The parent `App` can continue controlling whether `DishForm` is mounted with the existing `dishFormOpen` state. `DishForm` will delay the parent `onClose` callback until the exit animation finishes.

## Styling Changes

Add styles for:

- Selected image preview in the form.
- Image picker backdrop and dialog.
- Image-only grid buttons.
- Shared open and close animation states for dialog surfaces.

Existing colors, radius, button styles, and icon usage should remain aligned with the current app.

## Accessibility

- The add-dish form remains a dialog with a close button.
- The image picker is a nested dialog with its own heading and close button.
- Image buttons keep accessible labels such as `选择 麻婆豆腐 的图片`, even though visible text is removed.
- The selected image has visual indication via border/checkmark.

## Validation

The project currently has no test script. Validation will use:

- `npm run build` for TypeScript and production build verification.
- Browser/manual verification of the add-dish dialog, image picker, and open/close animations.
