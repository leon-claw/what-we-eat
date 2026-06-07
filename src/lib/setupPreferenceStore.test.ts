import { describe, expect, it } from "vitest";
import {
  createFoodSelectionPreferenceStore,
  type KeyValueStorage,
} from "./setupPreferenceStore";

function createMemoryStorage(): KeyValueStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("food selection preference store", () => {
  it("saves and loads an all-options preference", () => {
    const store = createFoodSelectionPreferenceStore(createMemoryStorage());

    store.save({ version: 1, mode: "all" });

    expect(store.load()).toEqual({ version: 1, mode: "all" });
  });

  it("normalizes duplicate selected IDs when loading", () => {
    const storage = createMemoryStorage();
    const store = createFoodSelectionPreferenceStore(storage);
    storage.setItem(
      "what-we-eat:food-selection-preference",
      JSON.stringify({
        version: 1,
        mode: "selected",
        optionIds: ["option-a", "option-a", "option-b"],
      }),
    );

    expect(store.load()).toEqual({
      version: 1,
      mode: "selected",
      optionIds: ["option-a", "option-b"],
    });
  });

  it("rejects malformed or empty selected preferences", () => {
    const storage = createMemoryStorage();
    const store = createFoodSelectionPreferenceStore(storage);

    storage.setItem("what-we-eat:food-selection-preference", "{bad json");
    expect(store.load()).toBeNull();

    storage.setItem(
      "what-we-eat:food-selection-preference",
      JSON.stringify({ version: 1, mode: "selected", optionIds: [] }),
    );
    expect(store.load()).toBeNull();
  });

  it("clears a saved preference", () => {
    const store = createFoodSelectionPreferenceStore(createMemoryStorage());
    store.save({
      version: 1,
      mode: "selected",
      optionIds: ["option-a"],
    });

    store.clear();

    expect(store.load()).toBeNull();
  });

  it("does not crash when browser storage is unavailable", () => {
    const unavailableStorage: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const store = createFoodSelectionPreferenceStore(unavailableStorage);

    expect(() => store.save({ version: 1, mode: "all" })).not.toThrow();
    expect(() => store.clear()).not.toThrow();
    expect(store.load()).toBeNull();
  });
});
