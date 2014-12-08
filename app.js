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
var util = require('util');
var request = require('request');

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
app.use(bodyParser.text());
app.use(cookieParser());
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routings
var router = express.Router();
router.get('/', function(req, res) {
  res.render('index', { title: 'TwittMap' });
});

router.post('/', function(req, res) {
  console.log('get post');
  var messageType = req.headers['x-amz-sns-message-type'];
  if(!messageType) {
    res.status(400);
    res.send('Bad Request');
  }
  else {
    if(messageType == 'SubscriptionConfirmation') {
      var body = JSON.parse(req.body);
      console.log(body.SubscribeURL);
      request({
        url: body.SubscribeURL
      }, function (error, response, body) {
        if (!error && response.statusCode === 200) {
          console.log(body);
        }
      });
    } 
    else if (messageType == 'Notification') {
      var body = JSON.parse(req.body);
      var message = JSON.parse(body.Message);
      console.log(message);
      // io.emit('tweetwithscore', message);
      io.emit('tweet', message);
    }
    else {
      console.log(req.headers);
      console.log(req.body);
    }
    res.status(200);
    res.send('OK');
  }
});
app.use('/', router);

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
var Twit = require('twit');
var twit = new Twit(config['twitter']);

var updateInterval = 15; // Update trends every updateInterval minutes

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

var nextTweet = {};
nextTweet.status = 'empty';
pushRate = 1000 * 2;  // push a tweet per 2 seconds since alchemyapi has limited 1000 calls per day

function startStream() {
  var stream = null;
  var tweets = [];
  var count = 0;

  console.log("stream started");
  stream = twit.stream('statuses/filter', {'track': tracks});
  
  setTimeout(function(){
    stream.stop();
    console.log("stream stoped");
  },1000 * 60 * (updateInterval - 1));

  stream.on('tweet', function (tweet) {  
    if(nextTweet.status != 'ready') {
      var t;
      if (tweet.coordinates){
        if(tweet.coordinates !== null) {
          // console.log(tweet);
          for(var i = 0; i < keywords.length; i++) {
            if(tweet.text.toUpperCase().indexOf(keywords[i].toUpperCase()) > -1) {
              t = {
                keyword  : keywords[i],
                text     : tweet.text,
                time     : tweet.created_at,
                latitude : tweet.coordinates.coordinates[0],
                longitude: tweet.coordinates.coordinates[1],
                user     : tweet.user.name,
                profile  : tweet.user.profile_image_url,
              };
              nextTweet.tweet = t;
              nextTweet.status = 'ready';
              
              // io.emit('tweet', t);
              // models.Tweet.create(t).complete(function(err) {
              //   if(!!err) {
              //     console.log("An error occurred while dumping data:", err);
              //   } else {
              //     console.log("Successfully dumpled data!");
              //   }
              // });
              break;
            }
          }
        }
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


var AWS = require('aws-sdk');
var config = require('./config');
AWS.config.update(config['aws']);
AWS.config.apiVersions = {
    sns: '2010-03-31',
    sqs: '2012-11-05',
}

var sqs = new AWS.SQS();
var queueUrl;
function initSQS(queueName, callback) {
  sqs.createQueue({
    QueueName: queueName
  }, function (err, result) {
    if (err !== null) {
      console.log(util.inspect(err));
      if (callback && typeof(callback) === "function")
        callback(err);
      return;
    }
    console.log(util.inspect(result));
    queueUrl = result.QueueUrl;
    console.log(queueUrl);
    if (callback && typeof(callback) === "function")
      callback(null);
  });
}

var sns = new AWS.SNS();
var topicArn;
function initSNS(topicName, endpointUrl, callback) {
    sns.createTopic({
        Name: topicName
    }, function (err, result) {
        if (err !== null) {
            console.log(util.inspect(err));
            if (callback && typeof(callback) === "function")
                callback(err);
            return;
        }
        console.log(util.inspect(result));
        topicArn = result.TopicArn;
        console.log(topicArn);
        subscribe(endpointUrl, callback);
    });
}
function subscribe(endpointUrl, callback) {
    sns.subscribe({
        'TopicArn': topicArn,
        'Protocol': 'http',
        'Endpoint': endpointUrl
    }, function (err, result) {
        if (err !== null) {
            console.log(util.inspect(err));
            if (callback && typeof(callback) === "function")
                callback(err);
            return;
        }
        console.log(util.inspect(result));
        console.log('whatuo');
        if (callback && typeof(callback) === "function")
          callback(null);
    });
}

function initAWS(params, callback) {
  if(!params.topicName) {
    err = 'Missing topic name.';
    if (callback && typeof(callback) === "function")
      callback(err);
    return;
  }
  if(!params.queueName) {
    err = 'Missing queue name.';
    if (callback && typeof(callback) === "function")
      callback(err);
    return;
  }
  if(!params.endpointUrl) {
    err = 'Missing endpoint URL.';
    if (callback && typeof(callback) === "function")
      callback(err);
    return;
  }
  initSQS(params.queueName, function(err) {
    if(err !== null) {
      if (callback && typeof(callback) === "function")
        callback(err);
      return;
    }
    initSNS(params.topicName, params.endpointUrl, function(err) {
      console.log('hohso');
      console.log(err);
      if(err !== null) {
        console.log(err);
        if (callback && typeof(callback) === "function")
          callback(err);
        return;
      }
      console.log('hoho');
      if (callback && typeof(callback) === "function")
        callback(null);
    });
  });
}

function sendMessage(message) {
    var params = {
        MessageBody: message,
        QueueUrl: queueUrl,
        DelaySeconds: 0
    };
    sqs.sendMessage(params, function(err, data) {
        if(err) console.log(err, err.stack);
        // else {
            // console.log('send new message!');
            // console.log(data);
        // }
    });
}

function pushTweet() {
  if(nextTweet.status == 'ready') {
    models.Tweet.create(nextTweet.tweet).complete(function(err, res) {
      if(!!err) {
        console.log("An error occurred while dumping data:", err);
      } else {
        console.log("Successfully dumpled data!");
        t = res.dataValues;
        console.log(t);
        nextTweet.status = 'sent';
        // io.emit('tweet', t);
        var message = JSON.stringify({
            text: t.text,
            id: t.id
        });
        sendMessage(message);
        // sentimentAnalysis(t.text);
      }
    });
  }
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

var cp = require('child_process');
function createWorker(worker_id, queue_url, topic_arn) {
    var worker = cp.fork('worker.js', [worker_id, queue_url, topic_arn]);
    worker.on('close', function(code) {
        if(code !== 0) {
            console.log('worker ' + worker_id + ' exited with code ' + code);
        } else {
            console.log('worker ' + worker_id + ' exited peacefully');
        }
        // In case the child process died respawn a new one
        // worker = createWorker(worker_id, queue_url, topic_arn);
    })
    return worker;
}

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
        initAWS({
          queueName: 'demo',
          topicName: 'demo',
          endpointUrl: 'http://twittmap-env-zucbn2hrys.elasticbeanstalk.com' // 'http://5ec59e40.ngrok.com'
        }, function(err) {
          if(err !== null) {
            console.log(err);
          } else {
            getTrends();
            setInterval(getTrends, 1000 * 60 * updateInterval);
            setInterval(pushTweet, pushRate);
            var workers = [];
            var numCPUs = require('os').cpus().length;
            var numWorkers = Math.max(2, numCPUs - 1);
            for(var i = 0; i < numWorkers; i++) {
                workers[i] = createWorker(i, queueUrl, topicArn);                
            }
          }
        });
      });
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

module.exports = app;