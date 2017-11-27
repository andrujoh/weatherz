const bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
session = require('express-session'),
flash = require("express-flash"),
mongoose = require('mongoose'),
request = require('request'),
express = require('express'),
app = express();

mongoose.connect('mongodb://localhost/weatherz', {
  useMongoClient: true,
});
mongoose.Promise = global.Promise;

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));

app.use(cookieParser('keyboard cat'));
app.use(session({ cookie: { maxAge: 60000 }}));
app.use(flash());

app.locals.moment = require('moment');

let apiKey = '8c56faea37b8bf2b19c8094e646f4b16';


//Schema
let weatherSchema = new mongoose.Schema({
  city: {type: String, unique: true},
  temp: String,
  created: {type: Date, default: Date.now}
});


// Prevent pluralization with 3rd argument, Measure would become measures
//let Weather = mongoose.model("Measure", weatherSchema, "Measure");
let Weather = mongoose.model("Record", weatherSchema);

//Model Seed
// Weather.create({
//   city: "Grimstad",
//   temp: "5"
// });

app.get('/', (req, res, next) => {
  Weather.find({}, function(err, allRecords) {
    if (err) {
      console.log(err);
    } else {
      res.render("index", {records: allRecords, error: null, success: null});
    }
  }).sort({created: -1});
});

// Create
app.post('/', (req, res) => {
  let city = req.body.city;
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  let query =  getCity(city);
  let tempInDb;
  let cityInDb;
  
  request(url, (error, response, body) => {
    let weather = JSON.parse(body);
    if (error || weather.main == undefined) {
      req.flash('info', 'Finner ikke stedet');
      res.redirect('/');
    } else {
      
      // Temperature from API
      let temp = weather.main.temp;
      
      query.exec(function(err, cities){
        if(err) {
          return console.log(err);
        } else {
          cities.forEach(function(city){
            tempInDb = city.temp;
            req.flash('info', `Oppdaterte ${city.city} fra ${city.temp} ℃ til ${temp} ℃`);
            console.log(`Temperaturen i ${req.body.city} er ${temp} ℃. Forrige måling viste ${city.temp} ℃`);
            console.log('Tempindb is ' + tempInDb);
          });
        }
      });
      let newWeatherRecord = {city, temp};
         Weather.create(newWeatherRecord, (error, newlyCreated) => {
           if (error) {
             console.log(error);
             res.render('index', {records: null, error: `Ingen temperaturendring i ${city}`, success: null});
           } else {
             console.log('Lagret måling: ' + city);
             res.redirect('/');
           }
         });
      let weatherText = `Det er ${weather.main.temp} grader i ${weather.name} i dag`;
    }
  });
});

//Update
app.get('/update', (req, res, next) => {
  Weather.find({}, function(err, allRecords) {
    if (err) {
      console.log(err);
    } else {
      res.render("update", {records: allRecords, error: null, success: null});
    }
  }).sort({created: -1});
});

app.post('/update', (req, res) => {
  let city = req.body.city;
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`;
  let query =  getCity(city);
  let tempInDb;
  let cityInDb;
  
  request(url, (error, response, body) => {
    let weather = JSON.parse(body);
    if (error || weather.main == undefined) {
      req.flash('info', 'Finner ikke stedet');
      res.redirect('/');
    } else {
      
      // Temperature from API
      let temp = weather.main.temp;
      
      query.exec(function(err, cities){
        if(err) {
          return console.log(err);
        } else {
          cities.forEach(function(city){
            tempInDb = city.temp;
            if (tempInDb != temp) {
              console.log('temp is not same as in db');
              req.flash('info', `Oppdaterte ${city.city} fra ${city.temp} ℃ til ${temp} ℃`);
              console.log(`Temperaturen i ${req.body.city} er ${temp} ℃. Forrige måling viste ${city.temp} ℃`);
            } else {
              req.flash('info', 'Ingen endringer i temperatur');
              console.log('Temp has not changed');
              console.log('Tempindb is ' + tempInDb);
            }
          });
        }
      });

      Weather.find({'city': city}).exec(function(err, result){
        if (err) {
          console.log(err);
          res.render('index', {records: null, error: `Ingen temperaturendring i ${city}`, success: null});
        }
        if(result !== city.temp){
          Weather.update({city: city}, { $set: { temp: temp } }, function(err, updateCity){
            res.redirect('/update');
          });
        }
      });
    }
  });
});


function getCity(city){
    var query = Weather.find({city:city});
    return query;
  }

app.listen(process.env.PORT, process.env.IP, function() {
  console.log("Server is running");
});

