import { describe, expect, it } from "vitest";
import { builtInCategories, builtInOptions } from "../data/foodTaxonomy";
import {
  normalizeStoredFoodData,
  validateFoodHierarchy,
} from "./foodOptions";
import type { FoodCategory, FoodOption } from "../types";

const category = (
  id: string,
  name: string,
): FoodCategory => ({
  id,
  name,
  sortOrder: 0,
  status: "active",
  source: "custom",
});

const option = (
  id: string,
  categoryRecord: FoodCategory,
  parentOptionId: string | null = null,
): FoodOption => ({
  id,
  categoryId: categoryRecord.id,
  categoryName: categoryRecord.name,
  parentOptionId,
  name: id,
  path: parentOptionId
    ? [categoryRecord.name, parentOptionId, id]
    : [categoryRecord.name, id],
  imageUrl: "/food.jpg",
  tags: [id],
  description: id,
  selectable: true,
  sortOrder: 0,
  status: "active",
  source: "custom",
});

describe("built-in food taxonomy", () => {
  it("contains the approved 14 categories and 78 selectable options", () => {
    expect(builtInCategories).toHaveLength(14);
    expect(builtInOptions).toHaveLength(78);
    expect(new Set(builtInCategories.map(({ id }) => id)).size).toBe(14);
    expect(new Set(builtInOptions.map(({ id }) => id)).size).toBe(78);
  });

  it("keeps every option complete and attached to an existing category", () => {
    const categoryIds = new Set(builtInCategories.map(({ id }) => id));

    expect(
      builtInOptions.every(
        (foodOption) =>
          categoryIds.has(foodOption.categoryId) &&
          foodOption.parentOptionId === null &&
          foodOption.path.join("/") ===
            `${foodOption.categoryName}/${foodOption.name}` &&
          Boolean(foodOption.imageUrl) &&
          Boolean(foodOption.description) &&
          foodOption.tags.length > 0 &&
          foodOption.selectable &&
          foodOption.status === "active",
      ),
    ).toBe(true);
    expect(
      builtInOptions.some((foodOption) => "prepTime" in foodOption),
    ).toBe(false);
  });
});

describe("food hierarchy validation", () => {
  it("accepts a second-level option with one third-level child", () => {
    const chinese = category("category-chinese", "中餐");
    const hotpot = option("option-hotpot", chinese);
    const chongqing = option("option-chongqing-hotpot", chinese, hotpot.id);

    expect(validateFoodHierarchy([chinese], [hotpot, chongqing])).toEqual([]);
  });

  it("rejects cross-category parents", () => {
    const chinese = category("category-chinese", "中餐");
    const japanese = category("category-japanese", "日料");
    const hotpot = option("option-hotpot", chinese);
    const ramen = option("option-ramen", japanese, hotpot.id);

    expect(validateFoodHierarchy([chinese, japanese], [hotpot, ramen])).toContain(
      "选项 option-ramen 的父级不属于同一分类。",
    );
  });

  it("rejects cycles and a fourth level", () => {
    const chinese = category("category-chinese", "中餐");
    const hotpot = option("option-hotpot", chinese, "option-chongqing");
    const chongqing = option("option-chongqing", chinese, hotpot.id);
    const spicy = option("option-spicy", chinese, chongqing.id);

    const errors = validateFoodHierarchy(
      [chinese],
      [hotpot, chongqing, spicy],
    );

    expect(errors).toContain("选项 option-hotpot 存在循环父级。");
    expect(errors).toContain("选项 option-chongqing 存在循环父级。");
    expect(errors).toContain("选项 option-spicy 超过支持的三级深度。");
  });
});

describe("stored food migration", () => {
  it("migrates legacy dishes without retaining type or prep time", () => {
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

    const migrated = normalizeStoredFoodData([], [], [legacyDish]);

    expect(migrated.categories).toHaveLength(1);
    expect(migrated.categories[0]).toMatchObject({
      name: "粤菜",
      source: "custom",
    });
    expect(migrated.options).toHaveLength(1);
    expect(migrated.options[0]).toMatchObject({
      id: "custom-old",
      categoryId: migrated.categories[0].id,
      categoryName: "粤菜",
      parentOptionId: null,
      name: "椰子鸡",
      path: ["粤菜", "椰子鸡"],
      imageUrl: "/coconut.jpg",
      tags: ["清甜"],
      description: "清爽",
      spicyLevel: 0,
      priceLevel: 2,
      source: "custom",
      selectable: true,
    });
    expect("type" in migrated.options[0]).toBe(false);
    expect("prepTime" in migrated.options[0]).toBe(false);
  });

  it("is idempotent for already migrated categories and options", () => {
    const first = normalizeStoredFoodData(
      [],
      [],
      [
        {
          id: "custom-old",
          name: "椰子鸡",
          cuisine: "粤菜",
          type: "火锅",
          imageUrl: "/coconut.jpg",
          tags: ["清甜"],
          description: "清爽",
          spicyLevel: 0,
          priceLevel: 2,
        },
      ],
    );

    const second = normalizeStoredFoodData(
      first.categories,
      first.options,
      [],
    );

    expect(second).toEqual(first);
  });

  it("recovers a missing category from an option category name", () => {
    const recovered = normalizeStoredFoodData(
      [],
      [
        {
          id: "custom-noodles",
          categoryId: "missing",
          categoryName: "粉面",
          parentOptionId: null,
          name: "牛肉面",
          path: ["粉面", "牛肉面"],
          imageUrl: "/noodles.jpg",
          tags: ["面食"],
          description: "热汤面",
          selectable: true,
          sortOrder: 0,
          status: "active",
          source: "custom",
        },
      ],
      [],
    );

    expect(recovered.categories[0].name).toBe("粉面");
    expect(recovered.options[0].categoryId).toBe(recovered.categories[0].id);
  });
});
