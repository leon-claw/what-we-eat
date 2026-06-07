import type { FoodOption, Member, Vote } from "../types";

export type FoodOptionResult = {
  option: FoodOption;
  likes: number;
  likedBy: Member[];
};

export type PersonalResult = {
  member: Member;
  options: FoodOption[];
};

export type CategoryResult = {
  category: string;
  likes: number;
};

export function summarizeResults(
  options: FoodOption[],
  members: Member[],
  votes: Vote[],
) {
  const memberCount = Math.max(members.length, 1);
  const optionById = new Map(options.map((option) => [option.id, option]));
  const memberById = new Map(members.map((member) => [member.id, member]));
  const likedVotes = votes.filter((vote) => vote.choice === "like");

  const optionResults = options
    .map((option) => {
      const likedBy = likedVotes
        .filter((vote) => vote.dishId === option.id)
        .map((vote) => memberById.get(vote.memberId))
        .filter(Boolean) as Member[];

      return {
        option,
        likes: likedBy.length,
        likedBy,
      };
    })
    .filter((result) => result.likes > 0)
    .sort(
      (a, b) =>
        b.likes - a.likes ||
        a.option.name.localeCompare(b.option.name, "zh-CN"),
    );

  const allLoved = optionResults.filter(
    (result) => result.likes === memberCount,
  );
  const majorityLoved = optionResults.filter(
    (result) => result.likes > memberCount / 2 && result.likes < memberCount,
  );

  const personalResults = members.map((member) => ({
    member,
    options: likedVotes
      .filter((vote) => vote.memberId === member.id)
      .map((vote) => optionById.get(vote.dishId))
      .filter(Boolean) as FoodOption[],
  }));

  const categoryCounts = likedVotes.reduce((counts, vote) => {
    const option = optionById.get(vote.dishId);
    if (!option) return counts;
    counts.set(
      option.categoryName,
      (counts.get(option.categoryName) ?? 0) + 1,
    );
    return counts;
  }, new Map<string, number>());

  const categories = Array.from(categoryCounts.entries())
    .map(([category, likes]) => ({ category, likes }))
    .sort(
      (a, b) =>
        b.likes - a.likes ||
        a.category.localeCompare(b.category, "zh-CN"),
    );

  return {
    allLoved,
    majorityLoved,
    personalResults,
    categories,
    optionResults,
  };
}
