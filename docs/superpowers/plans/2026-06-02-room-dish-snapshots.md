# Room Dish Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store multiplayer room dishes as server-owned snapshots instead of client-local ID references.

**Architecture:** Add a `room_dishes` table to the Express/SQLite backend and include full `dishes` in public room payloads. Keep `dishIds` as a compatibility mirror while updating the React app to use `room.dishes` in room mode.

**Tech Stack:** Express, Node SQLite, React, TypeScript, Vite.

---

### Task 1: Regression Check

- [ ] Run a one-off Node script that creates a room with a synthetic custom dish object and expects the API response to include `room.dishes`. This should fail before implementation because the current API accepts only `dishIds`.

### Task 2: Server Snapshots

- [ ] Add `room_dishes` schema and statements in `server/index.js`.
- [ ] Clone full dish objects on room creation.
- [ ] Return `dishes` and compatibility `dishIds` from `getPublicRoom`.
- [ ] Add a full dish snapshot during `POST /api/rooms/:roomCode/dishes`.
- [ ] Validate votes against room snapshot IDs.

### Task 3: Client Room Flow

- [ ] Add `dishes: Dish[]` to `Room`.
- [ ] Change `createRoom` to send `dishes`.
- [ ] Change `addRoomDish` to send full dish objects.
- [ ] Use `currentRoom.dishes` for room mode selection/results/progress.
- [ ] Keep single-player and local custom dish storage unchanged.

### Task 4: Verification

- [ ] Re-run the room snapshot regression check and confirm it passes.
- [ ] Run `npm run build`.
- [ ] Browser-check room creation/add dish flow at a high level.
