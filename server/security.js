export function securityHeaders({ development = false } = {}) {
  return {
    // Allowed resource origins; Vite needs inline injection only in development.
    "Content-Security-Policy": [
      "default-src 'self'",
      `script-src 'self'${development ? " 'unsafe-inline'" : ""}`,
      `style-src 'self' https://fonts.googleapis.com${development ? " 'unsafe-inline'" : ""}`,
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' https://image.tmdb.org data:",
      `connect-src 'self'${development ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
    // Block MIME guessing, framing, referrer disclosure, and unused device access.
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  };
}
