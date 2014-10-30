var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var async = require('async');
var models = require("./models");
var routes = require('./routes/index');
var users = require('./routes/users');
var fs = require('fs');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routings
app.use('/', routes);
// app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

var env = app.get('env');
var config = require('./config');
var dbconfig = config['database'][env];
var twconfig = config['twitter'];

// error handlers
// development error handler
// will print stacktrace
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: (env === 'development') ? err : {},
    });
});


//Setup twitter stream api
var util = require('util');
var Twit = require('twit');
var twit = new Twit(twconfig);

var updateInterval = 15;

var keywords = [];
var tracks = "";

// function getTrends() {
//   console.log("trends updated!");
//   startStream();
// }
// function startStream() {
//   console.log("start stream");
//   setTimeout(function(){
//     console.log("stop stream");
//   }, 18000);
// }
function getTrends() {
  twit.get('trends/place', {id: 1}, function(err, data, response) {
    if (typeof data === "undefined") {
      console.log(err);
    } else {
      // console.log(data[0]);
      keywords.length = 0;
      tracks = "";
      for(var i = 0; i < 5; i++) {
        keywords[i] = data[0].trends[i].name;
        tracks += keywords[i];
        if(i < 4)
          tracks += ",";
      }
      console.log("trends updated");
      io.emit('keywords', keywords);
      startStream();
    }
  });
}



function startStream() {
  var stream = null;
  var tweets = [];
  var count = 0;

  console.log("stream started");
  stream = twit.stream('statuses/filter', {'track': tracks});
  
  setTimeout(function(){
    stream.stop();
    console.log("stream stoped");
  },1000 * 60 * (updateInterval - 2));

  stream.on('tweet', function (tweet) {  
    var t;
    if (tweet.coordinates){
      if(tweet.coordinates !== null) {
        // console.log(tweet);
        for(var i = 0; i < keywords.length; i++) {
          if(tweet.text.indexOf(keywords[i]) > -1) {
            t = {
              keyword  : keywords[i],
              text     : tweet.text,
              time     : tweet.created_at,
              latitude : tweet.coordinates.coordinates[0],
              longitude: tweet.coordinates.coordinates[1],
              user     : tweet.user.name,
              profile  : tweet.user.profile_image_url,
            };
            io.emit('tweet', t);
            // tweet[count] = t;
            // count++;
            // if(count == 5) {
            //   models.Tweet.bulkCreate(tweets).complete(function(err) {
            //     if(!!err) {
            //       console.log("An error occurred while dumping data:", err);
            //     } else {
            //       console.log("Successfully dumpled data!");
            //     }
            //   })
            //   count = 0;
            // }
            models.Tweet.create(t).complete(function(err) {
              if(!!err) {
                console.log("An error occurred while dumping data:", err);
              } else {
                console.log("Successfully dumpled data!");
              }
            });
            break;
          }
        }
        // tweets[count] = {
        //   "id"       : data.id_str, 
        //   "track"    : tweet.track
        //   "time"     : data.created_at, 
        //   "latitude" : data.coordinates.coordinates[0], 
        //   "longitude": data.coordinates.coordinates[1],
        //   "text"     : data.text
        // };
    //     io.emit('tweets', [tweets[count]]);
    //     count++;
    //     if(count == 10) {
    //       models.Tweet.bulkCreate(tweets).complete(function(err) {
    //         if(!!err) {
    //           console.log("An error occurred while dumping data:", err);
    //         } else {
    //           console.log("Successfully dumpled data!");
    //         }
    //       })
    //       count = 0;
    //     }
      }
    }
  });

  stream.on('disconnect', function (disconnectMessage) {
    console.log("disconnected");
    // console.log(disconnectMessage);
  });

  stream.on('connect', function (request) {
    console.log("try to connect to Twitter");
    // console.log(request);
  });

  stream.on('reconnect', function (request, response, connectInterval) {
    console.log("reconnect to Twitter");
  });
}

