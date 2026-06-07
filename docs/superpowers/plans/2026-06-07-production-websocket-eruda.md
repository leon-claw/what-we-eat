# Production WebSocket and Eruda Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix WebSocket URL construction for relative production API paths and conditionally load Eruda with `vconsole=1`.

**Architecture:** Extract URL resolution into pure helpers consumed by the API module. Add a small debug-console bootstrap module that dynamically imports Eruda only for the opt-in query parameter.

**Tech Stack:** TypeScript, Vite, Vitest, Eruda

---

### Task 1: WebSocket URL resolution

**Files:**
- Create: `src/lib/apiUrl.test.ts`
- Create: `src/lib/apiUrl.ts`
- Modify: `src/lib/api.ts`

- [x] Add failing tests for relative HTTPS subpaths, absolute HTTP URLs, explicit
  WebSocket overrides, and room-code query parameters.
- [x] Run `npm test -- src/lib/apiUrl.test.ts` and confirm the helper module is
  missing.
- [x] Implement `resolveWebSocketBase` and `buildRoomWebSocketUrl`.
- [x] Update `src/lib/api.ts` to use the tested helper.
- [x] Run the focused test and confirm it passes.

### Task 2: Opt-in Eruda bootstrap

**Files:**
- Create: `src/lib/debugConsole.test.ts`
- Create: `src/lib/debugConsole.ts`
- Modify: `src/main.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`

- [x] Add failing tests for `vconsole=1`, missing values, and other values.
- [x] Run `npm test -- src/lib/debugConsole.test.ts` and confirm the helper is
  missing.
- [x] Install Eruda and implement conditional dynamic loading.
- [x] Call the bootstrap before rendering React without blocking rendering.
- [x] Run the focused test and confirm it passes.

### Task 3: Verification

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Build with `VITE_API_URL=/app/what-we-eat` and Vite base
  `/app/what-we-eat/`.
- [x] Inspect the production bundle to confirm the resolved helper and separate
  Eruda chunk.
- [x] Run `git diff --check`.
