export type VoteChoice = "like" | "pass";

export type FoodSource = "system" | "custom";
export type FoodStatus = "active" | "archived";

export type FoodCategory = {
  id: string;
  name: string;
  sortOrder: number;
  status: FoodStatus;
  source: FoodSource;
  createdAt?: number;
  updatedAt?: number;
};

export type FoodOption = {
  id: string;
  sourceOptionId?: string | null;
  categoryId: string;
  categoryName: string;
  parentOptionId: string | null;
  parentOptionName?: string | null;
  name: string;
  path: string[];
  imageUrl: string;
  tags: string[];
  description: string;
  spicyLevel?: 0 | 1 | 2 | 3;
  priceLevel?: 1 | 2 | 3;
  selectable: boolean;
  sortOrder: number;
  status: FoodStatus;
  source: FoodSource;
  createdAt?: number;
  updatedAt?: number;
};

export type Member = {
  id: string;
  name: string;
  joinedAt: number;
};

export type Vote = {
  memberId: string;
  dishId: string;
  choice: VoteChoice;
};

export type RoomStatus = "waiting" | "selecting" | "finished";

export type Room = {
  roomCode: string;
  hostMemberId: string;
  status: RoomStatus;
  members: Member[];
  dishIds: string[];
  options: FoodOption[];
  votes: Vote[];
  createdAt: number;
  updatedAt: number;
};

export type FlowMode =
  | "setup-choice"
  | "home"
  | "dish-pool"
  | "category-select"
  | "option-select"
  | "identity"
  | "room"
  | "swipe"
  | "results";

export type SessionContext =
  | {
      kind: "single";
      member: Member;
    }
  | {
      kind: "room";
      roomCode: string;
      member: Member;
    };
