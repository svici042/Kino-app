// Public configuration only. The TMDB credential is loaded by the server.
export const tmdbENV = {
  apiBase: import.meta.env?.VITE_API_BASE_URL || "/api/tmdb",
};
