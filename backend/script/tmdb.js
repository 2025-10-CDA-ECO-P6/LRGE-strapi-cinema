const dotenv = require("dotenv");
dotenv.config();
// const axios = require("axios");
const cron = require("node-cron");

const strapiToken = process.env.API_TOKEN;
const tmdbApiKey = process.env.TMDB_API_KEY;
const STRAPI_API_URL = "http://localhost:1337/api";
const MOVIES_URL = "/movies";
const ACTORS_URL = "/actors";
const MOVIE_URL = "/movie";
const ACTOR_URL = "/actor";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

const movieExists = (title) => {
  return fetch(
    
    `${STRAPI_API_URL}${MOVIES_URL}?filters[title][$eq]=${encodeURIComponent(title)}`,
    {
      headers: { Authorization: `Bearer ${strapiToken}` },
    }
  )
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => data.data.length > 0)
    .catch((err) => {
      console.error("Erreur check film existant:", err.message || err);
      return false;
    });
};

const fetchMovies = () => {
  const url = STRAPI_API_URL + MOVIES_URL;
  const tmdbUrl = `${TMDB_BASE_URL}/movie/popular?api_key=${tmdbApiKey}&language=fr-FR&page=1`;

  fetch(tmdbUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      return res.json();
    })
    .then((tmdbData) => {
      const movies = tmdbData.results;

      movies.forEach((movie) => {
        movieExists(movie.title).then((exists) => {
          if (exists) return;

          const data = {
            data: {
              tmdb_id: movie.id,
              title: movie.title,
              description: movie.overview,
              release_date: movie.release_date,
              director: movie.director || "Inconnu",
            },
          };

          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${strapiToken}`,
            },
            body: JSON.stringify(data),
          })
            .then((postRes) => {
              if (!postRes.ok) {
                return postRes
                  .json()
                  .then((errData) => {
                    throw new Error(JSON.stringify(errData));
                  })
                  .catch(() => {
                    throw new Error(`Erreur HTTP ${postRes.status}`);
                  });
              }
            })
            .catch((err) => {
              console.error(`Erreur pour ${movie.title}:`, err.message || err);
            });
        });
      });
    })
    .catch((error) => {
      console.error("pas possible de récupérer les films, erreur:", error);
    });
};


// const actorExists = async (tmdbId) => {                                                     
//     try {                                                                                   
//         const res = await axios.get(                                                        
//             `${STRAPI_API_URL}${STRAPI_ACTORS}?filters[tmdb_id][$eq]=${encodeURIComponent(tmdbId)}`,        
//             {   
//                 headers: { Authorization: `Bearer ${strapiToken}` },                          
//             }
//         );
//         return res.data.data.length > 0;                                                                                    
//     } catch (err) {                                                                                            
//         console.error(
//             'Erreur check acteur existant:',                                                 
//             err.response?.data || err.message                                               
//         );
//         return false;
//     }  
// };

// const fetchActorDetails = async (actorId) => {                                                                          
//     try {
//         const tmdbUrl = `https://api.themoviedb.org/3/person/${actorId}?api_key=${tmdbApiKey}&language=fr-FR`;          
//         const res = await axios.get(tmdbUrl);                                                                                                                   

//         return {
//             tmdb_id: res.data.id,                             
//             name: res.data.name,
//             biography: res.data.biography || "Aucune biographie disponible.",
//             birth_date: res.data.birthday || null,  //check si la le nom de la variable sur Strapi
//             place_of_birth: res.data.place_of_birth || "Inconnu",
//         }
//     } catch (err) {                                                                                         
//         console.error(
//             `Erreur récupération détails acteur ID ${actorId}:`,                              
//             err.response?.data || err.message
//         );
//         return null;                                                                        
//     }
// };

// const fetchActors = async () => {    
//   const url = STRAPI_API_URL + STRAPI_ACTORS;
  
//     try {
//         console.log("Récupération des acteurs depuis TMDB");                                                

//         const res = await axios.get(                                                                                                                   
//             `https://api.themoviedb.org/3/person/popular?api_key=${tmdbApiKey}&language=fr-FR&page=1`
//         );

//         const actors = res.data.results;                                                                                             
        
//         for (const actor of actors) {                                                                       
//             const exists = await actorExists(actor.id);                                                     
//             if (exists) {
//                 console.log(`${actor.name} déjà présent, pas d’insertion`); 
//                 continue;
//             }
//             const actorDetails = await fetchActorDetails(actor.id);                                         
//             if (!actorDetails) continue;
            
//             const data = { 
//                 data: actorDetails                                                                          
//             };
//             const headers = {
//                 Authorization: `Bearer ${strapiToken}`,                                                     
//             };

//             try {                                                                                                                      
//                 await axios.post(url, data, { headers });                                        
//                 console.log(`Acteur ${actor.name} inséré avec succès`);                                    
//             } catch (err) {                                                                                                                               
//                 console.error(
//                     `Erreur pour ${actor.name}:`,
//                     err.response?.data || err.message
//                 );
//             }
//         }
//     } catch (error) {                                                                                       
//     }
// };


/// stocker les id des films dans une liste

function getAllMoviesIdFromStrapi() {

  const url = new URL(STRAPI_API_URL + MOVIES_URL);

  return fetch(url, {
    headers: {
      Authorization: `Bearer ${strapiToken}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)

      return res.json();
    })
    .then(data => {

      const moviesIdList = []
      
      data.data.forEach((movie) => {
        moviesIdList.push(movie.tmdb_id)
      });      

      return moviesIdList;
    })
    .catch(err => {
      console.error("Erreur lors de la récupération des films", err);
    })
}

const moviesIdList = getAllMoviesIdFromStrapi();

/// fetch les acteurs par rapport à tous les id des films

function getActorsFromMovieId(movieId) {

  const url = new URL(`${TMDB_BASE_URL}${MOVIE_URL}/${movieId}/credits`)
  url.searchParams.append("api_key", tmdbApiKey);
  url.searchParams.append("language", "fr-FR");
  
  return fetch(url)
    .then(res => {
      if(!res.ok) throw new Error(`${res.status}: ${res.statusText}`)

      return res.json();
    })
    .then(data => {
      cast = data.cast.slice(0, 9);

      return cast
    })
    .catch(err => {
      throw new Error(`Erreur de la récupération des acteur du film ayant l'id "${movieId}", ${err}`)
    })
}

  // fetch tmdb pour avoir les acteurs de chaque film présents dans Strapi 

function getAllActors(movies) {
  const actorsFromTmdb = [];

  for(let i=0; i < movies.length; i++) {
    actorsFromTmdb.push(getActorsFromMovieId(i));
  }
}

console.log(getAllActors(["1156594"]));
  // à partir de strapi/movies/id => tmdb {actors} => post les acteurs vers strapi/actors => relation entre films et acteurs







const job = cron.schedule(
  "*0 0 */1 * *",
  () => {
    console.log("⏰ Cron job lancé");
    fetchMovies();
  },
  { scheduled: false }
);

fetchMovies();
// fetchActors();
job.start();
