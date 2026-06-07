import cors from "cors";
import express from "express";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import {
  normalizeRoomOption,
  normalizeRoomOptions,
} from "./room-options.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DB_PATH = process.env.DB_PATH || join(__dirname, "..", "data", "what-we-eat.sqlite");

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS rooms (
    room_code TEXT PRIMARY KEY,
    host_member_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('waiting', 'selecting', 'finished')),
    dish_ids_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    joined_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS votes (
    room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    dish_id TEXT NOT NULL,
    choice TEXT NOT NULL CHECK (choice IN ('like', 'pass')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (room_code, member_id, dish_id)
  );

  CREATE TABLE IF NOT EXISTS room_dishes (
    id TEXT PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
    source_dish_id TEXT,
    source_option_id TEXT,
    name TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    type TEXT NOT NULL,
    category_id TEXT,
    category_name TEXT,
    parent_option_id TEXT,
    parent_option_name TEXT,
    path_json TEXT,
    image_url TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    description TEXT NOT NULL,
    spicy_level INTEGER NOT NULL,
    price_level INTEGER NOT NULL,
    spicy_level_value INTEGER,
    price_level_value INTEGER,
    prep_time TEXT NOT NULL,
    selectable INTEGER,
    sort_order INTEGER,
    source TEXT,
    status TEXT,
    created_by_member_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const roomDishColumns = new Set(
  db.prepare("PRAGMA table_info(room_dishes)").all().map((column) => column.name),
);
const roomDishMigrations = [
  ["source_option_id", "TEXT"],
  ["category_id", "TEXT"],
  ["category_name", "TEXT"],
  ["parent_option_id", "TEXT"],
  ["parent_option_name", "TEXT"],
  ["path_json", "TEXT"],
  ["spicy_level_value", "INTEGER"],
  ["price_level_value", "INTEGER"],
  ["selectable", "INTEGER"],
  ["sort_order", "INTEGER"],
  ["source", "TEXT"],
  ["status", "TEXT"],
];

for (const [columnName, definition] of roomDishMigrations) {
  if (!roomDishColumns.has(columnName)) {
    db.exec(`ALTER TABLE room_dishes ADD COLUMN ${columnName} ${definition}`);
  }
}

const statements = {
  getRoom: db.prepare("SELECT * FROM rooms WHERE room_code = ?"),
  insertRoom: db.prepare(
    "INSERT INTO rooms (room_code, host_member_id, status, dish_ids_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ),
  updateRoomStatus: db.prepare("UPDATE rooms SET status = ?, updated_at = ? WHERE room_code = ?"),
  updateRoomHost: db.prepare("UPDATE rooms SET host_member_id = ?, updated_at = ? WHERE room_code = ?"),
  updateRoomDishes: db.prepare("UPDATE rooms SET dish_ids_json = ?, updated_at = ? WHERE room_code = ?"),
  deleteRoom: db.prepare("DELETE FROM rooms WHERE room_code = ?"),
  insertMember: db.prepare("INSERT INTO members (id, room_code, name, joined_at) VALUES (?, ?, ?, ?)"),
  listMembers: db.prepare("SELECT id, name, joined_at AS joinedAt FROM members WHERE room_code = ? ORDER BY joined_at ASC"),
  memberInRoom: db.prepare("SELECT id FROM members WHERE room_code = ? AND id = ?"),
  deleteMember: db.prepare("DELETE FROM members WHERE room_code = ? AND id = ?"),
  insertRoomDish: db.prepare(`
    INSERT INTO room_dishes (
      id, room_code, source_dish_id, source_option_id, name, cuisine, type,
      category_id, category_name, parent_option_id, parent_option_name, path_json,
      image_url, tags_json, description, spicy_level, price_level,
      spicy_level_value, price_level_value, prep_time, selectable, sort_order,
      source, status, created_by_member_id, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  listRoomDishes: db.prepare(`
    SELECT
      id,
      source_dish_id AS sourceDishId,
      source_option_id AS sourceOptionId,
      name,
      cuisine,
      type,
      category_id AS categoryId,
      category_name AS categoryName,
      parent_option_id AS parentOptionId,
      parent_option_name AS parentOptionName,
      path_json AS pathJson,
      image_url AS imageUrl,
      tags_json AS tagsJson,
      description,
      spicy_level AS legacySpicyLevel,
      price_level AS legacyPriceLevel,
      spicy_level_value AS spicyLevelValue,
      price_level_value AS priceLevelValue,
      selectable,
      sort_order AS sortOrder,
      source,
      status
    FROM room_dishes
    WHERE room_code = ?
    ORDER BY created_at ASC
  `),
  getRoomDishBySource: db.prepare(
    "SELECT id FROM room_dishes WHERE room_code = ? AND COALESCE(source_option_id, source_dish_id) = ? LIMIT 1",
  ),
  upsertVote: db.prepare(`
    INSERT INTO votes (room_code, member_id, dish_id, choice, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_code, member_id, dish_id)
    DO UPDATE SET choice = excluded.choice, updated_at = excluded.updated_at
  `),
  deleteRoomVotes: db.prepare("DELETE FROM votes WHERE room_code = ?"),
  deleteMemberVotes: db.prepare("DELETE FROM votes WHERE room_code = ? AND member_id = ?"),
  listVotes: db.prepare("SELECT member_id AS memberId, dish_id AS dishId, choice FROM votes WHERE room_code = ?"),
};

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
const socketsByRoom = new Map();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRoomCode(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 6);
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let roomCode = "";

  do {
    roomCode = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  } while (statements.getRoom.get(roomCode));

  return roomCode;
}

function parseDishIds(row) {
  try {
    const parsed = JSON.parse(row.dish_ids_json);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function optionFromRow(row) {
  const taxonomyRow = Boolean(row.categoryName);
  const option = normalizeRoomOption({
    ...row,
    spicyLevel: taxonomyRow ? row.spicyLevelValue : row.legacySpicyLevel,
    priceLevel: taxonomyRow ? row.priceLevelValue : row.legacyPriceLevel,
  });
  return option ? { id: row.id, ...option } : null;
}

function insertRoomOption(roomCode, option, createdByMemberId, now) {
  const id = createId("roomdish");
  const legacySpicyLevel = option.spicyLevel ?? 0;
  const legacyPriceLevel = option.priceLevel ?? 2;
  const legacyType = option.parentOptionName || option.name;

  statements.insertRoomDish.run(
    id,
    roomCode,
    option.sourceOptionId,
    option.sourceOptionId,
    option.name,
    option.categoryName,
    legacyType,
    option.categoryId,
    option.categoryName,
    option.parentOptionId,
    option.parentOptionName,
    JSON.stringify(option.path),
    option.imageUrl,
    JSON.stringify(option.tags),
    option.description,
    legacySpicyLevel,
    legacyPriceLevel,
    option.spicyLevel ?? null,
    option.priceLevel ?? null,
    "",
    option.selectable ? 1 : 0,
    option.sortOrder,
    option.source,
    option.status,
    createdByMemberId,
    now,
    now,
  );
  return id;
}

function getPublicRoom(roomCode) {
  const row = statements.getRoom.get(roomCode);
  if (!row) return null;

  const options = statements.listRoomDishes
    .all(roomCode)
    .map(optionFromRow)
    .filter(Boolean);
  const dishIds = options.length
    ? options.map((option) => option.id)
    : parseDishIds(row);

  return {
    roomCode: row.room_code,
    hostMemberId: row.host_member_id,
    status: row.status,
    members: statements.listMembers.all(roomCode),
    dishIds,
    options,
    votes: statements.listVotes.all(roomCode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sendError(response, status, error) {
  response.status(status).json({ error });
}

function runTransaction(callback) {
  db.exec("BEGIN");
  try {
    callback();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function roomIsDone(room) {
  return (
    room.members.length > 0 &&
    room.members.every(
      (member) => room.votes.filter((vote) => vote.memberId === member.id).length >= room.dishIds.length,
    )
  );
}

function broadcastPayload(roomCode, payload) {
  const message = JSON.stringify(payload);
  for (const socket of socketsByRoom.get(roomCode) ?? []) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}

function broadcast(roomCode) {
  const room = getPublicRoom(roomCode);
  broadcastPayload(roomCode, room ? { type: "room_updated", room } : { type: "room_closed", roomCode });
}

function requireRoom(request, response) {
  const roomCode = normalizeRoomCode(request.params.roomCode);
  const room = getPublicRoom(roomCode);

  if (!room) {
    sendError(response, 404, "没有找到这个房间。");
    return null;
  }

  return room;
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, dbPath: DB_PATH });
});

app.get("/api/rooms/:roomCode", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;
  response.json({ room });
});

app.post("/api/rooms", (request, response) => {
  const name = String(request.body.name || "").trim() || "匿名吃货";
  const options = normalizeRoomOptions(
    request.body.options ?? request.body.dishes,
  );
  const legacyDishIds = Array.isArray(request.body.dishIds) ? request.body.dishIds.filter(Boolean) : [];
  const requestedCode = normalizeRoomCode(request.body.roomCode);
  const roomCode = requestedCode || generateRoomCode();

  if (!options.length && !legacyDishIds.length) {
    sendError(response, 400, "创建房间需要至少一个菜品。");
    return;
  }

  if (statements.getRoom.get(roomCode)) {
    sendError(response, 409, "这个房间码已经存在。");
    return;
  }

  const now = Date.now();
  const member = {
    id: createId("member"),
    name,
    joinedAt: now,
  };

  runTransaction(() => {
    statements.insertRoom.run(roomCode, member.id, "waiting", JSON.stringify(legacyDishIds), now, now);
    statements.insertMember.run(member.id, roomCode, member.name, member.joinedAt);
    if (options.length) {
      const dishIds = options.map((option) =>
        insertRoomOption(roomCode, option, member.id, now),
      );
      statements.updateRoomDishes.run(JSON.stringify(dishIds), now, roomCode);
    }
  });

  const room = getPublicRoom(roomCode);
  broadcast(roomCode);
  response.status(201).json({ room, member });
});

app.post("/api/rooms/:roomCode/join", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  if (room.status !== "waiting") {
    sendError(response, 409, room.status === "finished" ? "这个房间已经汇总完成。" : "这个房间已经开始选菜。");
    return;
  }

  const name = String(request.body.name || "").trim() || "匿名吃货";
  const existingMemberId = String(request.body.memberId || "").trim();

  if (existingMemberId) {
    const existingMember = room.members.find((member) => member.id === existingMemberId);
    if (existingMember) {
      response.json({ room, member: existingMember });
      return;
    }
  }

  const member = {
    id: createId("member"),
    name,
    joinedAt: Date.now(),
  };

  statements.insertMember.run(member.id, room.roomCode, member.name, member.joinedAt);
  statements.updateRoomStatus.run(room.status, Date.now(), room.roomCode);
  const nextRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  response.status(201).json({ room: nextRoom, member });
});

app.post("/api/rooms/:roomCode/leave", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  const memberId = String(request.body.memberId || "").trim();
  const leavingMember = room.members.find((member) => member.id === memberId);

  if (!leavingMember) {
    sendError(response, 404, "你已经不在这个房间里。");
    return;
  }

  let nextRoom = null;

  runTransaction(() => {
    statements.deleteMemberVotes.run(room.roomCode, memberId);
    statements.deleteMember.run(room.roomCode, memberId);

    const remainingMembers = statements.listMembers.all(room.roomCode);
    if (!remainingMembers.length) {
      statements.deleteRoom.run(room.roomCode);
      return;
    }

    const nextHostMemberId =
      room.hostMemberId === memberId ? remainingMembers[0].id : room.hostMemberId;
    statements.updateRoomHost.run(nextHostMemberId, Date.now(), room.roomCode);

    const refreshedRoom = getPublicRoom(room.roomCode);
    if (refreshedRoom?.status === "selecting" && roomIsDone(refreshedRoom)) {
      statements.updateRoomStatus.run("finished", Date.now(), room.roomCode);
    }
  });

  nextRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  if (nextRoom) {
    const isLastRemainingPlayer = nextRoom.members.length <= 1;
    broadcastPayload(room.roomCode, {
      type: "room_notice",
      roomCode: room.roomCode,
      notice: isLastRemainingPlayer ? "all_others_left" : "member_left",
      member: leavingMember,
      message: isLastRemainingPlayer ? "所有玩家都退出了" : `${leavingMember.name} 已退出房间`,
    });
  }
  response.json({ room: nextRoom });
});

app.post("/api/rooms/:roomCode/start", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  if (request.body.memberId !== room.hostMemberId) {
    sendError(response, 403, "只有房主可以开始选菜。");
    return;
  }

  if (room.status !== "waiting") {
    sendError(response, 409, "这个房间不在等待状态。");
    return;
  }

  if (room.members.length < 2) {
    sendError(response, 409, "至少两个人加入后才能开始。");
    return;
  }

  runTransaction(() => {
    statements.deleteRoomVotes.run(room.roomCode);
    statements.updateRoomStatus.run("selecting", Date.now(), room.roomCode);
  });

  const nextRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  response.json({ room: nextRoom });
});

app.post("/api/rooms/:roomCode/dishes", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  if (room.status !== "waiting") {
    sendError(response, 409, "只有等待阶段可以新增本轮候选。");
    return;
  }

  const option = normalizeRoomOption(
    request.body.option || request.body.dish || request.body,
  );
  if (!option) {
    sendError(response, 400, "缺少完整菜品信息。");
    return;
  }

  let dishIds = room.dishIds;
  const existing =
    option.sourceOptionId &&
    statements.getRoomDishBySource.get(room.roomCode, option.sourceOptionId);
  if (!existing) {
    const now = Date.now();
    const createdByMemberId = String(request.body.memberId || "").trim() || null;
    const dishId = insertRoomOption(room.roomCode, option, createdByMemberId, now);
    dishIds = [...room.dishIds, dishId];
    statements.updateRoomDishes.run(JSON.stringify(dishIds), now, room.roomCode);
  }

  const nextRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  response.json({ room: nextRoom });
});

app.post("/api/rooms/:roomCode/votes", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  const { memberId, dishId, choice } = request.body;

  if (room.status !== "selecting") {
    sendError(response, 409, "房间尚未开始选菜。");
    return;
  }

  if (!statements.memberInRoom.get(room.roomCode, memberId)) {
    sendError(response, 403, "你不在这个房间里。");
    return;
  }

  if (!room.dishIds.includes(dishId)) {
    sendError(response, 400, "这个菜品不在本轮候选里。");
    return;
  }

  if (choice !== "like" && choice !== "pass") {
    sendError(response, 400, "投票选择无效。");
    return;
  }

  const now = Date.now();
  statements.upsertVote.run(room.roomCode, memberId, dishId, choice, now, now);

  const nextRoom = getPublicRoom(room.roomCode);
  if (roomIsDone(nextRoom)) {
    statements.updateRoomStatus.run("finished", Date.now(), room.roomCode);
  }

  const finalRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  response.json({ room: finalRoom });
});

app.post("/api/rooms/:roomCode/reset", (request, response) => {
  const room = requireRoom(request, response);
  if (!room) return;

  if (request.body.memberId !== room.hostMemberId) {
    sendError(response, 403, "只有房主可以开启新一轮。");
    return;
  }

  runTransaction(() => {
    statements.deleteRoomVotes.run(room.roomCode);
    statements.updateRoomStatus.run("waiting", Date.now(), room.roomCode);
  });

  const nextRoom = getPublicRoom(room.roomCode);
  broadcast(room.roomCode);
  response.json({ room: nextRoom });
});

wss.on("connection", (socket, request) => {
  const url = new URL(request.url || "", `http://${request.headers.host}`);
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode"));

  if (!roomCode) {
    socket.close(1008, "roomCode required");
    return;
  }

  if (!socketsByRoom.has(roomCode)) {
    socketsByRoom.set(roomCode, new Set());
  }

  socketsByRoom.get(roomCode).add(socket);

  const room = getPublicRoom(roomCode);
  if (room) {
    socket.send(JSON.stringify({ type: "room_updated", room }));
  }

  socket.on("close", () => {
    socketsByRoom.get(roomCode)?.delete(socket);
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "服务器内部错误，请稍后再试。" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`What We Eat backend listening on http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
