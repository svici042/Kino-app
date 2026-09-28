import assert from "node:assert/strict";
import { test } from "node:test";
import { tmdbMiddleware } from "../server/tmdb.js";
import { securityHeaders } from "../server/security.js";
import { loadSavedMovies } from "../src/watchlist.js";
import api from "../src/assets/axios.js";

function request(
  middleware,
  path = "/movie/popular",
  ip = "127.0.0.1",
  headers = {},
) {
  const res = {
    statusCode: 200,
    headers: {},
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
  };
  return middleware(
    {
      url: `/api/tmdb${path}`,
      method: "GET",
      socket: { remoteAddress: ip },
      headers,
    },
    res,
    () => {
      res.statusCode = 404;
    },
  ).then(() => res);
}
const success = () => Response.json({ results: [] });

test("Pages origin is allowed exactly and the token stays in upstream headers", async () => {
  const allowedOrigin = "https://svici042.github.io";
  const token = "private-test-credential";
  let calls = 0;
  const middleware = tmdbMiddleware(token, {
    allowedOrigin,
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url.origin, "https://api.themoviedb.org");
      assert.ok(!url.href.includes(token));
      assert.equal(options.headers.Authorization, `Bearer ${token}`);
      assert.equal(options.redirect, "error");
      return success();
    },
  });
  for (const origin of ["https://evil.example", `${allowedOrigin}.evil.example`, "null"]) {
    const response = await request(middleware, "/movie/popular", "local", {
      origin,
      "sec-fetch-site": "cross-site",
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.headers["Access-Control-Allow-Origin"], undefined);
  }
  assert.equal(calls, 0);
  const response = await request(middleware, "/movie/popular", "local", {
    origin: allowedOrigin,
    "sec-fetch-site": "cross-site",
  });
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers["Access-Control-Allow-Origin"], allowedOrigin);
  assert.equal(response.headers.Vary, "Origin");
  assert.ok(!JSON.stringify(response).includes(token));
  assert.equal(calls, 1);
});

test("upstream errors never expose credentials to the Pages client", async () => {
  const token = "private-test-credential";
  const middleware = tmdbMiddleware(token, {
    allowedOrigin: "https://svici042.github.io",
    fetchImpl: async () => {
      throw new Error(token);
    },
  });
  const response = await request(middleware, "/movie/popular", "local", {
    origin: "https://svici042.github.io",
    "sec-fetch-site": "cross-site",
  });
  assert.equal(response.statusCode, 502);
  assert.ok(!JSON.stringify(response).includes(token));
});

test("cache reuse, expiry and IP rate limit cannot be bypassed by forwarded headers", async () => {
  let time = 0;
  let calls = 0;
  const middleware = tmdbMiddleware("test", {
    now: () => time,
    fetchImpl: async () => {
      calls++;
      return success();
    },
  });
  for (let i = 0; i < 120; i++)
    assert.equal((await request(middleware)).statusCode, 200);
  assert.equal(calls, 1);
  const blocked = await request(middleware, "/movie/popular", "127.0.0.1", {
    "x-forwarded-for": "other",
  });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers["Retry-After"], "60");
  time = 60001;
  assert.equal((await request(middleware)).statusCode, 200);
  assert.equal(calls, 2);
});

test("identical requests share work and upstream concurrency stays at eight", async () => {
  const release = [];
  const middleware = tmdbMiddleware("test", {
    fetchImpl: () =>
      new Promise((resolve) => release.push(() => resolve(success()))),
  });
  const jobs = Array.from({ length: 8 }, (_, i) =>
    request(middleware, `/movie/${i + 1}`),
  );
  const duplicate = request(middleware, "/movie/1");
  assert.equal(release.length, 8);
  assert.equal((await request(middleware, "/movie/9")).statusCode, 429);
  release.forEach((resolve) => resolve());
  assert.ok(
    (await Promise.all([...jobs, duplicate])).every(
      (res) => res.statusCode === 200,
    ),
  );
});

test("global budget blocks distributed uncached requests", async () => {
  const middleware = tmdbMiddleware("test", {
    fetchImpl: async () => success(),
  });
  for (let i = 1; i <= 300; i++) {
    assert.equal(
      (await request(middleware, `/movie/${i}`, `client-${i}`)).statusCode,
      200,
    );
  }
  assert.equal(
    (await request(middleware, "/movie/301", "new-client")).statusCode,
    429,
  );
});

