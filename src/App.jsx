import { useEffect, useRef, useState } from "react";
import "./App.css";
import api from "./assets/axios.js";
import {
  loadSavedMovies,
  MAX_SAVED_MOVIES,
  normalizeSavedMovies,
} from "./watchlist.js";
import { languages, readLanguage, translations } from "./i18n.js";

// Shared display helpers and persisted watchlist initialization.
const image = (path, size = "w500") =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : undefined;

// Invalid JSON or blocked storage should not prevent the app from opening.
function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem("kino-saved") || "[]");
    return normalizeSavedMovies(value);
  } catch {
    return [];
  }
}

function App() {
  // Language and catalog filters determine the next API request.
  const [language, setLanguage] = useState(readLanguage);
  const t = translations[language];
  const categories = t.categories;
  const [category, setCategory] = useState("popular");
  // Keep the typed query separate from the last submitted search.
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  // Request results, feedback, and retry state.
  const [data, setData] = useState({ results: [], total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  // Personal watchlist and the currently open movie dialog.
  const [saved, setSaved] = useState(readSaved);
  const [selected, setSelected] = useState(null);
  const [storageError, setStorageError] = useState("");
  const dialog = useRef(null);
  // Saving a film must not refetch the unrelated catalog or search results.
  const requestedSaved = category === "saved" ? saved : null;

  // Refresh translated movie data and cancel stale requests on navigation.
  useEffect(() => {
    const controller = new AbortController();
    // The server accepts only these pagination, search, and locale values.
    const params = {
      page,
      query: search,
      language: languages[language].locale,
    };
    const request =
      category === "saved"
        ? loadSavedMovies(requestedSaved, params, controller.signal)
        : api
            .get(search ? "/search/movie" : `/movie/${category}`, {
              params,
              signal: controller.signal,
            })
            .then((response) => response.data);
    request
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setError(
            reason.response?.status === 401 ? "invalidToken" : "requestError",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, search, page, retry, language, requestedSaved]);

  // Let the native dialog handle focus trapping and Escape.
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);

  // Keep browser metadata and the stored preference aligned with the UI.
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `Kino — ${translations[language].tagline}`;
    try {
      localStorage.setItem("kino-language", language);
    } catch {
      // Language switching still works when browser storage is unavailable.
    }
  }, [language]);

  // User actions update state; the request effect loads the corresponding data.
  function changeLanguage(value) {
    if (value === language) return;
    prepareRequest();
    setSelected(null);
    setLanguage(value);
  }

  function toggleSaved(movie) {
    if (
      !saved.some((item) => item.id === movie.id) &&
      saved.length >= MAX_SAVED_MOVIES
    ) {
      setStorageError("savedLimit");
      return;
    }
    // Remove an existing entry or append the movie without changing other entries.
    const next = saved.some((item) => item.id === movie.id)
      ? saved.filter((item) => item.id !== movie.id)
      : [...saved, movie];
    setSaved(next);
    try {
      localStorage.setItem("kino-saved", JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError("storageError");
    }
  }

  function changeCategory(value) {
    if (category !== value || search || page !== 1) prepareRequest();
    setCategory(value);
    setSearch("");
    setQuery("");
    setPage(1);
  }

  function prepareRequest() {
    setLoading(true);
    setError("");
  }

  function changePage(value) {
    prepareRequest();
    setPage(value);
  }

  // Derived display state keeps rendering independent of event handlers.
  const movies = data.results;
  const busy = loading;
  const failed = error;
  const hero =
    !busy && !failed && category === "popular" && !search ? movies[0] : null;

  return (
    <div className="app-shell">
      {/* Main navigation and persistent language preference. */}
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={() => changeCategory("popular")}
          aria-label={t.home}
        >
          <span className="brand-icon">k</span>kino
          <span className="brand-dot">.</span>
        </a>
        <nav aria-label={t.navigation}>
          <button
            className={category !== "saved" ? "nav-active" : ""}
            onClick={() => changeCategory("popular")}
          >
            {t.discover}
          </button>
          <button
            className={category === "saved" ? "nav-active" : ""}
            onClick={() => changeCategory("saved")}
          >
            {categories.saved} <span className="count">{saved.length}</span>
          </button>
        </nav>
        <span className="header-note">{t.tagline}</span>
        <label className="language-switcher">
          <span>{t.language}</span>
          <select
            value={language}
            onChange={(event) => changeLanguage(event.target.value)}
          >
            {Object.entries(languages).map(([code, option]) => (
              <option key={code} value={code}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <main>
        {/* Featured artwork and the submitted movie search. */}
        <section className="hero">
          {hero?.backdrop_path && (
            <img
              className="hero-image"
              src={image(hero.backdrop_path, "original")}
              alt=""
            />
          )}
          <div className="hero-shade" />
          <div className="hero-content">
            <span className="eyebrow">
              <span /> {t.eyebrow}
            </span>
            <h1>
              {t.heading}
              <br />
              <span>{t.headingAccent}</span>
            </h1>
            <p>
              {t.intro}
              <br /> {t.introEnd}
            </p>
            <form
              className="search"
              onSubmit={(event) => {
                event.preventDefault();
                if (
                  search !== query.trim() ||
                  category !== "popular" ||
                  page !== 1
                )
                  prepareRequest();
                setSearch(query.trim());
                setCategory("popular");
                setPage(1);
              }}
            >
              <span aria-hidden="true">⌕</span>
              <input
                aria-label={t.movieTitle}
                placeholder={t.placeholder}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                maxLength={150}
              />
              <button type="submit">
                {t.search} <span aria-hidden="true">↗</span>
              </button>
            </form>
            <div className="hero-caption">{t.caption}</div>
          </div>
          {hero && (
            <button className="featured" onClick={() => setSelected(hero)}>
              <span>{t.featured}</span>
              <strong>{hero.title} ↗</strong>
              <small>
                ★ {hero.vote_average?.toFixed(1)} <span> / 10</span>
              </small>
            </button>
          )}
        </section>
        {/* Category controls and mutually exclusive request states. */}
        <section className="catalog" aria-label={t.catalog}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">{t.favorite}</span>
              <h2>
                {search ? `${t.results}: „${search}“` : categories[category]}
              </h2>
            </div>
            <span className="section-note">{t.mood}</span>
          </div>
          <div className="filters">
            {Object.entries(categories).map(([key, label]) => (
              <button
                key={key}
                className={category === key && !search ? "active" : ""}
                onClick={() => changeCategory(key)}
              >
                {label}
                {key === "saved" && ` (${saved.length})`}
              </button>
            ))}
          </div>
          {storageError && (
            <p role="status" className="notice">
              {t[storageError]}
            </p>
          )}
          {/* Placeholder cards reserve the grid while a request is pending. */}
          {busy ? (
            <div className="movie-grid" aria-label={t.loading} aria-busy="true">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="skeleton" />
              ))}
            </div>
          ) : failed ? (
            <div className="empty" role="alert">
              <h3>{t.connection}</h3>
              <p>{t[error]}</p>
              <button
                onClick={() => {
                  prepareRequest();
                  setRetry(retry + 1);
                }}
              >
                {t.retry}
              </button>
            </div>
          ) : movies.length === 0 ? (
            <div className="empty">
              <h3>{category === "saved" ? t.emptySaved : t.emptySearch}</h3>
              <p>{category === "saved" ? t.saveHint : t.searchHint}</p>
            </div>
          ) : (
            <div className="movie-grid">
              {movies.map((movie) => {
                const isSaved = saved.some((item) => item.id === movie.id);
                return (
                  <article className="movie-card" key={movie.id}>
                    <div className="poster-wrap">
                      <button
                        className="poster-button"
                        onClick={() => setSelected(movie)}
                        aria-label={`${t.about} ${movie.title}`}
                      >
                        {movie.poster_path ? (
                          <img
                            src={image(movie.poster_path)}
                            alt={movie.title}
                            loading="lazy"
                          />
                        ) : (
                          <span className="no-poster">
                            KINO
                            <br />
                            <small>{t.noPoster}</small>
                          </span>
                        )}
                        <span className="poster-overlay">{t.more} ↗</span>
                      </button>
                      <span className="rating">
                        ★{" "}
                        <b>
                          {movie.vote_average
                            ? movie.vote_average.toFixed(1)
                            : "—"}
                        </b>
                      </span>
                      <button
                        className={`save-button ${isSaved ? "is-saved" : ""}`}
                        aria-label={`${isSaved ? t.remove : t.save}: ${movie.title}`}
                        aria-pressed={isSaved}
                        onClick={() => toggleSaved(movie)}
                      >
                        {isSaved ? "✓" : "+"}
                      </button>
                    </div>
                    <button
                      className="movie-title"
                      onClick={() => setSelected(movie)}
                    >
                      {movie.title}
                    </button>
                    <div className="movie-meta">
                      <span>
                        {movie.release_date?.slice(0, 4) || t.unknownDate}
                      </span>
                      <span>{t.film}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          {/* TMDB exposes at most 500 pages for these endpoints. */}
          {category !== "saved" && !busy && !failed && data.total_pages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => changePage(page - 1)}
              >
                ← {t.previous}
              </button>
              <span>
                {page} / {Math.min(data.total_pages, 500)}
              </span>
              <button
                disabled={page >= Math.min(data.total_pages, 500)}
                onClick={() => changePage(page + 1)}
              >
                {t.next} →
              </button>
            </div>
          )}
        </section>
      </main>
      <footer>
        <a className="brand" href="#">
          kino<span className="brand-dot">.</span>
        </a>
        <p>{t.attribution}</p>
        <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">
          {t.source}: TMDB ↗
        </a>
      </footer>
      {/* Movie details reuse the same watchlist actions as catalog cards. */}
      <dialog
        aria-label={selected?.title}
        ref={dialog}
        onCancel={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === dialog.current) setSelected(null);
        }}
      >
        {selected && (
          <div className="movie-detail">
            <button
              className="close-button"
              aria-label={t.close}
              onClick={() => setSelected(null)}
            >
              ×
            </button>
            {selected.backdrop_path && (
              <img
                className="detail-image"
                src={image(selected.backdrop_path, "w780")}
                alt=""
              />
            )}
            <div className="detail-content">
              <span className="eyebrow">
                {selected.release_date?.slice(0, 4)} · ★{" "}
                {selected.vote_average?.toFixed(1)}
              </span>
              <h2>{selected.title}</h2>
              <p>{selected.overview || t.noOverview}</p>
              <button
                className="primary-button"
                onClick={() => toggleSaved(selected)}
              >
                {saved.some((item) => item.id === selected.id)
                  ? `✓ ${t.removeSaved}`
                  : `+ ${t.addSaved}`}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

export default App;
