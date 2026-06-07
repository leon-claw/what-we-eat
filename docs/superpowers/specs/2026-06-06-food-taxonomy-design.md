# Food Taxonomy Refactor Design

## Goal

Replace the fixed flat dish list with an extensible food taxonomy designed for
mainland China dining and delivery choices. Users currently swipe second-level
food options such as `川菜`, `麻辣烫`, and `汉堡`. The data model must also allow
a future third level such as `火锅 -> 重庆火锅` without requiring another schema
change.

This change covers initial food data, client types, local custom data, room
snapshots, result aggregation, and server persistence.

## Scope

- Introduce first-level categories and self-referencing food options.
- Replace the existing built-in dishes with 14 categories and 78 selectable
  second-level options.
- Keep each selectable option visually complete with an image, description,
  and tags.
- Allow users to create custom first-level categories and second-level options.
- Preserve room-owned snapshots so room contents do not change when source data
  is later edited.
- Migrate existing local custom dishes and tolerate existing room data.
- Remove `prepTime` from all new and migrated models.
- Preserve schema support for a third level, but do not build third-level UI.

## Out of Scope

- A third-level browsing, editing, or selection interface.
- Arbitrarily deep category trees.
- Image upload or object-storage infrastructure.
- Remote synchronization of a user's private taxonomy outside room snapshots.
- A category management screen beyond what is necessary to create a custom
  category while adding an option.

## Data Model

### FoodCategory

```ts
type FoodCategory = {
  id: string;
  name: string;
  sortOrder: number;
  status: "active" | "archived";
  source: "system" | "custom";
  createdAt?: number;
  updatedAt?: number;
};
```

`FoodCategory` is the first level. Category records are organizational and are
not swipe cards.

### FoodOption

```ts
type FoodOption = {
  id: string;
  sourceOptionId?: string | null;
  categoryId: string;
  categoryName: string;
  parentOptionId: string | null;
  parentOptionName?: string | null;
  name: string;
  path: string[];

  imageUrl: string;
  description: string;
  tags: string[];
  spicyLevel?: 0 | 1 | 2 | 3;
  priceLevel?: 1 | 2 | 3;

  selectable: boolean;
  sortOrder: number;
  status: "active" | "archived";
  source: "system" | "custom";
  createdAt?: number;
  updatedAt?: number;
};
```

`prepTime` is deliberately absent. It will be removed from built-in data, local
storage normalization, API payloads, room snapshots, and database persistence.

The model does not store a numeric `level`. The level is derived:

- A `FoodCategory` is level 1.
- A `FoodOption` with `parentOptionId === null` is level 2.
- A `FoodOption` with a parent is level 3.

This avoids disagreements between `level` and the parent relationship.

`categoryName`, `parentOptionName`, and `path` are denormalized snapshot fields.
They keep room history understandable even if source category names change.

## Hierarchy Rules

- Every option belongs to exactly one category.
- A parent option must belong to the same category as its child.
- The maximum supported depth is three levels including the category.
- A third-level option cannot be the parent of another option.
- Cycles are invalid.
- Only active, selectable options appear in the swipe deck.
- In this release all 78 built-in second-level options are selectable.
- Third-level records are structurally valid but are not created or exposed by
  the current interface.

## Initial Taxonomy

### 1. 川湘赣菜

- 川菜
- 湘菜
- 江西菜

### 2. 粤闽菜

- 粤菜
- 潮汕菜
- 福建菜

### 3. 江浙沪菜

- 上海本帮菜
- 杭帮菜
- 淮扬菜

### 4. 北方菜

- 东北菜
- 北京菜
- 鲁菜

### 5. 云贵菜

- 云南菜
- 贵州菜

### 6. 西北新疆

- 陕西菜
- 新疆菜

### 7. 火锅香锅

- 川渝火锅
- 潮汕牛肉火锅
- 老北京涮肉
- 椰子鸡火锅
- 鱼蛙火锅
- 串串香
- 麻辣烫
- 麻辣香锅
- 冒菜

### 8. 烧烤烤肉

- 烧烤烤串
- 韩式烤肉
- 日式烧肉
- 自助烤肉
- 海鲜烧烤
- 烤鱼

### 9. 米饭快餐

- 快餐简餐
- 盖浇饭
- 炒饭
- 煲仔饭
- 黄焖鸡
- 烤肉拌饭
- 木桶饭
- 便当
- 轻食健康餐

### 10. 粉面粥点

- 面馆
- 米线
- 米粉
- 螺蛳粉
- 酸辣粉
- 馄饨抄手
- 饺子
- 包子馒头
- 生煎锅贴
- 粥铺

### 11. 小吃夜宵

