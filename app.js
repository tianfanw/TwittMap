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

var app = express();

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
var config = require('./config')[env];
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

function init () {

  var debug = require('debug')('TwittMap');
  app.set('port', process.env.PORT || 3000);

  models.sequelize.sync({ force: true }).complete(function (err) {
    if (!!err) {
      console.log('An error occurred while creating the table:', err);
    } else {
      console.log('Successfully created tables.');
      var server = app.listen(app.get('port'), function() {
        debug('Express server listening on port ' + server.address().port);
      });
    }
  });
}

// Initialize database
var connection = mysql.createConnection({
  host: config.host,
  user: config.username,
  password: config.password,
  port: config.port
});
async.series([
  function connect(callback) {
    connection.connect(callback);
  },
  function clear(callback) {
    connection.query('DROP DATABASE IF EXISTS ' + config.database, callback);
  },
  function create_db(callback) {
    connection.query('CREATE DATABASE ' + config.database, callback);
  },
  function use_db(callback) {
    connection.query('USE ' + config.database, callback);
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
