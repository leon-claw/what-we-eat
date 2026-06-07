import type { SingleSetupPreference } from "./singleSetup";

export const FOOD_SELECTION_PREFERENCE_KEY =
  "what-we-eat:food-selection-preference";

export type KeyValueStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export interface FoodSelectionPreferenceStore {
  load(): SingleSetupPreference | null;
  save(preference: SingleSetupPreference): void;
  clear(): void;
}

function normalizePreference(value: unknown): SingleSetupPreference | null {
  if (!value || typeof value !== "object") return null;

  const preference = value as Record<string, unknown>;
  if (preference.version !== 1) return null;
  if (preference.mode === "all") {
    return { version: 1, mode: "all" };
  }
  if (preference.mode !== "selected" || !Array.isArray(preference.optionIds)) {
    return null;
  }

  const optionIds = [
    ...new Set(
      preference.optionIds.filter(
        (optionId): optionId is string =>
          typeof optionId === "string" && optionId.length > 0,
      ),
    ),
  ];

  return optionIds.length
    ? { version: 1, mode: "selected", optionIds }
    : null;
}

export function createFoodSelectionPreferenceStore(
  storage: KeyValueStorage,
): FoodSelectionPreferenceStore {
  return {
    load() {
      try {
        const raw = storage.getItem(FOOD_SELECTION_PREFERENCE_KEY);
        return raw ? normalizePreference(JSON.parse(raw)) : null;
      } catch {
        return null;
      }
    },
    save(preference) {
      try {
        storage.setItem(
          FOOD_SELECTION_PREFERENCE_KEY,
          JSON.stringify(preference),
        );
      } catch {
        // Keep the in-memory app state usable when persistence is blocked.
      }
    },
    clear() {
      try {
        storage.removeItem(FOOD_SELECTION_PREFERENCE_KEY);
      } catch {
        // Clearing app state should still work when persistence is blocked.
      }
    },
  };
}

export const guestFoodSelectionPreferenceStore: FoodSelectionPreferenceStore = {
  load() {
    try {
      return createFoodSelectionPreferenceStore(localStorage).load();
    } catch {
      return null;
    }
  },
  save(preference) {
    try {
      createFoodSelectionPreferenceStore(localStorage).save(preference);
    } catch {
      // Accessing localStorage itself can be denied by the browser.
    }
  },
  clear() {
    try {
      createFoodSelectionPreferenceStore(localStorage).clear();
    } catch {
      // Accessing localStorage itself can be denied by the browser.
    }
  },
};
