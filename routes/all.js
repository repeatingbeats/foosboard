
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

