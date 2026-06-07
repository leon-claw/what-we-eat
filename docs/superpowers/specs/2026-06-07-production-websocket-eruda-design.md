# Production WebSocket and Eruda Design

## Goal

Fix room pages crashing under a subpath production deployment and add an
opt-in mobile debugging console.

## Root Cause

The production API base is configured as `/app/what-we-eat`. HTTP `fetch`
accepts this relative path, but `new URL("/app/what-we-eat")` does not. The
room page creates its WebSocket URL after joining, so the successful HTTP join
is followed by a render-time `Invalid URL` exception.

## WebSocket URL Resolution

- Resolve relative API and WebSocket bases against `window.location.origin`.
- Convert `https:` to `wss:` and `http:` to `ws:`.
- Preserve deployment subpaths, producing:
  `wss://web.jianghong.site/app/what-we-eat/ws?roomCode=111`.
- Keep an explicit `VITE_WS_URL` override supported.
- Put URL resolution in pure exported helpers so relative, absolute, and
  override cases are unit tested without a browser build.

## Eruda

- Add `eruda` as a production dependency.
- On application startup, inspect `window.location.search`.
- Only when `vconsole=1`, dynamically import Eruda and call `init()`.
- Normal visits do not request the Eruda chunk and do not initialize a debug
  console.
- Eruda initialization failure is logged without preventing the React app from
  rendering.

## Verification

- A relative API base no longer throws.
- HTTPS subpath deployment resolves to a WSS URL with the same subpath.
- Explicit WebSocket URLs remain supported.
- `?vconsole=1` enables Eruda; missing or different values do not.
- Tests, TypeScript, and a build with base/API subpaths pass.
