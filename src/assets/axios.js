import axios from "axios";
import { tmdbENV } from "../env.js";

// Use the local API proxy so the TMDB credential stays on the server.
const api = axios.create({
  baseURL: tmdbENV.apiBase,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

export default api;

// Preserve the full Axios response for callers needing status and data.
export const fetchPopular = async (type = "movie") => {
  const res = await api(`${type}/popular`);
  return res;
};
