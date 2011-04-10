
var mongoose = require('mongoose'),
    async = require('async')
;

module.exports = function(app) {

  app.get('/', function(req, res) {
    res.render('index.jade');
  });

  app.post('/login', function(req, res) {
    if (req.param('skeleton_key') == app.config.skeleton_key) {
      app.setVerified(req);
    } else {
      req.flash('login', 'NO SOUP FOR YOU!');
    }
    res.redirect('/enter');
  });

  app.get('/history', function (req, res) {
    res.render('history.jade');
  });

  app.get('/enter', function (req, res) {
    if (app.verify(req)) {
      // render the score entry page
      app.Player.find({}, function (err, players) { 
        var flash = null;
        if (err || players.length == 0) {
          flash = 'something went wrong there. find slloyd?';
        }
        if (!flash) {
          flash = req.flash('enter')[0];
        }
        res.render('enter.jade', {
          flash_msg: flash,
          players: players
        });
      });
    } else {
      // Not authorized to enter a score
      var flash = req.flash('login')[0];
      res.render('login.jade', { flash_msg: flash});
    }
  });

  app.get('/board', function(req, res) {
    app.Player.find({}, function (err, players) {
      if (err) res.send('WHOOPS!');
      var board = [];
      players.forEach(function (player) {
        board.push(player.toBoard());
      });
      board.sort(function(a, b) {
        // sort by win pct (tie break on number of wins) 
        if (a.pct == b.pct) {
          return b.wins - a.wins;
        } else {
          return b.pct - a.pct;
        }
      });
      res.contentType('json');
      res.send(JSON.stringify(board));
    });
  });

  app.get('/results', function (req, res) {
    var options = { sort: { 'date': -1 }};
    var limit = req.param('limit');
    if (limit) {
      options.limit = limit;
    }
    app.Result.find({}, [], options, function(err, results) {
      if (err) res.send('WHOOPS');
      res.contentType('json');
      var parsed_results = results.map(function (row) {
        var date = new Date(row.date);
        var utc = date.getTime();
        return {
          winner: row.winner,
          loser: row.loser,
          winner_goals: row.winner_goals,
          loser_goals: row.loser_goals,
          utc: utc
        };
      });
      res.send(JSON.stringify(parsed_results));
    });
  });

  app.get('/ratings', function (req, res) {
    res.render('ratings.jade');
  });

  // Compute rankings. This should be cached and updated when a new result is
  // entered, so that this only returns the cached data (but could be used to
  // recompute it if desired?)
  app.get('/ranking', function (req, res) {
    // Some parameters. Will need experimenting
    const a = 400;
    const K = 16;

    app.Player.find({}, function (err, players) {
      var ranks = {};
      players.forEach(function (player) {
        ranks[player.name] = 100;
      });
      var options = { sort: { 'date': 1 }};
      app.Result.find({}, [], options, function (err, results) {
        results.forEach(function (result) {
          var ratingDifference = ranks[result.loser] - ranks[result.winner];
          // Probability that the winner won.
          var probWin = 1 / (Math.exp(ratingDifference/a) + 1);

          // Adjust ranks.
          ranks[result.winner] += K * (1 - probWin);
          ranks[result.loser] += K * (-1 + probWin);
        });

        // Turn into an array; sort by decreasing rating.
        var results = [];
        for (var player in ranks) {
          results.push({name: player, rating: ranks[player]});
        }
        results.sort(function(a, b) {
          return a.rating - b.rating;
        });

        res.contentType('json');
        res.send(results);
      });
    });
  });

  // Get the matchup data. Should probably cache this somewhere and only
  // recompute after new scores are entered.
  app.get('/matchups', function (req, res) {

    app.Player.find({}, function (err, players) {
      if (err) res.send('WHOOPS');

      // Call an async function for each pair in the document array. Invoke
      // callback when all of the pair funcs have called back.
      function for_each_pair(docs, pairFunc, callback) {
        var funcs = [];

        docs.forEach(function (a, i) {
          docs.forEach(function (b, j) {
            if (i < j) {
              funcs.push(function (callback) {
                pairFunc(a, b, callback);
              });
            }
          });
        });

        async.parallel(funcs, callback);
      }

      // Get head to head stats for matches where player a beat player b
      function head_to_head(a, b) {
        return function(callback) {
          app.Result.find({
            winner: a.name,
            loser: b.name
          }, function (err, results) {
            if (err) return callback(err);
            var stats = {
              name: a.name,
              wins: results.length,
              winner_goals: 0,
              loser_goals: 0
            };
            results.forEach(function (result) {
              stats.winner_goals += result.winner_goals;
              stats.loser_goals += result.loser_goals;
            });
            callback(null, stats);
          });
        };
      }

      var matchups = [];

      for_each_pair(players, function (a, b, callback) {

        funcs = {};
        funcs[a.name] = head_to_head(a, b);
        funcs[b.name] = head_to_head(b, a);

        async.parallel(funcs, function (err, stats) {
          if (err) return res.send('WHOOPS!');

          function stats_to_matchup(winner, loser) {
            return {
              name: stats[winner].name,
              wins: stats[winner].wins,
              losses: stats[loser].wins,
              goals_for: stats[winner].winner_goals +
                         stats[loser].loser_goals,
              goals_against: stats[winner].loser_goals +
                             stats[loser].winner_goals
            };
          }

          var matchup = [ stats_to_matchup(a.name, b.name),
                          stats_to_matchup(b.name, a.name) ];
          matchups.push(matchup);
          callback();
        });

      }, function (err, empty_result) {
        if (err) return res.send('WHOOPS!');
        res.contentType('json');
        res.send(matchups);
      });
    });
  });

  app.post('/results', function(req, res) {

    var winner_goals = 10,
        loser_goals = parseInt(req.param('loser_goals')),
        winner = req.param('winner'),
        loser = req.param('loser')
    ;

    if (!app.verify(req)) {
      res.redirect('/');
      return;
    }

    if (winner == loser) {
      req.flash('enter', 'WTF YOU CAN\'T PLAY YOURSELF?!?');
      res.redirect('/enter');
      return;
    }

    function handleError() {
      req.flash('enter', 'slloyd screwed something up');
      res.redirect('/enter');
    }

    var result = new app.Result({
      winner: winner,
      loser: loser,
      winner_goals: winner_goals,
      loser_goals: loser_goals,
      date: Date.now()
    });

    result.save(function (err) {
      if (err) {
        req.flash('enter', 'slloyd screwed something up');
        res.redirect('/enter');
      } else {
        res.redirect('/');
      }
    });
  });

  // If I ever have to use this, I'm going to be angry
  app.delete('/results/:id', function(req, res) {

    if (!(req.param('slloyd_foo') == app.config.slloyd_foo)) {
      res.statusCode = 400;
      res.send('Just don\'t');
      return;
    }

    function handleError(err) {
      res.statusCode = 400;
      res.send(err.message);
    }

    app.Result.findById(req.params.id, function (err, delete_result) {
      if (!err && !delete_result) {
        err = new Error('wtg and delete something that doesn\'t exist');
        handleError(err);
        return;
      }
      delete_result.remove(function (err) {
        if (err) handleError(err);
        else res.send('durr');
      });
    });
  });

  app.verify = function(req) {
    return req.session.verified;
  };

  app.setVerified = function (req) {
    req.session.verified = true;
  };

}

