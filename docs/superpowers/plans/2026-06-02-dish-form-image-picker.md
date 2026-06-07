# Dish Form Image Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate image-only picker dialog to the add-dish form and give the add-dish dialog eased open/close animations.

**Architecture:** Keep the behavior inside `DishForm` because the parent only needs to know when the whole add-dish flow closes or submits. `DishForm` will own closing state for the main dialog and picker dialog, while CSS handles soft pop animations through `data-closing` attributes.

**Tech Stack:** React 19, TypeScript, Vite, lucide-react icons, CSS animations.

---

## File Structure

- Modify `src/components/DishForm.tsx`: replace inline image grid with selected-image preview, add picker dialog state and delayed close handlers.
- Modify `src/styles.css`: add selected preview, picker dialog, image-only choice, and open/close animation styles.
- Modify `.gitignore`: keep `.superpowers/` visual companion files out of version control.
- Create `docs/superpowers/specs/2026-06-02-dish-form-image-picker-design.md`: design record for the approved UI.

### Task 1: Main Dialog Close State

**Files:**
- Modify: `src/components/DishForm.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add close animation state in `DishForm`**

In `src/components/DishForm.tsx`, add a constant near `defaultForm`:

```tsx
const dialogAnimationMs = 220;
```

Inside `DishForm`, add:

```tsx
const [isClosing, setIsClosing] = useState(false);
```

Add a close helper:

```tsx
const closeForm = () => {
  if (isClosing) return;
  setIsClosing(true);
  window.setTimeout(onClose, dialogAnimationMs);
};
```

Replace all `onClose` click handlers in the form with `closeForm`.

- [ ] **Step 2: Add animation attributes**

Change the backdrop and form opening JSX to:

```tsx
<div className="modal-backdrop dish-form-backdrop" data-closing={isClosing} role="presentation">
  <form
    className="dish-form"
    data-closing={isClosing}
```

- [ ] **Step 3: Add CSS animation rules**

In `src/styles.css`, add:

```css
.dish-form-backdrop {
  animation: backdrop-soft-in 220ms ease both;
}

.dish-form-backdrop[data-closing="true"] {
  animation: backdrop-soft-out 180ms ease both;
}

.dish-form {
  animation: dialog-soft-in 220ms cubic-bezier(0.2, 0.78, 0.24, 1) both;
}

.dish-form[data-closing="true"] {
  animation: dialog-soft-out 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
}
```

Add keyframes:

```css
@keyframes backdrop-soft-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes backdrop-soft-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes dialog-soft-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dialog-soft-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(10px) scale(0.97);
  }
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

### Task 2: Image Preview and Picker Dialog

**Files:**
- Modify: `src/components/DishForm.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add picker state and helpers**

Inside `DishForm`, add:

```tsx
const [imagePickerOpen, setImagePickerOpen] = useState(false);
const [imagePickerClosing, setImagePickerClosing] = useState(false);
```

Add helpers:

```tsx
const openImagePicker = () => {
  setImagePickerClosing(false);
  setImagePickerOpen(true);
};

const closeImagePicker = () => {
  if (imagePickerClosing) return;
  setImagePickerClosing(true);
  window.setTimeout(() => {
    setImagePickerOpen(false);
    setImagePickerClosing(false);
  }, dialogAnimationMs);
};

const selectImage = (imageUrl: string) => {
  updateField("imageUrl", imageUrl);
  closeImagePicker();
};
```

- [ ] **Step 2: Replace inline image grid with preview and trigger**

Replace the current `.image-choice-field` block with:

```tsx
<div className="form-wide image-choice-field">
  <div className="field-label">图片</div>
  <div className="selected-image-row">
    <div className="selected-image-preview" aria-label="当前选择的菜品图片">
      <img src={form.imageUrl} alt="" />
    </div>
    <button className="secondary-button" type="button" onClick={openImagePicker}>
      选择图片
    </button>
  </div>
</div>
```

- [ ] **Step 3: Add image-only picker dialog JSX**

Before the closing `</div>` of the main backdrop, add:

```tsx
{imagePickerOpen ? (
  <div
    className="image-picker-backdrop"
    data-closing={imagePickerClosing}
    role="presentation"
    onClick={closeImagePicker}
  >
    <section
      className="image-picker-dialog"
      data-closing={imagePickerClosing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-picker-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="form-header">
        <div>
          <p className="eyebrow">菜品图片</p>
          <h3 id="image-picker-title">选择图片</h3>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={closeImagePicker}
          title="关闭"
          aria-label="关闭图片选择"
        >
          <X size={20} />
        </button>
      </div>
      <div className="image-picker-grid">
        {imageChoices.map((dish) => {
          const selected = form.imageUrl === dish.imageUrl;
          return (
            <button
              className="image-choice image-choice-plain"
              data-selected={selected}
              type="button"
              key={dish.imageUrl}
              onClick={() => selectImage(dish.imageUrl)}
              title={`选择 ${dish.name} 的图片`}
              aria-label={`选择 ${dish.name} 的图片`}
            >
              <img src={dish.imageUrl} alt="" />
              {selected ? (
                <strong>
                  <Check size={14} />
                </strong>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  </div>
) : null}
```

- [ ] **Step 4: Add picker CSS**

In `src/styles.css`, add:

```css
.selected-image-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.selected-image-preview {
  position: relative;
  overflow: hidden;
  min-height: 132px;
  border: 2px solid #ffffff;
  border-radius: 8px;
  background: #ffe0ad;
  box-shadow: 0 10px 20px rgba(35, 43, 57, 0.12);
}

.selected-image-preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(35, 43, 57, 0.34);
  backdrop-filter: blur(8px);
  animation: backdrop-soft-in 220ms ease both;
}

.image-picker-backdrop[data-closing="true"] {
  animation: backdrop-soft-out 180ms ease both;
}

.image-picker-dialog {
  display: grid;
  width: min(680px, 100%);
  max-height: min(720px, calc(100vh - 36px));
  gap: 16px;
  overflow: auto;
  border-radius: 8px;
  padding: 20px;
  background: linear-gradient(180deg, #ffffff, #fff7ed);
  box-shadow: var(--shadow);
  animation: dialog-soft-in 220ms cubic-bezier(0.2, 0.78, 0.24, 1) both;
}

.image-picker-dialog[data-closing="true"] {
  animation: dialog-soft-out 180ms cubic-bezier(0.4, 0, 0.2, 1) both;
}

.image-picker-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.image-choice-plain {
  min-height: 128px;
  align-content: stretch;
}

.image-choice-plain::after,
.image-choice-plain span {
  display: none;
}
```

- [ ] **Step 5: Verify build**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

### Task 3: Responsive Polish and Manual Verification

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add responsive styles**

Inside the existing `@media (max-width: 640px)` block, add:

```css
.selected-image-row {
  grid-template-columns: 1fr;
}

.selected-image-row .secondary-button {
  justify-content: center;
}

.image-picker-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-choice-plain {
  min-height: 118px;
}
```

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: TypeScript and Vite build complete without errors.

- [ ] **Step 3: Start app and verify manually**

Run: `npm run dev`

Open the printed localhost URL and verify:

- Clicking “新增菜品” opens the add-dish dialog with a soft pop animation.
- The form shows one selected image preview and a “选择图片” button.
- Clicking “选择图片” opens a separate dialog.
- The image picker grid shows images only, no visible dish-name text.
- Selecting an image updates the form preview and closes the picker.
- Closing the add-dish dialog plays a soft exit animation before it disappears.
