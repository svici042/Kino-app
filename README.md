# Kino

A movie discovery app built with React and TMDB for learning purposes.
Search movies, browse popular titles and new releases, view movie details,
and save favorites to your watchlist. Available in English, Norwegian, and Lithuanian.

## Getting started

Requires Node.js 22.12+ and npm.

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `TMDB_READ_TOKEN` to your TMDB API Read Access Token.
3. Run `npm run dev` and open the URL shown in the terminal.

Keep `.env.local` private. Restart the server after changing your token.

## Commands

- `npm run dev` — start the development server.
- `npm run build` — build the app.
- `npm start` — serve the built app over HTTPS on port 3000.
- `npm run lint` — check code quality.
- `npm test` — run tests.

## Notes

Your watchlist and language preference are saved in your browser.
Movie translations depend on availability in TMDB.

## GitHub Pages

The GitHub Actions workflow builds the frontend with Vite and publishes `dist`
to `https://svici042.github.io/API/` on pushes to `main`. In the repository's
Settings → Pages, select **GitHub Actions** as the source.

GitHub Pages hosts only the frontend. Movie lists, search, and details still
require a separately hosted Node.js API; the current `/api/tmdb` endpoint works
only when the frontend and server share an origin. Those features will not work
on Pages until an external API and its allowed origin are configured.
Never put `TMDB_READ_TOKEN` in frontend code or a `VITE_` environment variable.

## Node.js hosting

For `npm start`, set `TLS_CERT_FILE` and `TLS_KEY_FILE` in `.env.local` to the
paths of a valid certificate and its private key. Open the hostname covered by
the certificate. Keep private keys out of Git. Local development still uses
`npm run dev` without certificate setup.

## Credits

Movie data and images are provided by [TMDB](https://www.themoviedb.org/).

This product uses the TMDB API but is not endorsed or certified by TMDB.
