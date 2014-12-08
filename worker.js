console.log("Process "+ process.argv[2] +" at work " );

//Create the AlchemyAPI object
var AlchemyAPI = require('./alchemyapi');
var alchemyapi = new AlchemyAPI();
function sentimentAnalysis(text, callback) {
  alchemyapi.sentiment('text', text, {}, function(response) {
    console.log(response);
    var score;
    if(!!response.docSentiment) {
        var sentiment = response.docSentiment;
        if(sentiment.type == 'neutral')
            score = 0;
        else
            score = parseFloat(sentiment.score);
    }
    else score = 0;
    if (callback && typeof(callback) === "function")
        callback(score);
  });
}

var AWS = require('aws-sdk'), util = require('util');
var config = require('./config');
AWS.config.update(config['aws']);

AWS.config.apiVersions = {
    sns: '2010-03-31',
    sqs: '2012-11-05',
}

var sns = new AWS.SNS();
var topicArn = process.argv[4];
console.log('topicArn = ' + topicArn);
function publish(message, callback) {
    sns.publish({
        TopicArn: topicArn,
        Message: message
    }, function(err, data) {  
        if(err != null) {
            console.log(util.inspect(err));
            if (callback && typeof(callback) === "function")
                callback(err);
            return;
        }
        if (callback && typeof(callback) === "function")
            callback(null);
    });
}

var models = require("./models");
function updateDB(id, score, callback) {
    models.Tweet.find({where: {id: id}}).complete(function(err, tweet) {
        if(tweet) {
            if(score != 0) {
                tweet.updateAttributes({
                    score: score
                }).success(function() {
                    // send to SNS
                    if (callback && typeof(callback) === "function")
                        callback(null, tweet);
                });
            } else {  // otherwise no need to update db
                // send to SNS
                if (callback && typeof(callback) === "function")
                    callback(null, tweet);
            }
        } else {
            if (callback && typeof(callback) === "function")
                callback(err);
        }
    });
}

var sqs = new AWS.SQS();
var queueUrl = process.argv[3];
console.log('queueUrl = ' + queueUrl);

function readMessage() {
    // console.log("a new call");
    sqs.receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        VisibilityTimeout: 30,
        WaitTimeSeconds: 10
    }, function(err, data) {
        // console.log("return!");
        if (err !== null) {
            console.log("error!");
            console.log(util.inspect(err));
        } else {
            if(data.Messages) {
                var message = data.Messages[0];
                var body = JSON.parse(message.Body);
                // console.log(body);
                sentimentAnalysis(body.text, function(score) {
                    updateDB(body.id, score, function(err, tweet) {
                        if(err != null) {
                            console.log(err);
                        } else {
                            // publish to SNS
                            var message = JSON.stringify(tweet);
                            publish(message);
                        }
                    });
                });
                sqs.deleteMessage({
                    QueueUrl: queueUrl,
                    ReceiptHandle: message.ReceiptHandle
                }, function(err, data) {
                    // If we errored, tell us that we did
                    if (err !== null) {
                        console.log(util.inspect(err));
                    } 
                    // else console.log(data);
                });
            }
        }
        readMessage();
    });
}

readMessage();