import { describe, expect, it } from "vitest";
import { normalizeRoomVoteBatch } from "./room-votes.js";

const room = {
  dishIds: ["dish-1", "dish-2"],
};

describe("room vote batches", () => {
  it("normalizes a batch and keeps the last vote for duplicate dishes", () => {
    expect(
      normalizeRoomVoteBatch(room, "member-1", [
        { dishId: "dish-1", choice: "pass" },
        { dishId: "dish-1", choice: "like" },
        { dishId: "dish-2", choice: "pass" },
      ]),
    ).toEqual({
      votes: [
        { memberId: "member-1", dishId: "dish-1", choice: "like" },
        { memberId: "member-1", dishId: "dish-2", choice: "pass" },
      ],
    });
  });

  it("rejects invalid choices", () => {
    expect(
      normalizeRoomVoteBatch(room, "member-1", [
        { dishId: "dish-1", choice: "maybe" },
      ]),
    ).toEqual({ error: "投票选择无效。" });
  });

  it("rejects dishes outside the room snapshot", () => {
    expect(
      normalizeRoomVoteBatch(room, "member-1", [
        { dishId: "dish-3", choice: "like" },
      ]),
    ).toEqual({ error: "这个菜品不在本轮候选里。" });
  });
});
