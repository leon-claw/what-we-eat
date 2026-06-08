function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeRoomVoteBatch(room, memberId, inputVotes) {
  const normalizedMemberId = cleanText(memberId);
  if (!normalizedMemberId) {
    return { error: "缺少成员信息。" };
  }

  if (!Array.isArray(inputVotes) || inputVotes.length === 0) {
    return { error: "至少提交一个投票。" };
  }

  const roomDishIds = new Set(room.dishIds);
  const votesByDishId = new Map();

  for (const inputVote of inputVotes) {
    const dishId = cleanText(inputVote?.dishId);
    const choice = inputVote?.choice;

    if (!roomDishIds.has(dishId)) {
      return { error: "这个菜品不在本轮候选里。" };
    }

    if (choice !== "like" && choice !== "pass") {
      return { error: "投票选择无效。" };
    }

    votesByDishId.set(dishId, {
      memberId: normalizedMemberId,
      dishId,
      choice,
    });
  }

  return { votes: Array.from(votesByDishId.values()) };
}
