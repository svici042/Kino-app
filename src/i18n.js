// UI language keys map to the locale codes accepted by the API.
export const languages = {
  lt: {
    label: "Lietuvių",
    locale: "lt-LT",
  },
  en: {
    label: "English",
    locale: "en-US",
  },
  nb: {
    label: "Norsk",
    locale: "nb-NO",
  },
};

// Fall back to Lithuanian when storage is unavailable or contains an unknown key.
export function readLanguage() {
  try {
    const saved = localStorage.getItem("kino-language");
    return Object.hasOwn(languages, saved) ? saved : "lt";
  } catch {
    return "lt";
  }
}

// Keep the same keys in each language so components share one text lookup.
export const translations = {
  // Lithuanian interface copy.
  lt: {
    savedLimit:
      "Sąraše gali būti iki 100 filmų. Pašalink filmą prieš pridėdamas naują.",
    // Navigation categories share the API category keys.
    categories: {
      popular: "Populiarūs",
      top_rated: "Geriausiai įvertinti",
      now_playing: "Dabar kinuose",
      saved: "Mano sąrašas",
    },
    // Navigation and language selector.
    language: "Kalba",
    home: "Kino pradžia",
    navigation: "Pagrindinis meniu",
    discover: "Atrask filmus",
    // Hero introduction and search controls.
    tagline: "Tavo kitas geras filmas.",
    eyebrow: "MAŽIAU IEŠKOJIMO. DAUGIAU KINO.",
    heading: "Geros istorijos.",
    headingAccent: "Vienoje vietoje.",
    intro: "Atrask filmą šiam vakarui. Nuo naujausių premjerų",
    introEnd: "iki istorijų, prie kurių norisi sugrįžti.",
    movieTitle: "Filmo pavadinimas",
    placeholder: "Kokio filmo ieškai?",
    search: "Ieškoti",
    caption: "Tūkstančiai filmų. Vienas tavo vakaras.",
    featured: "ŠIANDIEN DĖMESIO CENTRE",
    // Catalog headings and request feedback.
    catalog: "Filmų katalogas",
    favorite: "ATRASK SAVO FAVORITĄ",
    results: "Rezultatai",
    mood: "Kiekvienai nuotaikai – sava istorija.",
    loading: "Kraunami filmai",
    connection: "Nepavyko prisijungti",
    retry: "Bandyti dar kartą",
    invalidToken: "API prieigos raktas negalioja.",
    requestError: "Nepavyko gauti filmų. Bandykite dar kartą.",
    storageError:
      "Naršyklė neleidžia išsaugoti sąrašo. Jis galios iki puslapio uždarymo.",
    // Empty states and hints for the next action.
    emptySaved: "Tavo kino vakarai prasideda čia.",
    emptySearch: "Filmų neradome.",
    saveHint:
      "Paspausk + prie patikusio filmo ir išsaugok jį vėlesniam laikui.",
    searchHint: "Pabandyk kitą pavadinimą.",
    // Movie cards, pagination, and detail dialog.
    about: "Apie filmą",
    noPoster: "Plakato nėra",
    more: "Daugiau apie filmą",
    remove: "Pašalinti iš sąrašo",
    save: "Išsaugoti",
    unknownDate: "Data nežinoma",
    film: "FILMAS",
    previous: "Ankstesnis",
    next: "Kitas",
    source: "Duomenys",
    close: "Uždaryti",
    noOverview: "Šio filmo aprašymo šiuo metu nėra.",
    removeSaved: "Pašalinti iš mano sąrašo",
    addSaved: "Į mano sąrašą",
    attribution:
      "Šis produktas naudoja TMDB API, tačiau TMDB jo nepatvirtino ir nesertifikavo.",
  },
  // English interface copy.
  en: {
    savedLimit:
      "Your watchlist can hold up to 100 movies. Remove a movie before adding another.",
    // Navigation categories share the API category keys.
    categories: {
      popular: "Popular",
      top_rated: "Top rated",
      now_playing: "Now playing",
      saved: "My watchlist",
    },
    // Navigation and language selector.
    language: "Language",
    home: "Kino home",
    navigation: "Main navigation",
    discover: "Discover movies",
    // Hero introduction and search controls.
    tagline: "Your next great movie.",
    eyebrow: "LESS SEARCHING. MORE CINEMA.",
    heading: "Great stories.",
    headingAccent: "All in one place.",
    intro: "Find a movie for tonight. From the latest releases",
    introEnd: "to stories you want to revisit.",
    movieTitle: "Movie title",
    placeholder: "What movie are you looking for?",
    search: "Search",
    caption: "Thousands of movies. Your evening.",
    featured: "IN THE SPOTLIGHT TODAY",
    // Catalog headings and request feedback.
    catalog: "Movie catalog",
    favorite: "FIND YOUR FAVORITE",
    results: "Results",
    mood: "A story for every mood.",
    loading: "Loading movies",
    connection: "Unable to connect",
    retry: "Try again",
    invalidToken: "The API access token is invalid.",
    requestError: "Unable to load movies. Please try again.",
    storageError:
      "Your browser cannot save the watchlist. It will last until you close this page.",
    // Empty states and hints for the next action.
    emptySaved: "Your movie nights start here.",
    emptySearch: "No movies found.",
    saveHint: "Press + on a movie you like to save it for later.",
    searchHint: "Try another title.",
    // Movie cards, pagination, and detail dialog.
    about: "About",
    noPoster: "No poster",
    more: "More about this movie",
    remove: "Remove from watchlist",
    save: "Save",
    unknownDate: "Unknown date",
    film: "MOVIE",
    previous: "Previous",
    next: "Next",
    source: "Data",
    close: "Close",
    noOverview: "There is no overview available for this movie yet.",
    removeSaved: "Remove from my watchlist",
    addSaved: "Add to my watchlist",
    attribution:
      "This product uses the TMDB API but is not endorsed or certified by TMDB.",
  },
  // Norwegian Bokmål interface copy.
  nb: {
    savedLimit:
      "Listen kan inneholde opptil 100 filmer. Fjern en film før du legger til en ny.",
    // Navigation categories share the API category keys.
    categories: {
      popular: "Populære",
      top_rated: "Best vurdert",
      now_playing: "På kino nå",
      saved: "Min liste",
    },
    // Navigation and language selector.
    language: "Språk",
    home: "Kino-forsiden",
    navigation: "Hovedmeny",
    discover: "Oppdag filmer",
    // Hero introduction and search controls.
    tagline: "Din neste gode film.",
    eyebrow: "MINDRE LETING. MER FILM.",
    heading: "Gode historier.",
    headingAccent: "Samlet på ett sted.",
    intro: "Finn en film for kvelden. Fra de nyeste premierene",
    introEnd: "til historier du vil oppleve igjen.",
    movieTitle: "Filmtittel",
    placeholder: "Hvilken film leter du etter?",
    search: "Søk",
    caption: "Tusenvis av filmer. Din kveld.",
    featured: "I SØKELYSET I DAG",
    // Catalog headings and request feedback.
    catalog: "Filmkatalog",
    favorite: "FINN DIN FAVORITT",
    results: "Resultater",
    mood: "En historie for enhver stemning.",
    loading: "Laster filmer",
    connection: "Kunne ikke koble til",
    retry: "Prøv igjen",
    invalidToken: "API-tilgangstokenet er ugyldig.",
    requestError: "Kunne ikke laste filmer. Prøv igjen.",
    storageError:
      "Nettleseren kan ikke lagre listen. Den beholdes til du lukker siden.",
    // Empty states and hints for the next action.
    emptySaved: "Filmkveldene dine starter her.",
    emptySearch: "Ingen filmer funnet.",
    saveHint: "Trykk på + ved en film du liker for å lagre den til senere.",
    searchHint: "Prøv en annen tittel.",
    // Movie cards, pagination, and detail dialog.
    about: "Om filmen",
    noPoster: "Ingen plakat",
    more: "Mer om filmen",
    remove: "Fjern fra listen",
    save: "Lagre",
    unknownDate: "Ukjent dato",
    film: "FILM",
    previous: "Forrige",
    next: "Neste",
    source: "Data",
    close: "Lukk",
    noOverview: "Denne filmen har ingen beskrivelse ennå.",
    removeSaved: "Fjern fra min liste",
    addSaved: "Legg til i min liste",
    attribution:
      "Dette produktet bruker TMDBs API, men er ikke godkjent eller sertifisert av TMDB.",
  },
};
