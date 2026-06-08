import { describe, expect, it } from "vitest";
import {
  mergeMemberLocalVotes,
  upsertLocalVote,
} from "./roomVotes";
import type { Vote } from "../types";

describe("room vote buffering", () => {
  it("upserts a local vote without duplicating the same dish", () => {
    const votes: Vote[] = [
      { memberId: "member-1", dishId: "dish-1", choice: "pass" },
    ];

    expect(
      upsertLocalVote(votes, {
        memberId: "member-1",
        dishId: "dish-1",
        choice: "like",
      }),
    ).toEqual([
      { memberId: "member-1", dishId: "dish-1", choice: "like" },
    ]);
  });

  it("merges local votes over persisted votes for the active member", () => {
    const roomVotes: Vote[] = [
      { memberId: "member-1", dishId: "dish-1", choice: "pass" },
      { memberId: "member-2", dishId: "dish-1", choice: "like" },
    ];
    const localVotes: Vote[] = [
      { memberId: "member-1", dishId: "dish-1", choice: "like" },
      { memberId: "member-1", dishId: "dish-2", choice: "pass" },
    ];

    expect(mergeMemberLocalVotes(roomVotes, localVotes, "member-1")).toEqual([
      { memberId: "member-2", dishId: "dish-1", choice: "like" },
      { memberId: "member-1", dishId: "dish-1", choice: "like" },
      { memberId: "member-1", dishId: "dish-2", choice: "pass" },
    ]);
  });
});
