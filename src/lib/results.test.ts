import { describe, expect, it } from "vitest";
import { summarizeResults } from "./results";
import type { FoodOption, Member, Vote } from "../types";

const option = (id: string, name: string): FoodOption => ({
  id,
  categoryId: "category-hotpot",
  categoryName: "火锅香锅",
  parentOptionId: null,
  name,
  path: ["火锅香锅", name],
  imageUrl: "/hotpot.jpg",
  tags: [name],
  description: name,
  selectable: true,
  sortOrder: 0,
  status: "active",
  source: "system",
});

describe("result summaries", () => {
  it("aggregates likes by first-level category", () => {
    const options = [
      option("option-hotpot", "川渝火锅"),
      option("option-malatang", "麻辣烫"),
    ];
    const members: Member[] = [
      { id: "member-1", name: "甲", joinedAt: 1 },
      { id: "member-2", name: "乙", joinedAt: 2 },
    ];
    const votes: Vote[] = [
      { memberId: "member-1", dishId: "option-hotpot", choice: "like" },
      { memberId: "member-2", dishId: "option-malatang", choice: "like" },
    ];

    const result = summarizeResults(options, members, votes);

    expect(result.categories).toEqual([
      { category: "火锅香锅", likes: 2 },
    ]);
  });
});