- 炸串炸物
- 卤味鸭脖
- 小龙虾
- 煎饼果子
- 肉夹馍
- 凉皮
- 臭豆腐
- 关东煮

### 12. 日韩料理

- 寿司
- 日式拉面
- 日式盖饭
- 日式咖喱
- 居酒屋
- 韩式炸鸡
- 石锅拌饭

### 13. 西餐异国

- 汉堡
- 披萨
- 牛排
- 意大利面
- 东南亚菜
- 印度菜

### 14. 饮品甜点

- 奶茶果茶
- 咖啡
- 果汁
- 糖水
- 面包烘焙
- 蛋糕甜品
- 冰淇淋

The seed contains exactly 14 categories and 78 second-level options. Stable
human-readable IDs are used so future seed updates do not silently duplicate
existing records.

## Seed Presentation Data

Each built-in option includes:

- A representative image URL.
- A short description suitable for the swipe card.
- Two to four concise search or flavor tags.
- Optional spicy and price levels where they are meaningful.

Presentation data belongs to the option rather than the category because the
option is the selectable card. Missing optional spicy or price data is omitted
from the card instead of replaced with a misleading default.

## Client Data Flow

The client loads:

1. Built-in categories and options from the seed module.
2. Custom categories and options from local storage.
3. A normalized combined option list for single-player selection.

The swipe and result flows continue to operate on a flat array of selectable
options. Hierarchy lookup is kept at the data boundary so card animation and
voting code do not need to traverse a tree.

Result aggregation groups likes by `categoryName` instead of the old `cuisine`
field. Card subtitles display the option path, normally `分类 · 选项`.

## Custom Data

Custom data is stored separately from built-in seed data:

- `what-we-eat:user-categories`
- `what-we-eat:user-options`

Creating a custom option may reference an existing category or create a custom
category first. Built-in records are not copied into local storage.

Names must be non-empty after trimming. Category names must be unique among
active categories. Second-level option names must be unique within their
category. Duplicate names in different categories are valid.

## Legacy Migration

Existing local `Dish` records are migrated once during normalization:

- `id` remains the option ID.
- `name` becomes the option name.
- `cuisine` becomes `categoryName`.
- A stable custom category ID is derived from the normalized cuisine name.
- `parentOptionId` is `null`.
- `path` becomes `[categoryName, name]`.
- `imageUrl`, `description`, `tags`, `spicyLevel`, and `priceLevel` are kept.
- `type` is discarded because it does not map consistently to the new taxonomy.
- `prepTime` is discarded.
- The migrated option has `source: "custom"` and `selectable: true`.

Migration must be idempotent. Loading already migrated data must not create
duplicate categories or rewrite option IDs.

## Room Snapshots

Room creation and room editing clone full `FoodOption` snapshots. A snapshot
stores:

- Snapshot `id` used by votes.
- `sourceOptionId`.
- `categoryId` and `categoryName`.
- `parentOptionId` and `parentOptionName`.
- `name` and `path`.
- Image, description, tags, spicy level, and price level.
- Source and timestamps needed by the existing room implementation.

Rooms do not depend on current built-in or local taxonomy after creation.
Existing room rows using `cuisine` and `type` remain readable through a legacy
normalizer:

- `cuisine` becomes `categoryName`.
- `name` remains the option name.
- `path` becomes `[categoryName, name]`.
- `type` and `prepTime` are ignored.

New writes use only the taxonomy fields. Legacy database columns may remain
temporarily if removing them would make existing local databases unreadable,
but application code does not treat them as canonical.

## Error Handling

- Invalid stored records are skipped rather than breaking application startup.
- A custom option with a missing category is attached to a recovered custom
  category using its stored `categoryName`.
- Invalid hierarchy relationships are rejected at normalization and API
  boundaries.
- Room creation fails with a clear validation response when no valid selectable
  options are supplied.
- Missing image URLs use the application's existing image fallback behavior.

## Verification

Automated checks must verify:

- The seed contains 14 categories and 78 options.
- Every seed option references an existing category.
- Every built-in option has a unique ID, image, description, and tags.
- No seed option contains `prepTime`.
- Hierarchy validation rejects cross-category parents, cycles, and depth above
  level 3.
- Legacy local dishes migrate idempotently and keep their IDs.
- Room snapshot normalization reads both legacy and taxonomy payloads.
- Result summaries group by the new category name.
- TypeScript and production builds pass.

Browser verification must confirm:

- The home candidate count is 78 before custom options are added.
- Swipe cards show the new second-level option names and category paths.
- Creating a custom option under a new custom category works.
- A room created from the new data receives the same 78 snapshot options.
- Voting and result views still work with taxonomy-backed options.
