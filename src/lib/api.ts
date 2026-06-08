import type { FoodOption, Room, VoteChoice } from "../types";
import { buildRoomWebSocketUrl, resolveApiBase } from "./apiUrl";

const API_BASE = resolveApiBase({
  configuredApiUrl: import.meta.env.VITE_API_URL,
  baseUrl: import.meta.env.BASE_URL,
  isDev: import.meta.env.DEV,
  pageProtocol: window.location.protocol,
  pageHostname: window.location.hostname,
});

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
  return buildRoomWebSocketUrl(
    API_BASE,
    window.location.origin,
    roomCode,
    import.meta.env.VITE_WS_URL,
  );
}
