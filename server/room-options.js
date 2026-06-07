function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of value.trim().toLocaleLowerCase("zh-CN")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function legacyCategoryId(name) {
  return `category-legacy-${stableHash(name)}`;
}

function parsePath(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  const text = cleanText(value);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.map(cleanText).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeOptionalLevel(value, min, max) {
  if (value === null || value === undefined || value === "") return undefined;
  const level = Number(value);
  if (!Number.isFinite(level)) return undefined;
  const rounded = Math.round(level);
  return rounded >= min && rounded <= max ? rounded : undefined;
}

export function parseTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(cleanText).filter(Boolean);
  }

  const text = cleanText(tags);
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.map(cleanText).filter(Boolean);
    }
  } catch {
    // Plain strings are split below.
  }

  return text
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function normalizeRoomOption(input) {
  if (!input || typeof input !== "object") return null;

  const name = cleanText(input.name);
  const categoryName = cleanText(input.categoryName || input.cuisine);
  if (!name || !categoryName) return null;

  const parentOptionId = cleanText(input.parentOptionId) || null;
  const parentOptionName = cleanText(input.parentOptionName) || null;
  const storedPath = parsePath(input.path || input.pathJson);
  const spicyLevel = normalizeOptionalLevel(input.spicyLevel, 0, 3);
  const priceLevel = normalizeOptionalLevel(input.priceLevel, 1, 3);
  const sortOrder = Number(input.sortOrder);

  return {
    sourceOptionId:
      cleanText(
        input.sourceOptionId || input.sourceDishId || input.id,
      ) || null,
    categoryId:
      cleanText(input.categoryId) || legacyCategoryId(categoryName),
    categoryName,
    parentOptionId,
    parentOptionName,
    name,
    path:
      storedPath.length > 0
        ? storedPath
        : [
            categoryName,
            ...(parentOptionName ? [parentOptionName] : []),
            name,
          ],
    imageUrl: cleanText(input.imageUrl),
    tags: parseTags(input.tags ?? input.tagsJson),
    description:
      cleanText(input.description) || `${categoryName} · ${name}`,
    ...(spicyLevel !== undefined ? { spicyLevel } : {}),
    ...(priceLevel !== undefined ? { priceLevel } : {}),
    selectable: input.selectable !== false && input.selectable !== 0,
    sortOrder: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
    status: input.status === "archived" ? "archived" : "active",
    source: input.source === "system" ? "system" : "custom",
  };
}

export function normalizeRoomOptions(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeRoomOption).filter(Boolean);
}
