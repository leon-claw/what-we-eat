# Food Taxonomy Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat built-in dish list with 14 extensible categories and 78 selectable second-level food options while preserving local custom data, room snapshots, voting, and result views.

**Architecture:** Keep taxonomy organization in focused seed and normalization modules, while the swipe flow continues to consume a flat `FoodOption[]`. The client migrates legacy local `Dish` records at its storage boundary, and the server migrates its existing SQLite `room_dishes` table in place before reading and writing taxonomy snapshots.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Express 5, Node SQLite, Swing

---

## File Structure

- Create `src/data/foodTaxonomy.ts`: 14 built-in categories and 78 option cards.
- Create `src/lib/foodOptions.ts`: hierarchy validation and legacy option normalization.
- Create `src/lib/foodOptions.test.ts`: seed and migration tests.
- Modify `src/types.ts`: replace `Dish` with taxonomy types and use `FoodOption` in rooms.
- Modify `src/lib/storage.ts`: separate custom category/option storage and migrate legacy dishes.
- Modify `src/lib/results.ts`: aggregate by category.
- Modify `src/lib/results.test.ts`: verify category aggregation.
- Modify `src/components/DishForm.tsx`: create an option under an existing or new category.
- Modify `src/components/DishCard.tsx`: render category paths and optional metadata without prep time.
- Modify `src/App.tsx`: compose built-in/custom taxonomy and update display language.
- Modify `server/index.js`: migrate room snapshot schema and normalize old/new payloads.
- Create `server/room-options.js`: pure room option normalizer for reuse and tests.
- Create `server/room-options.test.js`: legacy and taxonomy snapshot normalization tests.
- Modify `package.json` and `package-lock.json`: add Vitest and test scripts.

### Task 1: Add the taxonomy types and test harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/types.ts`

- [ ] **Step 1: Install Vitest and add the test script**

Run:

```bash
npm install --save-dev vitest
```

Add:

```json
"test": "vitest run"
```

Expected: `npm install` exits with code 0 and updates the lockfile.

- [ ] **Step 2: Replace the flat dish type**

Define:

```ts
export type FoodSource = "system" | "custom";
export type FoodStatus = "active" | "archived";

export type FoodCategory = {
  id: string;
  name: string;
  sortOrder: number;
  status: FoodStatus;
  source: FoodSource;
  createdAt?: number;
  updatedAt?: number;
};

export type FoodOption = {
  id: string;
  sourceOptionId?: string | null;
  categoryId: string;
  categoryName: string;
  parentOptionId: string | null;
  parentOptionName?: string | null;
  name: string;
  path: string[];
  imageUrl: string;
  tags: string[];
  description: string;
  spicyLevel?: 0 | 1 | 2 | 3;
  priceLevel?: 1 | 2 | 3;
  selectable: boolean;
  sortOrder: number;
  status: FoodStatus;
  source: FoodSource;
  createdAt?: number;
  updatedAt?: number;
};
```

Change `Room.dishes` to `Room.options: FoodOption[]`, and change result and API consumers to use `FoodOption`.

- [ ] **Step 3: Run the build to record expected breakage**

Run:

```bash
npm run build
```

Expected: FAIL because existing files still import `Dish` and access `cuisine`, `type`, and `prepTime`.

### Task 2: Build and validate the 14/78 seed

**Files:**
- Create: `src/data/foodTaxonomy.ts`
- Create: `src/lib/foodOptions.ts`
- Create: `src/lib/foodOptions.test.ts`

- [ ] **Step 1: Write failing seed tests**

Tests must assert:

```ts
expect(builtInCategories).toHaveLength(14);
expect(builtInOptions).toHaveLength(78);
expect(new Set(builtInCategories.map(({ id }) => id)).size).toBe(14);
expect(new Set(builtInOptions.map(({ id }) => id)).size).toBe(78);
expect(builtInOptions.every((option) => categoryIds.has(option.categoryId))).toBe(true);
expect(builtInOptions.every((option) =>
  option.parentOptionId === null &&
  option.path.join("/") === `${option.categoryName}/${option.name}` &&
  option.imageUrl &&
  option.description &&
  option.tags.length > 0 &&
  option.selectable &&
  option.status === "active"
)).toBe(true);
expect(builtInOptions.some((option) => "prepTime" in option)).toBe(false);
```

Also test `validateFoodHierarchy` with a valid second/third-level pair and invalid cross-category, cycle, and level-four relationships.

- [ ] **Step 2: Run the seed tests**

Run:

```bash
npx vitest run src/lib/foodOptions.test.ts
```

Expected: FAIL because seed and validation modules do not exist.

- [ ] **Step 3: Add category and option factories**

Use stable IDs:

