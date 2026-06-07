import type { FoodOption, Room, VoteChoice } from "../types";

const API_BASE =
  import.meta.env.VITE_API_URL ||
  `${window.location.protocol}//${window.location.hostname || "localhost"}:8787`;

function wsBase() {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;

  const url = new URL(API_BASE);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString().replace(/\/$/, "");
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "接口请求失败，请稍后再试。");
  }

  return payload as T;
}

export function getRoom(roomCode: string) {
  return apiRequest<{ room: Room }>(`/api/rooms/${roomCode}`);
}

export function createRoom(
  name: string,
  options: FoodOption[],
  roomCode?: string,
) {
  return apiRequest<{ room: Room; member: Room["members"][number] }>("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name, options, roomCode }),
  });
}

export function joinRoom(roomCode: string, name: string, memberId?: string) {
  return apiRequest<{ room: Room; member: Room["members"][number] }>(`/api/rooms/${roomCode}/join`, {
    method: "POST",
    body: JSON.stringify({ name, memberId }),
  });
}

export function leaveRoom(roomCode: string, memberId: string) {
  return apiRequest<{ room: Room | null }>(`/api/rooms/${roomCode}/leave`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export function startRoom(roomCode: string, memberId: string) {
  return apiRequest<{ room: Room }>(`/api/rooms/${roomCode}/start`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export function addRoomOption(
  roomCode: string,
  option: FoodOption,
  memberId?: string,
) {
  return apiRequest<{ room: Room }>(`/api/rooms/${roomCode}/dishes`, {
    method: "POST",
    body: JSON.stringify({ option, memberId }),
  });
}

export function recordRoomVote(roomCode: string, memberId: string, dishId: string, choice: VoteChoice) {
  return apiRequest<{ room: Room }>(`/api/rooms/${roomCode}/votes`, {
    method: "POST",
    body: JSON.stringify({ memberId, dishId, choice }),
  });
}

export function resetRoom(roomCode: string, memberId: string) {
  return apiRequest<{ room: Room }>(`/api/rooms/${roomCode}/reset`, {
    method: "POST",
    body: JSON.stringify({ memberId }),
  });
}

export function getRoomWebSocketUrl(roomCode: string) {
  const url = new URL(`${wsBase()}/ws`);
  url.searchParams.set("roomCode", roomCode);
  return url.toString();
}
