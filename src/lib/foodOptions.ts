import type { FoodCategory, FoodOption } from "../types";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("zh-CN");
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function customCategoryId(name: string) {
  return `category-custom-${stableHash(normalizeName(name))}`;
}

function parseTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return cleanText(value)
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseOptionalLevel<T extends number>(
  value: unknown,
  allowed: readonly T[],
): T | undefined {
  const numericValue = Number(value);
  return allowed.includes(numericValue as T)
    ? (numericValue as T)
    : undefined;
}

function parseSortOrder(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.round(numericValue) : fallback;
}

function createCustomCategory(
  name: string,
  sortOrder: number,
  id = customCategoryId(name),
): FoodCategory {
  return {
    id,
    name,
    sortOrder,
    status: "active",
    source: "custom",
  };
}

export function normalizeStoredFoodData(
  rawCategories: unknown,
  rawOptions: unknown,
  legacyDishes: unknown,
): { categories: FoodCategory[]; options: FoodOption[] } {
  const categories: FoodCategory[] = [];
  const categoryById = new Map<string, FoodCategory>();
  const categoryByName = new Map<string, FoodCategory>();

  const registerCategory = (category: FoodCategory) => {
    const nameKey = normalizeName(category.name);
    const existing = categoryByName.get(nameKey);
    if (existing) return existing;

    categories.push(category);
    categoryById.set(category.id, category);
    categoryByName.set(nameKey, category);
    return category;
  };

  if (Array.isArray(rawCategories)) {
    rawCategories.forEach((value, index) => {
      if (!isRecord(value)) return;
      const name = cleanText(value.name);
      if (!name) return;

      const id = cleanText(value.id) || customCategoryId(name);
      registerCategory({
        id,
        name,
        sortOrder: parseSortOrder(value.sortOrder, index),
        status: value.status === "archived" ? "archived" : "active",
        source: "custom",
        ...(typeof value.createdAt === "number"
          ? { createdAt: value.createdAt }
          : {}),
        ...(typeof value.updatedAt === "number"
          ? { updatedAt: value.updatedAt }
          : {}),
      });
    });
  }

  const getOrCreateCategory = (
    categoryIdValue: unknown,
    categoryNameValue: unknown,
  ) => {
    const requestedId = cleanText(categoryIdValue);
    const requestedName = cleanText(categoryNameValue);
    const existingById = requestedId ? categoryById.get(requestedId) : undefined;
    if (existingById) return existingById;

    const existingByName = requestedName
      ? categoryByName.get(normalizeName(requestedName))
      : undefined;
    if (existingByName) return existingByName;
    if (!requestedName) return null;

    return registerCategory(
      createCustomCategory(
        requestedName,
        categories.length,
        requestedId || customCategoryId(requestedName),
      ),
    );
  };

  const options: FoodOption[] = [];
  const optionIds = new Set<string>();

  const registerOption = (
    value: UnknownRecord,
    index: number,
    legacy: boolean,
  ) => {
    const name = cleanText(value.name);
    const categoryName = cleanText(
      legacy ? value.cuisine : value.categoryName ?? value.cuisine,
    );
    const category = getOrCreateCategory(value.categoryId, categoryName);
    const id = cleanText(value.id);
    if (!name || !category || !id || optionIds.has(id)) return;

    const parentOptionId = legacy
      ? null
      : cleanText(value.parentOptionId) || null;
    const parentOptionName = legacy
      ? null
      : cleanText(value.parentOptionName) || null;
    const storedPath = Array.isArray(value.path)
      ? value.path.map(cleanText).filter(Boolean)
      : [];
    const path = storedPath.length
      ? storedPath
      : [
          category.name,
          ...(parentOptionName ? [parentOptionName] : []),
          name,
        ];
    const spicyLevel = parseOptionalLevel(value.spicyLevel, [0, 1, 2, 3]);
    const priceLevel = parseOptionalLevel(value.priceLevel, [1, 2, 3]);

    optionIds.add(id);
    options.push({
      id,
      sourceOptionId:
        cleanText(value.sourceOptionId ?? value.sourceDishId) || null,
      categoryId: category.id,
      categoryName: category.name,
      parentOptionId,
      ...(parentOptionName ? { parentOptionName } : {}),
      name,
      path,
      imageUrl: cleanText(value.imageUrl),
      tags: parseTags(value.tags),
      description:
        cleanText(value.description) || `${category.name} · ${name}`,
      ...(spicyLevel !== undefined ? { spicyLevel } : {}),
      ...(priceLevel !== undefined ? { priceLevel } : {}),
      selectable: value.selectable !== false,
      sortOrder: parseSortOrder(value.sortOrder, index),
      status: value.status === "archived" ? "archived" : "active",
      source: "custom",
      ...(typeof value.createdAt === "number"
        ? { createdAt: value.createdAt }
        : {}),
      ...(typeof value.updatedAt === "number"
        ? { updatedAt: value.updatedAt }
        : {}),
    });
  };

  if (Array.isArray(rawOptions)) {
    rawOptions.forEach((value, index) => {
      if (isRecord(value)) registerOption(value, index, false);
    });
  }

  if (Array.isArray(legacyDishes)) {
    legacyDishes.forEach((value, index) => {
      if (isRecord(value)) registerOption(value, options.length + index, true);
    });
  }

  return { categories, options };
}

export function validateFoodHierarchy(
  categories: FoodCategory[],
  options: FoodOption[],
) {
  const errors: string[] = [];
  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );
  const optionById = new Map(options.map((option) => [option.id, option]));

  for (const option of options) {
    if (!categoryById.has(option.categoryId)) {
      errors.push(`选项 ${option.id} 缺少所属分类。`);
    }

    if (!option.parentOptionId) continue;

    const directParent = optionById.get(option.parentOptionId);
    if (!directParent) {
      errors.push(`选项 ${option.id} 缺少父级。`);
      continue;
    }

    if (directParent.categoryId !== option.categoryId) {
      errors.push(`选项 ${option.id} 的父级不属于同一分类。`);
    }

    const seen = new Set([option.id]);
    let current: FoodOption | undefined = option;
    let depth = 2;
    let depthReported = false;

    while (current.parentOptionId) {
      const parent: FoodOption | undefined = optionById.get(
        current.parentOptionId,
      );
      if (!parent) break;

      if (seen.has(parent.id)) {
        errors.push(`选项 ${option.id} 存在循环父级。`);
        break;
      }

      seen.add(parent.id);
      depth += 1;
      if (depth > 3 && !depthReported) {
        errors.push(`选项 ${option.id} 超过支持的三级深度。`);
        depthReported = true;
      }
      current = parent;
    }
  }

  return errors;
}
