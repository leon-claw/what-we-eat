import { describe, expect, it } from "vitest";
import {
  buildRoomWebSocketUrl,
  resolveWebSocketBase,
} from "./apiUrl";

describe("API URL resolution", () => {
  it("resolves a relative HTTPS API subpath to WSS", () => {
    expect(
      resolveWebSocketBase(
        "/app/what-we-eat",
        "https://web.jianghong.site",
      ),
    ).toBe("wss://web.jianghong.site/app/what-we-eat");
  });

  it("converts an absolute HTTP API URL to WS", () => {
    expect(
      resolveWebSocketBase(
        "http://localhost:8787",
        "http://localhost:5173",
      ),
    ).toBe("ws://localhost:8787");
  });

  it("prefers an explicit WebSocket URL and resolves relative overrides", () => {
    expect(
      resolveWebSocketBase(
        "/ignored",
        "https://web.jianghong.site",
        "/socket-service",
      ),
    ).toBe("wss://web.jianghong.site/socket-service");
  });

  it("builds the room WebSocket URL under the deployment subpath", () => {
    expect(
      buildRoomWebSocketUrl(
        "/app/what-we-eat",
        "https://web.jianghong.site",
        "111",
      ),
    ).toBe(
      "wss://web.jianghong.site/app/what-we-eat/ws?roomCode=111",
    );
  });
});
