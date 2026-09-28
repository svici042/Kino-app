import { readLimitedJson } from "./upstream.js";
import { createClientAddress } from "./client-address.js";

// Only these named routes and numeric movie details are allowed.
const allowedPaths = new Set([
  "/movie/popular",
  "/movie/top_rated",
  "/movie/now_playing",
  "/search/movie",
]);

// Only explicitly configured proxy peers may provide client addresses.
export function tmdbMiddleware(
  token,
  { fetchImpl = fetch, now = Date.now, trustedProxyIPs = "" } = {},
) {
  const clientAddress = createClientAddress(trustedProxyIPs);
  // Per-process request budgets, cached responses, and in-flight tasks.
  const clients = new Map();
  const cache = new Map();
  const pending = new Map();
  let globalWindow = { start: now(), count: 0 };

  return async (req, res, next) => {
    const send = (status, message) => {
      res.statusCode = status;
      res.end(JSON.stringify({ message }));
    };
    let url;
    try {
      url = new URL(req.url, "http://localhost");
    } catch {
      res.statusCode = 400;
      res.end();
      return;
    }
    if (!url.pathname.startsWith("/api/tmdb/")) return next();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (req.url.length > 2048) return send(414, "Request too long");
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return send(405, "Method not allowed");
    }
    if (req.headers["sec-fetch-site"] === "cross-site") {
      return send(403, "Cross-site request denied");
    }
    const path = url.pathname.slice("/api/tmdb".length);
    if (!allowedPaths.has(path) && !/^\/movie\/[1-9]\d{0,9}$/.test(path)) {
      return send(404, "Not found");
    }
    if (!token) return send(503, "TMDB_READ_TOKEN is not configured");
    // Validate client input before spending an upstream request.
    const page = Number(url.searchParams.get("page") || 1);
    const query = (url.searchParams.get("query") || "").trim();
    const language = url.searchParams.get("language") || "lt-LT";
    if (!["lt-LT", "en-US", "nb-NO"].includes(language))
      return send(400, "Unsupported language");
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      page > 500 ||
      query.length > 150
    ) {
      return send(400, "Invalid query");
    }
    if (path === "/search/movie" && !query) return send(400, "Search is empty");

    // Bound both request frequency and rate-limiter memory consumption.
    const time = now();
    for (const [key, value] of clients) {
      if (time - value.start >= 60000) clients.delete(key);
    }
    const ip = clientAddress(req);
    if (!ip) return send(400, "Invalid proxy client address");
    let client = clients.get(ip);
    if (!client) {
      if (clients.size >= 2000) {
        res.setHeader("Retry-After", "60");
        return send(429, "Too many clients");
      }
      client = { start: time, count: 0 };
      clients.set(ip, client);
    }
    if (++client.count > 120) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((60000 - time + client.start) / 1000))),
      );
      return send(429, "Too many requests");
    }

    // The fixed origin prevents requests to arbitrary upstream servers.
    const upstream = new URL(`https://api.themoviedb.org/3${path}`);
    upstream.search = new URLSearchParams({
      language,
      include_adult: "false",
      page: String(page),
      ...(path === "/search/movie" ? { query } : {}),
    }).toString();
    const key = upstream.href;
    const cached = cache.get(key);
    if (cached && cached.expires > time) return res.end(cached.body);
    cache.delete(key);

    // Share identical in-flight requests and cap total upstream work.
    let task = pending.get(key);
    if (!task) {
      if (time - globalWindow.start >= 60000)
        globalWindow = { start: time, count: 0 };
      if (pending.size >= 8 || globalWindow.count >= 300) {
        res.setHeader("Retry-After", "60");
        return send(429, "Server request limit reached");
      }
      globalWindow.count++;
      task = (async () => {
        try {
          const response = await fetchImpl(upstream, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            redirect: "error",
            signal: AbortSignal.timeout(12000),
          });
          if (!response.ok) {
            await response.body?.cancel();
            return { status: response.status, message: "TMDB request failed" };
          }
          const body = JSON.stringify(await readLimitedJson(response));
          // Large responses are served but never retained in the cache.
          if (Buffer.byteLength(body) <= 262144) {
            if (cache.size >= 200) cache.delete(cache.keys().next().value);
            cache.set(key, { body, expires: now() + 60000 });
          }
          return { status: 200, body };
        } catch {
          return { status: 502, message: "TMDB is unavailable" };
        }
      })();
      pending.set(key, task);
      void task.finally(() => pending.delete(key));
    }
    const result = await task;
    if (res.destroyed) return;
    if (result.status !== 200) {
      if (result.status === 429) res.setHeader("Retry-After", "60");
      return send(result.status, result.message);
    }
    res.end(result.body);
  };
}
