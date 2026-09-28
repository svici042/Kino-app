// Limit decompressed bytes, including chunked responses with no Content-Length.
export const MAX_TMDB_BYTES = 1024 * 1024;

export async function readLimitedJson(response) {
  if (!response.body) throw new Error("Empty upstream response");
  if (Number(response.headers.get("content-length")) > MAX_TMDB_BYTES) {
    await response.body.cancel();
    throw new Error("Upstream response too large");
  }
  const reader = response.body.getReader();
  // Retain validated chunks and count bytes even without Content-Length.
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_TMDB_BYTES) {
        await reader.cancel();
        throw new Error("Upstream response too large");
      }
      chunks.push(value);
    }
    // Parse only after the entire body has passed the byte limit.
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8"));
  } finally {
    reader.releaseLock();
  }
}
