import type { Vote } from "../types";

function sameVoteTarget(left: Vote, right: Vote) {
  return left.memberId === right.memberId && left.dishId === right.dishId;
}

export function upsertLocalVote(votes: Vote[], vote: Vote) {
  return [...votes.filter((item) => !sameVoteTarget(item, vote)), vote];
}

export function mergeMemberLocalVotes(
  roomVotes: Vote[],
  localVotes: Vote[],
  memberId: string,
) {
  const localDishIds = new Set(
    localVotes
      .filter((vote) => vote.memberId === memberId)
      .map((vote) => vote.dishId),
  );

  return [
    ...roomVotes.filter(
      (vote) => vote.memberId !== memberId || !localDishIds.has(vote.dishId),
    ),
    ...localVotes,
  ];
}
