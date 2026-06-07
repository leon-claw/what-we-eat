import { describe, expect, it } from "vitest";
import { normalizeRoomOption, normalizeRoomOptions } from "./room-options.js";

describe("room option normalization", () => {
  it("keeps a taxonomy option snapshot intact", () => {
    const option = normalizeRoomOption({
      id: "option-hotpot",
      sourceOptionId: "option-hotpot",
      categoryId: "category-hotpot",
      categoryName: "火锅香锅",
      parentOptionId: null,
      name: "川渝火锅",
      path: ["火锅香锅", "川渝火锅"],
      imageUrl: "/hotpot.jpg",
      tags: ["牛油锅"],
      description: "麻辣过瘾",
      spicyLevel: 3,
      priceLevel: 3,
      selectable: true,
      sortOrder: 0,
      status: "active",
      source: "system",
    });

    expect(option).toEqual({
      sourceOptionId: "option-hotpot",
      categoryId: "category-hotpot",
      categoryName: "火锅香锅",
      parentOptionId: null,
      parentOptionName: null,
      name: "川渝火锅",
      path: ["火锅香锅", "川渝火锅"],
      imageUrl: "/hotpot.jpg",
      tags: ["牛油锅"],
      description: "麻辣过瘾",
      spicyLevel: 3,
      priceLevel: 3,
      selectable: true,
      sortOrder: 0,
      status: "active",
      source: "system",
    });
  });

  it("migrates a legacy dish without type or prep time", () => {
    const option = normalizeRoomOption({
      id: "legacy",
      name: "麻婆豆腐",
      cuisine: "川菜",
      type: "下饭菜",
      imageUrl: "/mapo.jpg",
      tags: "麻辣,下饭",
      description: "",
      spicyLevel: 3,
      priceLevel: 1,
      prepTime: "20 分钟",
    });

    expect(option).toMatchObject({
      sourceOptionId: "legacy",
      categoryName: "川菜",
      parentOptionId: null,
      name: "麻婆豆腐",
      path: ["川菜", "麻婆豆腐"],
      tags: ["麻辣", "下饭"],
      description: "川菜 · 麻婆豆腐",
    });
    expect(option.categoryId).toMatch(/^category-legacy-/);
    expect("type" in option).toBe(false);
    expect("prepTime" in option).toBe(false);
  });

  it("filters malformed room options", () => {
    expect(
      normalizeRoomOptions([
        { name: "", categoryName: "火锅" },
        { name: "川渝火锅", categoryName: "" },
      ]),
    ).toEqual([]);
  });

  it("keeps null optional levels unlabelled", () => {
    const option = normalizeRoomOption({
      name: "测试菜品",
      categoryName: "测试分类",
      spicyLevel: null,
      priceLevel: null,
    });

    expect("spicyLevel" in option).toBe(false);
    expect("priceLevel" in option).toBe(false);
  });
});