```ts
const category = (id: string, name: string, sortOrder: number): FoodCategory => ({
  id: `category-${id}`,
  name,
  sortOrder,
  status: "active",
  source: "system",
});

const option = (
  id: string,
  categoryRecord: FoodCategory,
  name: string,
  sortOrder: number,
  presentation: Pick<FoodOption, "imageUrl" | "description" | "tags" | "spicyLevel" | "priceLevel">,
): FoodOption => ({
  id: `option-${id}`,
  categoryId: categoryRecord.id,
  categoryName: categoryRecord.name,
  parentOptionId: null,
  name,
  path: [categoryRecord.name, name],
  selectable: true,
  sortOrder,
  status: "active",
  source: "system",
  ...presentation,
});
```

Populate all categories and options from the approved design specification. Every option receives a representative Unsplash image URL, a concise description, and two to four tags.

- [ ] **Step 4: Add hierarchy validation**

`validateFoodHierarchy(categories, options)` returns validation messages and enforces:

```ts
if (!categoryById.has(option.categoryId)) errors.push(...);
if (parent.categoryId !== option.categoryId) errors.push(...);
if (parent.parentOptionId !== null) errors.push(...);
if (parent.id === option.id || parent.parentOptionId === option.id) errors.push(...);
```

- [ ] **Step 5: Run seed tests**

Run:

```bash
npx vitest run src/lib/foodOptions.test.ts
```

Expected: PASS with 14 categories and 78 options.

### Task 3: Migrate custom local data at the storage boundary

**Files:**
- Modify: `src/lib/foodOptions.ts`
- Modify: `src/lib/foodOptions.test.ts`
- Modify: `src/lib/storage.ts`

- [ ] **Step 1: Write failing legacy migration tests**

Use a legacy object:

```ts
const legacyDish = {
  id: "custom-old",
  name: "椰子鸡",
  cuisine: "粤菜",
  type: "火锅",
  imageUrl: "/coconut.jpg",
  tags: ["清甜"],
  description: "清爽",
  spicyLevel: 0,
  priceLevel: 2,
  prepTime: "30 分钟",
};
```

Assert that normalization preserves its ID and presentation data, creates a stable custom category from `粤菜`, produces `path: ["粤菜", "椰子鸡"]`, and does not retain `type` or `prepTime`. Normalize the migrated result again and assert deep equality.

- [ ] **Step 2: Run migration tests**

Run:

```bash
npx vitest run src/lib/foodOptions.test.ts
```

Expected: FAIL until normalization exists.

- [ ] **Step 3: Implement normalization**

Add:

```ts
export function normalizeStoredFoodData(
  rawCategories: unknown,
  rawOptions: unknown,
  legacyDishes: unknown,
): { categories: FoodCategory[]; options: FoodOption[] }
```

Generate category IDs with a deterministic slug/hash helper, deduplicate categories by normalized name, preserve option IDs, reject empty names, and recover missing categories from `categoryName`.

- [ ] **Step 4: Update local storage**

Add keys:

```ts
export const USER_CATEGORIES_KEY = "what-we-eat:user-categories";
export const USER_OPTIONS_KEY = "what-we-eat:user-options";
```

`loadUserFoodData()` reads the new keys plus `what-we-eat:user-dishes`, normalizes them, writes migrated data to the new keys, and removes the legacy key only after successful writes. `saveUserFoodData(categories, options)` stores only custom records.

- [ ] **Step 5: Run migration tests**

Run:

```bash
npx vitest run src/lib/foodOptions.test.ts
```

Expected: PASS.

### Task 4: Move the client UI and results to FoodOption

