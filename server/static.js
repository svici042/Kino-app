import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

// Build an immutable snapshot of public assets before accepting requests.
const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
]);

export async function createStaticHandler(root) {
  const assets = new Map();
  async function collect(directory, prefix = "") {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      // Never publish hidden files, symbolic links, or unrecognized formats.
      if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
      const file = join(directory, entry.name);
      const url = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await collect(file, url);
      else if (entry.isFile() && types.has(extname(entry.name))) {
        assets.set(url, {
          body: await readFile(file),
          type: types.get(extname(entry.name)),
        });
      }
    }
  }
  await collect(root);
  if (!assets.has("/index.html"))
    throw new Error("Build missing: run npm run build first");
  assets.set("/", assets.get("/index.html"));

  return (req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, "https://localhost").pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    // Request input selects a preloaded entry; it never constructs a filesystem path.
    const asset = assets.get(path);
    if (!asset) {
      res.writeHead(404);
      res.end();
      return;
    }
    res.setHeader("Content-Type", asset.type);
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Content-Length", asset.body.length);
    res.end(req.method === "HEAD" ? undefined : asset.body);
  };
}
