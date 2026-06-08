type ResolveApiBaseOptions = {
  configuredApiUrl?: string;
  baseUrl: string;
  isDev: boolean;
  pageProtocol: string;
  pageHostname: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export function resolveApiBase({
  configuredApiUrl,
  baseUrl,
  isDev,
  pageProtocol,
  pageHostname,
}: ResolveApiBaseOptions) {
  if (configuredApiUrl) {
    return trimTrailingSlash(configuredApiUrl);
  }

  if (isDev) {
    return `${pageProtocol}//${pageHostname || "localhost"}:8787`;
  }

  return baseUrl === "/" ? "" : trimTrailingSlash(baseUrl);
}

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
  return trimTrailingSlash(toWebSocketProtocol(url).toString());
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
