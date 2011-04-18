
process.env.NODE_ENV = 'test';

var app = require('../app'),
    request = require('request'),
    async = require('async'),
    testCase = require('nodeunit').testCase,
    querystring = require('querystring'),
    test_port = 8091,
    app_base_uri = 'http://localhost:' + test_port
;

function seed_players(data_array, callback) {

  var players = [];
  for (var i = 0; i < data_array.length; i ++) {
    players.push(new app.Player(data_array[i]));
  }
    
  var save_players = players.map(function (player) {
    return function (callback) {
      player.save(function (err) {
        callback(err);
      });
    }
  });

  async.parallel(save_players, function (err, results) {
    callback(err);
  });
}

function seed_result(data, callback) {

  data.date = Date.now();
  var result = new app.Result(data);
  result.save(function(err) {
    callback(err);
  });

}

var testRenderedRoutes = testCase({

  setUp: function renderedRoutesSetup(startTest) { 
    startTest();
  },

  tearDown: function renderedRoutesTearDown(endTest) {
    endTest();
  },

  'GET /': function (test) {
    test.expect(1);
    request({
      uri: app_base_uri,
    }, function (err, res, body) {
      test.equal(res.statusCode, 200);
      test.done();
    }); 
  },

  'GET /history': function (test) {
    test.expect(1);
    request({
      uri: app_base_uri + '/history'
    }, function (err, res, body) {
      test.equal(res.statusCode, 200);
      test.done();
    }); 
  },

  'GET /enter, unverified': function (test) {
    test.expect(1);
    var real_verify = app.verify;
    app.verify = function(req) { return false; };
    request({
      uri: app_base_uri + '/enter'
    }, function (err, res, body) {
      test.equal(res.statusCode, 200);
      // TODO test that the form is not available
      app.verify = real_verify;
      test.done();
    }); 
  }, 

  'GET /enter, verified': function (test) {
    test.expect(1);
    var real_verify = app.verify;
    app.verify = function(req) { return true; };
    request({
      uri: app_base_uri + '/enter'
    }, function (err, res, body) {
      test.equal(res.statusCode, 200);
      // TODO test that the form is there
      app.verify = real_verify;
      test.done();
    }); 
  }

});

