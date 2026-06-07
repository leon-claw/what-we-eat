import { normalizeStoredFoodData } from "./foodOptions";
import type { FoodCategory, FoodOption, Member, Room } from "../types";

export const USER_DISHES_KEY = "what-we-eat:user-dishes";
export const USER_CATEGORIES_KEY = "what-we-eat:user-categories";
export const USER_OPTIONS_KEY = "what-we-eat:user-options";
export const ROOMS_KEY = "what-we-eat:rooms";
export const CURRENT_MEMBER_KEY = "what-we-eat:current-member";
export const ROOMS_CHANNEL = "what-we-eat:rooms-channel";
export const PLAYER_NAME_KEY = "what-we-eat:player-name";

export type StoredCurrentMember = {
  roomCode: string;
  member: Member;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export type UserFoodData = {
  categories: FoodCategory[];
  options: FoodOption[];
};

export function loadUserFoodData(): UserFoodData {
  const normalized = normalizeStoredFoodData(
    readJson<unknown>(USER_CATEGORIES_KEY, []),
    readJson<unknown>(USER_OPTIONS_KEY, []),
    readJson<unknown>(USER_DISHES_KEY, []),
  );

  try {
    writeJson(USER_CATEGORIES_KEY, normalized.categories);
    writeJson(USER_OPTIONS_KEY, normalized.options);
    localStorage.removeItem(USER_DISHES_KEY);
  } catch {
    // Keep the legacy key when migration cannot be persisted.
  }

  return normalized;
}

export function saveUserFoodData(
  categories: FoodCategory[],
  options: FoodOption[],
) {
  writeJson(
    USER_CATEGORIES_KEY,
    categories.filter((category) => category.source === "custom"),
  );
  writeJson(
    USER_OPTIONS_KEY,
    options.filter((option) => option.source === "custom"),
  );
}

export function loadPlayerName() {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function savePlayerName(name: string) {
  localStorage.setItem(PLAYER_NAME_KEY, name);
}

export function loadRooms() {
  return readJson<Partial<Room>[]>(ROOMS_KEY, []).map(normalizeRoom).filter(Boolean) as Room[];
}

export function saveRooms(rooms: Room[]) {
  writeJson(ROOMS_KEY, rooms);
}

function normalizeRoom(room: Partial<Room> | null | undefined): Room | null {
  if (!room?.roomCode || !room.members?.length || !room.dishIds || !room.votes) {
    return null;
  }

  const votes = room.votes;
  const legacyRoom = room as Partial<Room> & { dishes?: unknown };
  const options = Array.isArray(room.options)
    ? room.options
    : normalizeStoredFoodData([], [], legacyRoom.dishes).options;
  const dishIds = options.length
    ? options.map((option) => option.id)
    : room.dishIds;
  const hostMemberId = room.hostMemberId ?? room.members[0]?.id;
  if (!hostMemberId) return null;

  const inferredDone = room.members.every(
    (member) => votes.filter((vote) => vote.memberId === member.id).length >= dishIds.length,
  );
  const status =
    room.status === "waiting" || room.status === "selecting" || room.status === "finished"
      ? room.status
      : "selecting";

  return {
    roomCode: room.roomCode,
    hostMemberId,
    status: inferredDone ? "finished" : status,
    members: room.members,
    dishIds,
    options,
    votes,
    createdAt: room.createdAt ?? Date.now(),
    updatedAt: room.updatedAt ?? Date.now(),
  };
}

export function loadCurrentMember() {
  try {
    const raw = sessionStorage.getItem(CURRENT_MEMBER_KEY);
    return raw ? (JSON.parse(raw) as StoredCurrentMember) : null;
  } catch {
    return null;
  }
}

export function saveCurrentMember(current: StoredCurrentMember) {
  sessionStorage.setItem(CURRENT_MEMBER_KEY, JSON.stringify(current));
}

export function clearCurrentMember() {
  sessionStorage.removeItem(CURRENT_MEMBER_KEY);
}