// Send tweets in db, if db empty or outdated, then send new data from twitter stream
io.on('connection', function(socket){
  console.log('a user connected');
  socket.emit('keywords', keywords);

  socket.on('tweets', function(req){
    // console.log(req);
    models.Tweet.findAll({ order: 'time DESC', limit: 3000, where: {keyword : req} }).complete(function(err, tweets) {
      if(!!err) {
        console.log('An error occurred while querying db:', err);
      } else {
        console.log('Successfully fetched tweets from db.');
        // console.log(tweets);
        socket.emit('tweets', tweets);
      }
    });
  });

  socket.on('current', function(req){
    socket.emit('keywords', keywords);
  });

  socket.on('history', function(req){
    // console.log(req);
    var begin = new Date();
    begin.setDate(begin.getDate() - req.days);
    begin.setHours(begin.getHours() - req.hours);
    
    models.sequelize.query(
     'SELECT keyword, COUNT(*) FROM Tweets WHERE time >= "' +  begin.toISOString().slice(0, 19).replace('T', ' ')
      + '" GROUP BY keyword ORDER BY COUNT(*) DESC LIMIT 5').success(function(res){
      var histKeywords = [];
      for(var i = 0; i < res.length; i++) {
        histKeywords[i] = res[i].keyword;
      }
      // console.log(res); 
      // console.log(histKeywords); 
      socket.emit('keywords', histKeywords);
    });
  })
  // var tweets = [];
  // for(var i = 0; i < 10; i++) {
  //   tweets[i] = {text: 'tweets' + i};
  // }
  // socket.emit('tweets', tweets);
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

// Mock up periodical update
// setInterval(function() {
//   console.log("new tweet");
//   io.emit('tweets', [{text: 'hello'}]);
// }, 1000);

function init () {

  var debug = require('debug')('TwittMap');
  app.set('port', process.env.PORT || 3000);

  models.sequelize.sync().complete(function (err) {
    if (!!err) {
      console.log('An error occurred while creating the table:', err);
    } else {
      console.log('Successfully created tables.');
      server.listen(app.get('port'), function() {
        debug('Express server listening on port ' + server.address().port);
      });
      getTrends();
      setInterval(getTrends, 1000 * 60 * updateInterval);
    }
  });
}

// Initialize database
var connection = mysql.createConnection({
  host: dbconfig.host,
  user: dbconfig.username,
  password: dbconfig.password,
  port: dbconfig.port
});

fs.exists('./init_file', function(exists) { 
  if (exists) { 
    async.series([
      function connect(callback) {
        connection.connect(callback);
      },
      function clear(callback) {
        connection.query('CREATE DATABASE IF NOT EXISTS ' + dbconfig.database, callback);
      },
      function use_db(callback) {
        connection.query('USE ' + dbconfig.database, callback);
      },
    ], function (err, results) {
      if (err) {
        console.log('Exception initializing database.');
        throw err;
      } else {
        console.log('Database initialization complete.');
        init();
      }
    });
  } else {
    async.series([
      function connect(callback) {
        connection.connect(callback);
      },
      function clear(callback) {
        connection.query('DROP DATABASE IF EXISTS ' + dbconfig.database, callback);
      },
      function create_db(callback) {
        connection.query('CREATE DATABASE ' + dbconfig.database, callback);
      },
      function use_db(callback) {
        connection.query('USE ' + dbconfig.database, callback);
      },
    ], function (err, results) {
      if (err) {
        console.log('Exception initializing database.');
        throw err;
      } else {
        console.log('Database initialization complete.');
        fs.writeFile("./init_file", "", function(err) {
          if(err) {
            console.log(err);
          }
        });
        init();
      }
    });
  }
});
 

var cronJob = require('cron').CronJob;
var dbAutoClearJob = new cronJob('0 0 0 7,14,21,28 * *', function(){
    // Clear old data
    var last = new Date();
    last.setDate(last.getDate() - 7);

    models.sequelize
    .query('DELETE FROM Tweets WHERE time < "' + last.toISOString().slice(0, 19).replace('T', ' ') + '"')
    .success(function(res){
      console.log("Deletion succeeds.");
    });
}, null, true);
dbAutoClearJob.start();