var testDataRoutes = testCase({

  setUp: function dataRoutesSetup(startTest) { 

    var new_result = function (data) {
      return function (callback) {
        seed_result(data, function(err) {
          // make sure we get unique timestamps
          setTimeout(function() {
            callback(err);
          }, 50);
        });
      };
    };

    /*
     * Player1 - 2W 0L 20GF 8GA
     * Player2 - 1W 1L 15GF 17GA
     * Player3 - 0W 2L 10FG 20GA 
     */
    async.series([
      function (callback) {
        seed_players([{
            name: 'player1', wins: 0, losses: 0, goals_for: 0, goals_against: 0
          }, {
            name: 'player2', wins: 0, losses: 0, goals_for: 0, goals_against: 0
          }, {
            name: 'player3', wins: 0, losses: 0, goals_for: 0, goals_against: 0
          }
        ], function (err) {
          callback(err);
        });
      },
      new_result({
        winner: 'player1',
        loser: 'player2',
        winner_goals: 10,
        loser_goals: 5,
      }),
      new_result({
        winner: 'player1',
        loser: 'player3',
        winner_goals: 10,
        loser_goals: 3,
      }),
      new_result({
        winner: 'player2',
        loser: 'player3',
        winner_goals: 10,
        loser_goals: 7,
      })
    ], function (err, results) {
      if (err) throw err.message;
      startTest();
    });

  },

  tearDown: function dataRoutesTearDown(endTest) {
    var wipe_collection = function(collection) {
      return function (callback) {
        app[collection].remove({}, function (err) {
          callback(err);
        });
      };
    };
    async.parallel([
      wipe_collection('Player'),
      wipe_collection('Result')
    ], function (err, results) {
      if (err) throw err.message;
      endTest();
    });
  },

  'GET /board': function (test) {
    test.expect(20);
    request({
      uri: app_base_uri + '/board'
    }, function (err, res, body) {
      var board = JSON.parse(body),
          p1 = board[0],
          p2 = board[1],
          p3 = board[2]
      ;
      test.equal(res.headers['content-type'], 'application/json');
      test.equal(board.length, 3);
      test.equal(p1.name, 'player1');
      test.equal(p2.name, 'player2');
      test.equal(p3.name, 'player3');
      test.equal(p1.wins, 2);
      test.equal(p2.wins, 1);
      test.equal(p3.wins, 0);
      test.equal(p1.losses, 0);
      test.equal(p2.losses, 1);
      test.equal(p3.losses, 2);
      test.equal(p1.pct.toFixed(2) + '', '1.00');
      test.equal(p2.pct.toFixed(2) + '', '0.50');
      test.equal(p3.pct.toFixed(2) + '', '0.00');
      test.equal(p1.goals_for.toFixed(1) + '', '10.0');
      test.equal(p2.goals_for.toFixed(1) + '', '7.5');
      test.equal(p3.goals_for.toFixed(1) + '', '5.0');
      test.equal(p1.goals_against.toFixed(1) + '', '4.0');
      test.equal(p2.goals_against.toFixed(1) + '', '8.5');
      test.equal(p3.goals_against.toFixed(1) + '', '10.0');
      
      test.done();
    });
  },

  'GET /results': function (test) {
    test.expect(14);
    request({
      uri: app_base_uri + '/results'
    }, function (err, res, body) {
      var results = JSON.parse(body),
          r1 = results[0],
          r2 = results[1],
          r3 = results[2]
      ;
      // results are ordered most recent to least recent
      test.equal(res.headers['content-type'], 'application/json');
      test.equal(results.length, 3);
      test.equal(r1.winner, 'player2');
      test.equal(r2.winner, 'player1');
      test.equal(r3.winner, 'player1');
      test.equal(r1.loser, 'player3');
      test.equal(r2.loser, 'player3');
      test.equal(r3.loser, 'player2');
      test.equal(r1.winner_goals, 10);
      test.equal(r2.winner_goals, 10);
      test.equal(r3.winner_goals, 10);
      test.equal(r1.loser_goals, 7);
      test.equal(r2.loser_goals, 3);
      test.equal(r3.loser_goals, 5);

      test.done();
    });
  },

  'GET /results with limit parameter': function (test) {
    test.expect(10);
    request({
      uri: app_base_uri + '/results?limit=2'
    }, function (err, res, body) {
      var results = JSON.parse(body),
          r1 = results[0],
          r2 = results[1]
      ;
      // results are ordered most recent to least recent
      test.equal(res.headers['content-type'], 'application/json');
      test.equal(results.length, 2);
      test.equal(r1.winner, 'player2');
      test.equal(r2.winner, 'player1');
      test.equal(r1.loser, 'player3');
      test.equal(r2.loser, 'player3');
      test.equal(r1.winner_goals, 10);
      test.equal(r2.winner_goals, 10);
      test.equal(r1.loser_goals, 7);
      test.equal(r2.loser_goals, 3);

      test.done();
    });
  },


  'POST /login should redirect to /enter': function (test) {
    test.expect(3); 
    // stub setVerified to ensure it gets called
    real_set_verified = app.setVerified;
    var verified = false;
    app.setVerified = function () {
      verified = true;
    };
    request({
      uri: app_base_uri + '/login',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'skeleton_key=' + app.config.skeleton_key
    }, function (err, res, body) {
      test.equal(res.statusCode, 302);  
      test.equal(res.headers['location'], app_base_uri + '/enter');
      test.ok(verified);
      app.setVerified = real_set_verified;
      
      test.done();
    }); 
  },

  'POST /login should not verify incorrect passwords': function (test) {
    test.expect();
    // stub setVerified to make sure it doesn't get called
    real_set_verified = app.setVerified;
    var verified = false;
    app.setVerified = function () {
      verified = true;
    };
    request({
      uri: app_base_uri + '/login',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'skeleton_key=wetland_refuge' 
    }, function (err, res, body) {
      test.equal(res.statusCode, 302);  
      test.equal(res.headers['location'], app_base_uri + '/enter');
      test.ok(!verified);
      app.setVerified = real_set_verified;
      
      test.done();
    }); 
  },

  'POST /login should not verify empty passwords': function (test) {
    test.expect();
    // stub setVerified to make sure it doesn't get called
    real_set_verified = app.setVerified;
    var verified = false;
    app.setVerified = function () {
      verified = true;
    };
    request({
      uri: app_base_uri + '/login',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' }
    }, function (err, res, body) {
      test.equal(res.statusCode, 302);  
      test.equal(res.headers['location'], app_base_uri + '/enter');
      test.ok(!verified);
      app.setVerified = real_set_verified;
      
      test.done();
    }); 
  },

  'POST /results': function (test) {
    test.expect(8);
    
    var real_verify = app.verify;
    app.verify = function(req) { return true; };
    request({
      uri: app_base_uri + '/results',
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'winner=player3&loser=player1&loser_goals=5'
    }, function (err, res, body) {
      // we should have been redirected to home
      test.equal(res.statusCode, 302);
      test.equal(res.headers['location'], app_base_uri + '/');
      // get the latest result to verify
      request({
        uri: app_base_uri + '/results?limit=1',
      }, function (err, res, body) {
        var results = JSON.parse(body),
            result = results[0]
        ;
        test.equal(res.headers['content-type'], 'application/json');
        test.equal(results.length, 1);
        test.equal(result.winner, 'player3');
        test.equal(result.loser, 'player1');
        test.equal(result.winner_goals, 10);
        test.equal(result.loser_goals, 5);

        app.verify = real_verify;
        test.done();
      });
    });
  },

  'DELETE /results/:id': function (test) {
    // get the match won by player2
    app.Result.findOne({ winner: 'player2'}, function (err, result) {
      if (err) throw err.message
      test.expect(21);
      request({
        uri: app_base_uri + '/results/' + result._id +
             '?' + querystring.stringify({ slloyd_foo: app.config.slloyd_foo }),
        method: 'DELETE'
      }, function (err, res, body) {
        // I never said this all had to make sense
        test.equal(body, 'durr');
        // get the board to verify
        request({
          uri: app_base_uri + '/board'
        }, function (err, res, body) {
          var board = JSON.parse(body),
              p1 = board[0],
              p2 = board[1],
              p3 = board[2]
          ;
          test.equal(res.headers['content-type'], 'application/json');
          test.equal(board.length, 3);
          test.equal(p1.name, 'player1');
          test.equal(p2.name, 'player2');
          test.equal(p3.name, 'player3');
          test.equal(p1.wins, 2);
          test.equal(p2.wins, 0);
          test.equal(p3.wins, 0);
          test.equal(p1.losses, 0);
          test.equal(p2.losses, 1);
          test.equal(p3.losses, 1);
          test.equal(p1.pct.toFixed(2) + '', '1.00');
          test.equal(p2.pct.toFixed(2) + '', '0.00');
          test.equal(p3.pct.toFixed(2) + '', '0.00');
          test.equal(p1.goals_for.toFixed(1) + '', '10.0');
          test.equal(p2.goals_for.toFixed(1) + '', '5.0');
          test.equal(p3.goals_for.toFixed(1) + '', '3.0');
          test.equal(p1.goals_against.toFixed(1) + '', '4.0');
          test.equal(p2.goals_against.toFixed(1) + '', '10.0');
          test.equal(p3.goals_against.toFixed(1) + '', '10.0');

          test.done();
        });
      });
    });
  },

  'DELETE /results/:id should fail without slloyd_foo': function (test) {
    app.Result.findOne({ winner: 'player2'}, function (err, result) {
      if (err) throw err.message
      test.expect(22);
      request({
        uri: app_base_uri + '/results/' + result._id,
        method: 'DELETE'
      }, function (err, res, body) {
        // I never said this all had to make sense
        test.equal(res.statusCode, 400);
        test.equal(body, 'Just don\'t');
        // make sure nothing changed
        request({
          uri: app_base_uri + '/board'
        }, function (err, res, body) {
          var board = JSON.parse(body),
              p1 = board[0],
              p2 = board[1],
              p3 = board[2]
          ;
          test.equal(res.headers['content-type'], 'application/json');
          test.equal(board.length, 3);
          test.equal(p1.name, 'player1');
          test.equal(p2.name, 'player2');
          test.equal(p3.name, 'player3');
          test.equal(p1.wins, 2);
          test.equal(p2.wins, 1);
          test.equal(p3.wins, 0);
          test.equal(p1.losses, 0);
          test.equal(p2.losses, 1);
          test.equal(p3.losses, 2);
          test.equal(p1.pct.toFixed(2) + '', '1.00');
          test.equal(p2.pct.toFixed(2) + '', '0.50');
          test.equal(p3.pct.toFixed(2) + '', '0.00');
          test.equal(p1.goals_for.toFixed(1) + '', '10.0');
          test.equal(p2.goals_for.toFixed(1) + '', '7.5');
          test.equal(p3.goals_for.toFixed(1) + '', '5.0');
          test.equal(p1.goals_against.toFixed(1) + '', '4.0');
          test.equal(p2.goals_against.toFixed(1) + '', '8.5');
          test.equal(p3.goals_against.toFixed(1) + '', '10.0');

          test.done();
        });
      }); 
    });
  },

  'DELETE /results/:id should fail with an invalid id': function (test) {
    test.expect(2);
    request({
      uri: app_base_uri + '/results/durr' +
           '?' + querystring.stringify({ slloyd_foo: app.config.slloyd_foo }),
      method: 'DELETE'
    }, function (err, res, body) {
      test.equal(res.statusCode, 400);
      test.equal(body, 'wtg and delete something that doesn\'t exist');
      test.done();
    });
  },

  'GET /matchups should return matchup data': function (test) {
    test.expect(3);

    request({
      uri: app_base_uri + '/matchups'
    }, function (err, res, body) {
      if (body.match(/Cannot/)) return test.done();
      var matchups = JSON.parse(body);

      function hasMatchup(pa, pb, paw, pbw, pagf, pbgf) {
        for (var i = 0; i < matchups.length; i++) {
          var matchup = matchups[i];
          if ((matchup[0].name == pa &&
               matchup[0].wins == paw &&
               matchup[0].goals_for == pagf &&
               matchup[1].name == pb &&
               matchup[1].wins == pbw &&
               matchup[1].goals_for == pbgf) ||
              (matchup[0].name == pa &&
               matchup[0].wins == paw &&
               matchup[0].goals_for == pagf &&
               matchup[1].name == pb &&
               matchup[1].wins == pbw &&
               matchup[1].goals_for == pbgf))
          {
            return true;
          }
        }
        return false;
      }
      test.ok(hasMatchup('player1', 'player2', 1, 0, 10, 5));
      test.ok(hasMatchup('player1', 'player3', 1, 0, 10, 3));
      test.ok(hasMatchup('player2', 'player3', 1, 0, 10, 7));

      test.done();
    });
  }
});

var listening = false;

exports.testRunner = testCase({

  setUp: function(startTest) {
    if (!listening) {
      app.listen(test_port, function() {
        listening = true;
        startTest();
      });
    } else {
      startTest();
    }
  },

  tearDown: function(endTest) {
    endTest();
  },

  'rendered routes': testRenderedRoutes,
  'data routes': testDataRoutes

});

