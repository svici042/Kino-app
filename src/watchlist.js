import api from "./assets/axios.js";

export const MAX_SAVED_MOVIES = 100;

// Stored data may come from older versions or be malformed.
export function normalizeSavedMovies(value) {
  if (!Array.isArray(value)) return [];
  // Deduplicate IDs and normalize fields for safe offline rendering.
  const unique = new Map();
  for (const movie of value) {
    if (!movie || !Number.isSafeInteger(movie.id) || movie.id <= 0) continue;
    if (typeof movie.title !== "string" || !movie.title.trim()) continue;
    unique.set(movie.id, {
      id: movie.id,
      title: movie.title,
      overview: typeof movie.overview === "string" ? movie.overview : "",
      release_date:
        typeof movie.release_date === "string" ? movie.release_date : "",
      poster_path:
        typeof movie.poster_path === "string" ? movie.poster_path : null,
      backdrop_path:
        typeof movie.backdrop_path === "string" ? movie.backdrop_path : null,
      vote_average: Number.isFinite(movie.vote_average)
        ? movie.vote_average
        : 0,
    });
  }
  return [...unique.values()];
}

// A small worker pool avoids sending the entire watchlist at once.
export async function loadSavedMovies(movies, params, signal) {
  // Preserve input order even when workers finish in a different order.
  const results = new Array(movies.length);
  // Workers claim an index before awaiting the network.
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, movies.length) }, async () => {
      while (cursor < movies.length) {
        signal.throwIfAborted();
        const index = cursor++;
        const movie = movies[index];
        try {
          const response = await api.get(`/movie/${movie.id}`, {
            params,
            signal,
          });
          results[index] = response.data;
        } catch (error) {
          signal.throwIfAborted();
          results[index] = movie;
          if (error.response?.status === 429) {
            // Keep cached titles instead of hammering a rate-limited server.
            while (cursor < movies.length) {
              const remaining = cursor++;
              results[remaining] = movies[remaining];
            }
          }
        }
      }
    }),
  );
  return { results, total_pages: 1 };
}
