import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { tmdbMiddleware } from "./server/tmdb.js";
import { securityHeaders } from "./server/security.js";

// Use the same server-side API proxy during development and local previews.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "TMDB_");
  const middleware = tmdbMiddleware(env.TMDB_READ_TOKEN);

  return {
    // Use the site's configured path, including repository renames or custom domains.
    base: process.env.PAGES_BASE_PATH || "/",
    server: { headers: securityHeaders({ development: true }) },
    preview: { headers: securityHeaders() },
    // JSX support followed by the credential-protecting API middleware.
    plugins: [
      react(),
      {
        name: "tmdb-api",
        configureServer(server) {
          server.middlewares.use(middleware);
        },
        configurePreviewServer(server) {
          server.middlewares.use(middleware);
        },
      },
    ],
  };
});
