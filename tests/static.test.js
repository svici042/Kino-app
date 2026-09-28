import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStaticHandler } from "../server/static.js";

test("static snapshot serves only known assets without reflecting request input", async () => {
  const root = await mkdtemp(join(tmpdir(), "kino-static-"));
  const files = ["index.html", ".env.local", "secret.txt"];
  try {
    await writeFile(join(root, "index.html"), "<h1>Kino</h1>");
    await writeFile(join(root, ".env.local"), "private");
    await writeFile(join(root, "secret.txt"), "private");
    const serve = await createStaticHandler(root);
    function request(url, method = "GET") {
      const res = {
        statusCode: 200,
        headers: {},
        writeHead(code) {
          this.statusCode = code;
        },
        setHeader(key, value) {
          this.headers[key] = value;
        },
        end(body) {
          this.body = body;
        },
      };
      serve({ url, method }, res);
      return res;
    }
    assert.equal(request("/").body.toString(), "<h1>Kino</h1>");
    assert.equal(
      request("/index.html?x=<script>alert(1)</script>").body.toString(),
      "<h1>Kino</h1>",
    );
    assert.equal(
      request("/").headers["Content-Type"],
      "text/html; charset=utf-8",
    );
    assert.equal(request("/", "HEAD").body, undefined);
    for (const path of [
      "/.env.local",
      "/secret.txt",
      "/..%5c.env.local",
      "/%3Cscript%3E",
      "/unknown.html",
    ]) {
      assert.equal(request(path).statusCode, 404);
    }
    assert.equal(request("/%zz").statusCode, 400);
    assert.equal(request("/", "POST").statusCode, 405);
    await writeFile(join(root, "index.html"), "changed after startup");
    assert.equal(request("/").body.toString(), "<h1>Kino</h1>");
  } finally {
    for (const file of files) await unlink(join(root, file));
    await rmdir(root);
  }
});
