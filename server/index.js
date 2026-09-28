import { createServer } from "node:https";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { tmdbMiddleware } from "./tmdb.js";
import { securityHeaders } from "./security.js";
import { createStaticHandler } from "./static.js";

const token = process.env.TMDB_READ_TOKEN;
if (!token) throw new Error("TMDB_READ_TOKEN is required");
const { TLS_CERT_FILE, TLS_KEY_FILE } = process.env;
if (!TLS_CERT_FILE || !TLS_KEY_FILE) {
  throw new Error(
    "HTTPS requires TLS_CERT_FILE and TLS_KEY_FILE. Use npm run dev for local development.",
  );
}

// Missing or invalid certificates stop startup; there is no HTTP fallback.
const tls = {
  cert: await readFile(TLS_CERT_FILE),
  key: await readFile(TLS_KEY_FILE),
  minVersion: "TLSv1.2",
};
const serveStatic = await createStaticHandler(
  fileURLToPath(new URL("../dist/", import.meta.url)),
);
const api = tmdbMiddleware(token, {
  trustedProxyIPs: process.env.TRUSTED_PROXY_IPS || "",
  allowedOrigin: process.env.FRONTEND_ORIGIN || "",
});
const server = createServer(tls, async (req, res) => {
  for (const [name, value] of Object.entries(securityHeaders())) {
    res.setHeader(name, value);
  }
  res.setHeader("Strict-Transport-Security", "max-age=31536000");
  try {
    await api(req, res, () => serveStatic(req, res));
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});
// Bound slow requests and connection reuse.
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.maxRequestsPerSocket = 100;
const port = Number(process.env.PORT || 3000);
server.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`Kino HTTPS server listening on port ${port}`);
});
