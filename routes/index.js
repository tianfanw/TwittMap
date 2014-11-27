var express = require('express');
var router = express.Router();

var watchSymbols = ['$msft', '$intc', '$hpq', '$goog', '$nok', '$nvda', '$bac', '$orcl', '$csco', '$aapl', '$ntap', '$emc', '$t', '$ibm', '$vz', '$xom', '$cvx', '$ge', '$ko', '$jnj'];

//This structure will keep the total number of tweets received and a map of all the symbols and how many tweets received of that symbol
var watchList = {
    total: 0,
    symbols: {}
};

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'TwittMap' });
});

module.exports = router;
