function toWebSocketProtocol(url: URL) {
  if (url.protocol === "https:") {
    url.protocol = "wss:";
  } else if (url.protocol === "http:") {
    url.protocol = "ws:";
  }

  return url;
}

export function resolveWebSocketBase(
  apiBase: string,
  pageOrigin: string,
  configuredWebSocketBase?: string,
) {
  const url = new URL(configuredWebSocketBase || apiBase, pageOrigin);
  return toWebSocketProtocol(url).toString().replace(/\/$/, "");
}

export function buildRoomWebSocketUrl(
  apiBase: string,
  pageOrigin: string,
  roomCode: string,
  configuredWebSocketBase?: string,
) {
  const base = resolveWebSocketBase(
    apiBase,
    pageOrigin,
    configuredWebSocketBase,
  );
  const url = new URL(`${base}/ws`);
  url.searchParams.set("roomCode", roomCode);
  return url.toString();
}
