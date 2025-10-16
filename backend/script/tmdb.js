import dotenv from "dotenv";
import axios from "axios";
import cron from "node-cron";

dotenv.config();

const strapiToken = process.env.API_TOKEN;
const tmdbApiKey = process.env.TMDB_API_KEY;
const STRAPI_API_URL = "http://localhost:1337/api/movies";

const movieExists = async (title) => {
  try {
    const res = await axios.get(
      `${STRAPI_API_URL}?filters[title][$eq]=${encodeURIComponent(title)}`,
      {
        headers: { Authorization: `Bearer ${strapiToken}` },
      }
    );
    return res.data.data.length > 0;
  } catch (err) {
    console.error(
      "Erreur check film existant:",
      err.response?.data || err.message
    );
    return false;
  }
};

const fetchMovies = async () => {
  try {
    const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=fr-FR&page=1`;
    const res = await axios.get(tmdbUrl);
    const movies = res.data.results;

    for (const movie of movies) {
      const exists = await movieExists(movie.title);
      if (exists) {
        console.log(`${movie.title} déjà présent, pas d’insertion`);
        continue;
      }
      const data = {
        data: {
          title: movie.title,
          description: movie.overview,
          release_date: movie.release_date,
          director: movie.director || "Inconnu",
        },
      };

      const headers = {
        Authorization: `Bearer ${strapiToken}`,
      };

      try {
        await axios.post(STRAPI_API_URL, data, { headers });
      } catch (err) {
        console.error(
          `Erreur pour ${movie.title}:`,
          err.response?.data || err.message
        );
      }
    }
  } catch (error) {
    console.error("pas possible de récupérer les films, erreur: ", error);
  }
};

const job = cron.schedule(
  "* * * * *",
  () => {
    console.log("⏰ Cron job lancé");
    fetchMovies();
  },
  { scheduled: false }
);

fetchMovies();
job.start();
