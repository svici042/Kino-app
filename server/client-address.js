import { isIP } from "node:net";

// Normalize IPv4-mapped IPv6 peers to the equivalent IPv4 address.
const normalize = (ip) => (ip?.startsWith("::ffff:") ? ip.slice(7) : ip);

export function createClientAddress(trusted = "") {
  // Accept exact proxy IPs only, never wildcards or caller-provided lists.
  const entries = trusted
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  if (entries.some((ip) => !isIP(ip)))
    throw new Error("TRUSTED_PROXY_IPS must contain exact IP addresses");
  const proxies = new Set(entries.map(normalize));
  return (req) => {
    const peer = normalize(req.socket?.remoteAddress) || "unknown";
    if (!proxies.has(peer)) return peer;
    // The trusted proxy must overwrite this header, never append to it.
    const forwarded = req.headers["x-real-ip"];
    if (typeof forwarded !== "string" || !isIP(forwarded)) return null;
    return normalize(forwarded);
  };
}
