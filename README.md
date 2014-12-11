# COMS6998 Homework2 TwittMap
=============================

## EBS URL
http://twittmap-env-dsy5t6jhe3.elasticbeanstalk.com/

## Installation
1. To run the app, you need to have mysql and node.js installed. (you may need to install npm as well)

2. Download and unzip the file, cd into the directory and run:
$npm install

3. Then you need to put your twitter tokens and database username/password into the configuration file: config.js. There's a sample_config.js for reference.

4. Now you should be able to run the app locally, type:
$node app.js
or
$npm start
The app is available at 127.0.0.1:3000 by default.

5. To deploy the app on AWS EBS, you need to create the environment either from the console or through the CLI first, then run
$git aws.push 
to push the app onto AWS EBS.
