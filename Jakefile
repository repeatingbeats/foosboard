
const PRODUCTION_URI = 'http://foosboard.soundhacks.com';
const DEV_DB_URI = 'mongodb://localhost/foosboard-development';

var request = require('request'),
    mongoose = require('mongoose'),
    async = require('async')
;

var models = {};
[ 'Player', 'Result' ].forEach(function (model) {
  require('./models/' + model.toLowerCase());
  models[model] = mongoose.model(model);
});

mongoose.connect(DEV_DB_URI);

/*
 * Clear Player and Result data from the development database
 */
task('clear', [], function() {

  function clear_collection(collection) {
    return function(callback) {
      models[collection].remove({}, function(err) {
        callback(err);
      });
    };
  }

  var clearFuncs = [];
  for (var model in models) {
    clearFuncs.push(clear_collection(model));
  }

  async.parallel(clearFuncs, function (err, empty_result) {
    if (err) throw err.message;
    console.log('cleared Player and Result data from ' + DEV_DB_URI);
    complete();
  });

}, true);

/*
 * Retrieve all results from production and seed the foosboard-development db
 * locally. Doing it with an actual production request so any dev can seed their
 * local db without having access to the prod db.
 */
task('seed', [ 'clear' ], function() {
  console.log('retriving results from ' + PRODUCTION_URI);

  request({
    uri: PRODUCTION_URI + '/results'
  }, function (err, res, body) {
    if (err) throw err.message;

    var results = JSON.parse(body),
        playerNames = [];

    function checkName(name) {
      if (playerNames.indexOf(name) < 0) {
        playerNames.push(name);
      }
    }

    results.forEach(function (result) {
      checkName(result.winner);
      checkName(result.loser);
    });

    var savePlayerFuncs = playerNames.map(function (name) {
      return function(callback) {
        var player = new models.Player({
          name: name, wins: 0, losses: 0, goals_for: 0, goals_against: 0
        });
        player.save(function (err) { callback(err); });
      };
    });

    async.parallel(savePlayerFuncs, function(err, empty_result) {
      if (err) throw err.message;

      var saveResultFuncs = results.map(function (result) {
        return function(callback) {
          result.date = new Date(result.utc);
          delete result.utc;
          var newResult = new models.Result(result);
          newResult.save(function (err) { callback(err) });
        }
      });

      async.series(saveResultFuncs, function (err, empty_result) {
        if (err) console.log(err.message);
        console.log('seeded data into ' + DEV_DB_URI);
        return complete();
      });
    });
  });

}, true);