**Files:**
- Modify: `src/lib/results.ts`
- Create: `src/lib/results.test.ts`
- Modify: `src/components/DishCard.tsx`
- Modify: `src/components/DishForm.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write a failing category aggregation test**

Create two options in the same category and votes for both. Assert:

```ts
expect(result.categories).toEqual([{ category: "火锅香锅", likes: 2 }]);
```

- [ ] **Step 2: Run the result test**

Run:

```bash
npx vitest run src/lib/results.test.ts
```

Expected: FAIL because results still use `cuisine`.

- [ ] **Step 3: Update results and card rendering**

Rename `CuisineResult` to `CategoryResult`, return `categories`, aggregate on `option.categoryName`, and render:

```tsx
<p className="eyebrow">{option.path.join(" · ")}</p>
```

Render spicy and price badges only when the optional value exists. Remove the clock icon and prep-time badge entirely.

- [ ] **Step 4: Update the add-option form**

Change the form contract to:

```ts
type FoodOptionFormResult = {
  category: FoodCategory;
  option: FoodOption;
};
```

Provide a category select containing built-in and custom categories plus a `新建分类` choice. When selected, show one input for the new category name. Remove the old `菜系`, `类型`, and `时间` fields. Submit a second-level custom option with `parentOptionId: null`, `path: [category.name, optionName]`, and no `prepTime`.

- [ ] **Step 5: Update application composition**

Load custom taxonomy once:

```ts
const [userFood, setUserFood] = useState(() => loadUserFoodData());
const allCategories = useMemo(
  () => [...builtInCategories, ...userFood.categories],
  [userFood.categories],
);
const allOptions = useMemo(
  () => [...builtInOptions, ...userFood.options].filter(isSelectableOption),
  [userFood.options],
);
```

Use `allOptions` for single play and room creation. Home stats show built-in option count, custom option count, and category count. Save a new custom category only when it is not already present.

- [ ] **Step 6: Run client tests and build**

Run:

```bash
npm test
npm run build
```

Expected: tests pass; build may still fail only where the server/API room model has not yet been updated.

### Task 5: Migrate room snapshots without losing existing rooms

**Files:**
- Create: `server/room-options.js`
- Create: `server/room-options.test.js`
- Modify: `server/index.js`
- Modify: `src/lib/api.ts`
- Modify: `src/lib/storage.ts`
- Modify: `src/types.ts`

- [ ] **Step 1: Write failing snapshot normalization tests**

Assert a new taxonomy payload remains intact and a legacy payload maps:

```js
{
  id: "legacy",
  name: "麻婆豆腐",
  cuisine: "川菜",
  type: "下饭菜",
  prepTime: "20 分钟"
}
```

to an option with `categoryName: "川菜"`, a stable recovered category ID,
`path: ["川菜", "麻婆豆腐"]`, and no `type` or `prepTime`.

- [ ] **Step 2: Run server normalizer tests**

Run:

```bash
npx vitest run server/room-options.test.js
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure snapshot normalizer**

Export `normalizeRoomOption`, `normalizeRoomOptions`, and `parseTags`. Accept both `sourceOptionId`/`sourceDishId` and taxonomy/legacy category fields. Require only a non-empty name and category name.

- [ ] **Step 4: Add an idempotent SQLite migration**

Inspect `PRAGMA table_info(room_dishes)` and add missing nullable columns:

```sql
ALTER TABLE room_dishes ADD COLUMN source_option_id TEXT;
ALTER TABLE room_dishes ADD COLUMN category_id TEXT;
ALTER TABLE room_dishes ADD COLUMN category_name TEXT;
ALTER TABLE room_dishes ADD COLUMN parent_option_id TEXT;
ALTER TABLE room_dishes ADD COLUMN parent_option_name TEXT;
ALTER TABLE room_dishes ADD COLUMN path_json TEXT;
ALTER TABLE room_dishes ADD COLUMN selectable INTEGER;
ALTER TABLE room_dishes ADD COLUMN sort_order INTEGER;
ALTER TABLE room_dishes ADD COLUMN source TEXT;
ALTER TABLE room_dishes ADD COLUMN status TEXT;
```

Keep old non-null columns in existing databases and write compatibility values to them. New application payloads and responses use taxonomy fields only; `prep_time` is never returned.

- [ ] **Step 5: Update room insert and read statements**

Write `source_option_id`, category fields, path, selectable, order, source, and status. For old required columns write compatibility values:

```js
legacyCuisine = option.categoryName;
legacyType = option.parentOptionName || option.name;
legacyPrepTime = "";
```

Map old rows through the same normalizer before returning `room.options`.

- [ ] **Step 6: Update client room compatibility**

Use `Room.options`, but accept legacy `room.dishes` in storage/API normalization so restored rooms remain usable. Votes keep their `dishId` wire key for API compatibility; its value is now the room option snapshot ID.

- [ ] **Step 7: Run all tests**

Run:

```bash
npm test
```

Expected: PASS for seed, migration, result, and room snapshot tests.

### Task 6: Verify the production flow

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Run static and production checks**

Run:

```bash
npm run build
git diff --check
```

Expected: both commands exit with code 0.

- [ ] **Step 2: Start isolated verification servers**

Run the backend with a temporary database and the frontend on available ports:

```bash
DB_PATH=/tmp/what-we-eat-taxonomy.sqlite PORT=8788 npm run dev:server
npm run dev -- --port 5175
```

Expected: health endpoint reports OK and Vite serves the app.

- [ ] **Step 3: Verify in the in-app browser**

Confirm:

- Home shows `78 个候选`, `78 个内置`, and `14 个分类`.
- First swipe cards show second-level names with category paths.
- The add dialog can create a new category and option.
- The new option increases candidate and category counts by one.
- A new room response contains 79 option snapshots after that addition.
- Card buttons and manual swipes still record votes.
- Result category bars use first-level category names.
- No time field or prep-time badge appears.

- [ ] **Step 4: Inspect the final change set**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only intended implementation files plus pre-existing user changes are present, with no whitespace errors.
