import { describe, expect, it } from "vitest";
import type { FoodOption } from "../types";
import {
  buildSingleSetupPreference,
  buildSingleSetupConfig,
  optionsForCategories,
  reconcileSelectedOptionIds,
  resolveDishPoolOptions,
  resolveSingleSetupPreference,
  resolveSingleDeck,
} from "./singleSetup";

const option = (
  id: string,
  categoryId: string,
  overrides: Partial<FoodOption> = {},
): FoodOption => ({
  id,
  categoryId,
  categoryName: categoryId,
  parentOptionId: null,
  name: id,
  path: [categoryId, id],
  imageUrl: "/food.jpg",
  tags: [id],
  description: id,
  selectable: true,
  sortOrder: 0,
  status: "active",
  source: "system",
  ...overrides,
});

const options = [
  option("option-a1", "category-a"),
  option("option-b1", "category-b"),
  option("option-a2", "category-a"),
  option("option-archived", "category-a", { status: "archived" }),
  option("option-heading", "category-a", { selectable: false }),
];

describe("single-player setup", () => {
  it("returns only active selectable options from selected categories", () => {
    expect(optionsForCategories(options, ["category-a"]).map(({ id }) => id)).toEqual([
      "option-a1",
      "option-a2",
    ]);
  });

  it("removes stale and duplicate option selections after categories change", () => {
    expect(
      reconcileSelectedOptionIds(
        options,
        ["category-a"],
        ["option-a2", "option-b1", "option-a2", "missing"],
      ),
    ).toEqual(["option-a2"]);
  });

  it("resolves the direct route to every active selectable option", () => {
    expect(resolveSingleDeck(options, "all").map(({ id }) => id)).toEqual([
      "option-a1",
      "option-b1",
      "option-a2",
    ]);
  });

  it("resolves a filtered deck in the source option order", () => {
    expect(
      resolveSingleDeck(options, "filtered", ["option-a2", "option-b1"]).map(
        ({ id }) => id,
      ),
    ).toEqual(["option-b1", "option-a2"]);
  });

  it("builds the startup configuration used by the home page", () => {
    expect(
      buildSingleSetupConfig(
        options,
        "filtered",
        ["option-a2", "option-b1"],
        "  火锅队长  ",
      ),
    ).toEqual({
      playerName: "火锅队长",
      options: [options[1], options[2]],
    });
  });

  it("keeps an all-options preference dynamic as options are added", () => {
    const preference = buildSingleSetupPreference("all", []);
    const addedOption = option("option-new", "category-c");

    expect(
      resolveSingleSetupPreference(options, preference).map(({ id }) => id),
    ).toEqual(["option-a1", "option-b1", "option-a2"]);
    expect(
      resolveSingleSetupPreference([...options, addedOption], preference).map(
        ({ id }) => id,
      ),
    ).toEqual(["option-a1", "option-b1", "option-a2", "option-new"]);
  });

  it("ignores stale and unavailable IDs in a selected preference", () => {
    const preference = buildSingleSetupPreference("filtered", [
      "option-a2",
      "missing",
      "option-archived",
    ]);

    expect(
      resolveSingleSetupPreference(options, preference).map(({ id }) => id),
    ).toEqual(["option-a2"]);
  });

  it("deduplicates IDs when building a selected preference", () => {
    expect(
      buildSingleSetupPreference("filtered", [
        "option-a2",
        "option-b1",
        "option-a2",
      ]),
    ).toEqual({
      version: 1,
      mode: "selected",
      optionIds: ["option-a2", "option-b1"],
    });
  });

  it("shows only configured options in the selected dish-pool view", () => {
    const preference = buildSingleSetupPreference("filtered", [
      "option-a2",
      "option-b1",
    ]);

    expect(
      resolveDishPoolOptions(options, preference, "selected").map(
        ({ id }) => id,
      ),
    ).toEqual(["option-b1", "option-a2"]);
  });

  it("shows every available option in the complete dish-pool view", () => {
    const preference = buildSingleSetupPreference("filtered", ["option-a2"]);

    expect(
      resolveDishPoolOptions(options, preference, "all").map(({ id }) => id),
    ).toEqual(["option-a1", "option-b1", "option-a2"]);
  });
});
