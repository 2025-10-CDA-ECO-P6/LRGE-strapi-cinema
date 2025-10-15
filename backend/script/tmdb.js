import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const strapiToken = process.env.API_TOKEN;
const tmdbApiKey = process.env.TMDB_API_KEY;
const STRAPI_API_URL = "http://localhost:1337/api/movies";

const fetchmovies =async () =>{
  try {
    console.log("TMDB Key:", tmdbApiKey); // Vérification
    console.log("Strapi Token:", strapiToken);
  const tmdbUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=fr-FR&page=1`;
 const res = await axios.get(tmdbUrl)
 const movies = res.data.results;
 console.log(movies);
 console.log(`✅ ${movies.length} films récupérés depuis TMDB`);

 for (const movie of movies) {
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
    console.log(`🎬 ${movie.title} ajouté dans Strapi`);
  } catch (err) {
    console.error(`Erreur pour ${movie.title}:`, err.response?.data || err.message);
  }
}
} catch(error) {
    console.error("pas possible de récupérer les films, erreur: ", error)
}
} 

fetchmovies()