'use strict';

// Libraries and Dependencies
const express = require('express');
const pg = require('pg');
const superagent = require('superagent');
require('ejs');
require('dotenv').config();
const app = express();
const cors = require('cors');
const methodOverride = require('method-override');
const unirest = require('unirest');

// Trakt Set Up
const Trakt = require('trakt.tv');
const { response } = require('express');
let options = {
  client_id: process.env.TRAKT_ID,
  client_secret: process.env.TRAKT_SECRET,
  redirect_uri: null,
  api_url: null,
  useragent: null,
  pagination: true,
  debug: true,
  limit: 15
};

const trakt = new Trakt(options);

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(methodOverride('_method'));

// Turn on/establish client
const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.log(err));

// Initialize port
const PORT = process.env.PORT || 3001;

// Routes
// Home route
app.get('/', goHome);

// Search results route
app.get('/search', renderSearchPage);

// New search route
app.get('/search/new', searchShows);

// Show details route
app.get('/details', showDetails);

// aboutUs route
app.get('/aboutUs', aboutUs);

// Add show to collection route
app.post('/collection', addShowToCollection);

// collection page route
app.get('/collection', collectionPage);

// Delete show from collection route

// app.delete('');

// 404 error route
app.use('*', notFound);

// Home route handler
function goHome(req, res) {
  res.status(200).render('pages/index.ejs');
}

// Search page handler
function renderSearchPage(req, res) {
  res.status(200).render('pages/search.ejs');
}

// About Us page handler
function aboutUs(req, res){
  res.status(200).render('pages/aboutUs.ejs');
}

// Get search results handler
function searchShows(req, res) {
  let query = req.query.search;
  const url = 'https://api.themoviedb.org/3/search/tv';
  const queryParams = {
    api_key: process.env.TMDB_URL,
    query: query
  }
  superagent.get(url, queryParams)
    .then(results => {
      // console.log('THIS IS OUR TMDB: ', results.body);
      let responseArray = results.body.results;
      res.status(200).render('pages/results.ejs', { shows: responseArray });
    }).catch(err => console.log(err));
  // trakt.search.text({
  //   query: query,
  //   type: 'show,person',
  //   extended: true
  // }).then(response => {
  // use this to get the id, not great at searching for actors
  // console.log(response.data);
  // console.log('trakt imdb', response.data[0].show.ids.imdb);
  // use this to get tv show length
  // let responseArray = response.data;
  // console.log(responseArray[0].show.ids)
  // })
}

// Show details handler
function showDetails(req, res) {
  const tmdbId = req.query.id;
  const image_url = req.query.image_url;
  // console.log(req.query);
  trakt.search.id({
    id: tmdbId,
    id_type: 'tmdb',
    extended: 'full',
    type: 'show'
  }).then(response => {
    console.log('THIS IS OUR RESPONSE DATA: ', (response.data[0].show));
    let showData = new Show(response.data[0].show, image_url, tmdbId);
    console.log('constructed show', showData);
    res.status(200).render('pages/detail.ejs', { show: showData })
  }).catch((err) => {
    console.log(err);
    res.status(200).render('pages/error.ejs')
  });
}


// this.title = obj.title ? obj.title : 'No title available.';
//   this.overview = obj.overview ? obj.overview : 'No overview available.';
//   this.image_url = img ? img : 'Image not available.';
//   this.genres = obj.genres.join(', ') ? obj.genres.join(', ') : 'Genres not available';
//   this.rating = obj.rating ? obj.rating : 'Rating not available';
//   this.available_translations = obj.available_translations.join(', ') ? obj.available_translations.join(', ') : 'Genres not available';
//   this.year = obj.year ? obj.year : 'Year not available';
// this.id = id;

// Add show to collection handler
function addShowToCollection(req, res){
  let idCheck = 'SELECT * FROM series WHERE tmdbId=$1;';
  let idSafeValue = [req.body.tmdbId];
  console.log('We are in the addShowFunction');
  client.query(idCheck, idSafeValue)
    .then(idResults =>{
      if (!idResults.rowCount){
        console.log( 'this is my id Results', idResults.rowCount)
        let {title, overview, image_url, genres, rating, available_translations, year, tmdbId} = req.body;
        let sql = 'INSERT INTO series (title, overview, image_url, genres, rating, available_translations, year, tmdbId) VALUES ($1, $2, $3, $4, $5, $6, $7, $8);';
        let safeValues = [title, overview, image_url, genres, rating, available_translations, year, tmdbId];

        client.query(sql, safeValues)
          // .then(sqlResults => {
            // let id = sqlResults.rows[0].id;
            // res.status(200).redirect('');
            // res.status(200).redirect(`/collection/${id}`);
          // }).catch(error => console.log(error))
      }
    }).catch(error => console.log(error))
}

// collection Page
function collectionPage(req, res){
  let sql = 'SELECT * FROM series;';
  client.query(sql)
    .then(sqlResults =>{
      console.log(' this is my sqlResults', sqlResults.rows);
      response.status(200).render('pages/collection.ejs', {favoritesArray: sqlResults.rows });
    }).catch(error => console.log(error))
}

// Delete show from collection handler
function deleteShowFromCollection(req, res){
  let showId = request.params.id;

  let sql = 'DELETE FROM series WHERE id=$1;';
  let safeVales = [bookId];

  client.query(sql, safeVales)
    .then(() => {
      res.redirect('/');
    });
}

//   trakt.episodes.summary({
//     // loop through all episodes
//     id: id,
//     id_type: 'imdb',
//     season: 1,
//     episode: 5,
//     extended: 'full'
//   }).then(response => {
//     // console.log(response.data);
//   })
// }).catch(err => console.log(err))

// uTelly API call
function uTellyCall(query) {
  let req = unirest('GET', 'https://utelly-tv-shows-and-movies-availability-v1.p.rapidapi.com/lookup');
  req.query({
    'country': 'US',
    'source_id': query,
    'source': 'imdb'
  });
  req.headers({
    'x-rapidapi-host': 'utelly-tv-shows-and-movies-availability-v1.p.rapidapi.com',
    'x-rapidapi-key': process.env.RAPID_API_KEY,
    'useQueryString': true
  });
  req.end(function (res) {
    // tells you where you can find the tv show, eg netfilx google play
    // console.log(res.body.results);
    // get imdb id: res.body.results[0].external_ids.imdb.id 
    // res.body.results.picture
    // loop through location to get all of them
    // res.body.results[0].locations[0].display_name
    // res.body.results[0].locations[0].icon
    // res.body.results[0].locations[0].url


    // Get imdb from utelly, use for trakt search
  });
}

function Show(obj, img, tmdbId) {
  this.title = obj.title ? obj.title : 'No title available.';
  this.overview = obj.overview ? obj.overview : 'No overview available.';
  this.image_url = img ? img : 'Image not available.';
  this.genres = obj.genres.join(', ') ? obj.genres.join(', ') : 'Genres not available';
  this.rating = obj.rating ? obj.rating : 'Rating not available';
  this.available_translations = obj.available_translations.join(', ') ? obj.available_translations.join(', ') : 'Genres not available';
  this.year = obj.year ? obj.year : 'Year not available';
  this.tmdbId = tmdbId;
}

// 404 Not Found error handler
function notFound(req, res){
  res.status(404).send('Sorry, this route does not exist.');
}

// Turn on client and turn on server if client connects
client.connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Listening on ${PORT}`));
  }).catch(err => console.log(err));




