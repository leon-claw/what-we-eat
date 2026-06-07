import type { FoodOption } from "../types";

export type SingleSetupPath = "all" | "filtered";
export type DishPoolView = "selected" | "all";

export type SingleSetupPreference =
  | {
      version: 1;
      mode: "all";
    }
  | {
      version: 1;
      mode: "selected";
      optionIds: string[];
    };

function activeSelectableOptions(options: FoodOption[]) {
  return options.filter(
    (option) => option.status === "active" && option.selectable,
  );
}

export function optionsForCategories(
  options: FoodOption[],
  categoryIds: Iterable<string>,
) {
  const selectedCategoryIds = new Set(categoryIds);
  return activeSelectableOptions(options).filter((option) =>
    selectedCategoryIds.has(option.categoryId),
  );
}

export function reconcileSelectedOptionIds(
  options: FoodOption[],
  categoryIds: Iterable<string>,
  selectedOptionIds: Iterable<string>,
) {
  const allowedOptionIds = new Set(
    optionsForCategories(options, categoryIds).map((option) => option.id),
  );

  return [...new Set(selectedOptionIds)].filter((optionId) =>
    allowedOptionIds.has(optionId),
  );
}

export function resolveSingleDeck(
  options: FoodOption[],
  path: SingleSetupPath,
  selectedOptionIds: Iterable<string> = [],
) {
  const availableOptions = activeSelectableOptions(options);
  if (path === "all") return availableOptions;

  const selectedIds = new Set(selectedOptionIds);
  return availableOptions.filter((option) => selectedIds.has(option.id));
}

export function buildSingleSetupPreference(
  path: SingleSetupPath,
  selectedOptionIds: Iterable<string>,
): SingleSetupPreference {
  if (path === "all") {
    return { version: 1, mode: "all" };
  }

  return {
    version: 1,
    mode: "selected",
    optionIds: [...new Set(selectedOptionIds)],
  };
}

export function resolveSingleSetupPreference(
  options: FoodOption[],
  preference: SingleSetupPreference | null,
) {
  if (!preference) return [];

  return resolveSingleDeck(
    options,
    preference.mode === "all" ? "all" : "filtered",
    preference.mode === "selected" ? preference.optionIds : [],
  );
}

export function resolveDishPoolOptions(
  options: FoodOption[],
  preference: SingleSetupPreference | null,
  view: DishPoolView,
) {
  return view === "all"
    ? activeSelectableOptions(options)
    : resolveSingleSetupPreference(options, preference);
}

export function buildSingleSetupConfig(
  options: FoodOption[],
  path: SingleSetupPath,
  selectedOptionIds: Iterable<string>,
  playerName: string,
) {
  return {
    playerName: playerName.trim(),
    options: resolveSingleDeck(options, path, selectedOptionIds),
  };
}
