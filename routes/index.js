var express = require('express');
var router = express.Router();
var request = require('request');
// var io = require('socket.io')(server);
var app = require('../app');

/* GET home page. */
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
    }
    else {
      console.log(req.headers);
      console.log(req.body);
    }
    res.status(200);
    res.send('OK');
  }
});

module.exports = router;