test("invalid and cross-site requests do not reach TMDB; failures are not cached", async () => {
  let calls = 0;
  const middleware = tmdbMiddleware("test", {
    fetchImpl: async () => {
      calls++;
      throw new Error("secret upstream error");
    },
  });
  assert.equal(
    (
      await request(middleware, "/movie/popular", "local", {
        "sec-fetch-site": "cross-site",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (await request(middleware, "/movie/popular?language=invalid")).statusCode,
    400,
  );
  assert.equal(
    (await request(middleware, "/movie/12345678901")).statusCode,
    404,
  );
  assert.equal(calls, 0);
  for (let i = 0; i < 2; i++) {
    const response = await request(middleware);
    assert.equal(response.statusCode, 502);
    assert.ok(!response.body.includes("secret"));
  }
  assert.equal(calls, 2);
});

test("production CSP blocks inline scripts, embedding and object content", () => {
  const headers = securityHeaders();
  assert.ok(!headers["Content-Security-Policy"].includes("unsafe-inline"));
  assert.ok(
    headers["Content-Security-Policy"].includes("frame-ancestors 'none'"),
  );
  assert.ok(headers["Content-Security-Policy"].includes("object-src 'none'"));
  assert.equal(headers["X-Content-Type-Options"], "nosniff");
});

test("watchlist limits concurrency, preserves order and stops on cancellation", async () => {
  const original = api.defaults.adapter;
  let active = 0;
  let maximum = 0;
  let calls = 0;
  api.defaults.adapter = async (config) => {
    calls++;
    active++;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active--;
    return {
      data: { id: Number(config.url.split("/").pop()) },
      status: 200,
      headers: {},
      config,
    };
  };
  try {
    const movies = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    const controller = new AbortController();
    const result = await loadSavedMovies(movies, {}, controller.signal);
    assert.equal(maximum, 3);
    assert.deepEqual(result.results, movies);
    controller.abort();
    await assert.rejects(loadSavedMovies(movies, {}, controller.signal));
    assert.equal(calls, 12);
  } finally {
    api.defaults.adapter = original;
  }
});

// Corrupt stored ratings and dates previously crashed card rendering on API failure.
test("stored watchlist normalizes malformed fields and duplicate IDs", async () => {
  const { normalizeSavedMovies } = await import("../src/watchlist.js");
  const movies = normalizeSavedMovies([
    null,
    { id: -1, title: "Invalid" },
    { id: 2, title: { text: "Invalid" } },
    { id: 1, title: "Movie", vote_average: "8.5", release_date: 2026 },
    { id: 1, title: "Movie", vote_average: "8.5", release_date: 2026 },
  ]);
  assert.equal(movies.length, 1);
  assert.equal(movies[0].vote_average.toFixed(1), "0.0");
  assert.equal(movies[0].release_date.slice(0, 4), "");
  assert.deepEqual(normalizeSavedMovies({}), []);
});

test("upstream byte limit cancels oversized bodies before JSON parsing", async () => {
  const { readLimitedJson, MAX_TMDB_BYTES } =
    await import("../server/upstream.js");
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(65536));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(readLimitedJson(new Response(stream)), /too large/);
  assert.equal(cancelled, true);
  await assert.rejects(
    readLimitedJson(
      new Response("{}", {
        headers: { "content-length": String(MAX_TMDB_BYTES + 1) },
      }),
    ),
    /too large/,
  );
  assert.deepEqual(await readLimitedJson(Response.json({ ok: true })), {
    ok: true,
  });
  await assert.rejects(readLimitedJson(new Response("invalid JSON")));
});

test("trusted proxy clients have separate limits and direct spoofing is ignored", async () => {
  const middleware = tmdbMiddleware("test", {
    trustedProxyIPs: "127.0.0.1",
    fetchImpl: async () => success(),
  });
  for (let i = 0; i < 120; i++) {
    assert.equal(
      (
        await request(middleware, "/movie/popular", "127.0.0.1", {
          "x-real-ip": "192.0.2.1",
        })
      ).statusCode,
      200,
    );
  }
  assert.equal(
    (
      await request(middleware, "/movie/popular", "127.0.0.1", {
        "x-real-ip": "192.0.2.1",
      })
    ).statusCode,
    429,
  );
  assert.equal(
    (
      await request(middleware, "/movie/popular", "127.0.0.1", {
        "x-real-ip": "192.0.2.2",
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await request(middleware, "/movie/popular", "127.0.0.1", {
        "x-real-ip": "192.0.2.2, 192.0.2.3",
      })
    ).statusCode,
    400,
  );
  const { createClientAddress } = await import("../server/client-address.js");
  const address = createClientAddress("127.0.0.1");
  assert.equal(
    address({
      socket: { remoteAddress: "192.0.2.10" },
      headers: { "x-real-ip": "192.0.2.20" },
    }),
    "192.0.2.10",
  );
  assert.throws(() => createClientAddress("*"));
});
