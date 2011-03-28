
process.env.NODE_ENV = 'test';

var app = require('../app'),
    Player = app.Player,
    async = require('async'),
    testCase = require('nodeunit').testCase
;

exports.playerModel = testCase({

  setUp: function playerModelSetup(startTest) {
    var player = new Player({
      name: 'name',
      wins: 42,
      losses: 14,
      goals_for: 487,
      goals_against: 225
    });
    player.save(function (err) {
      if (err) throw err.message;
      startTest();
    });
  },

  tearDown: function playerModelTearDown(endTest) {
    Player.remove({}, function (err) {
      if (err) throw err.message;
      endTest();
    });
  },

  'player should be saved': function (test) {
    test.expect(5);
    Player.findOne(function (err, found) {
      if (err) throw err.message;
      test.equal(found.name, 'name');
      test.equal(found.wins, 42);
      test.equal(found.losses, 14);
      test.equal(found.goals_for, 487);
      test.equal(found.goals_against, 225);
      test.done();
    });
  },

  'player should provide leaderboard summary': function (test) {
    test.expect(6);
    Player.findOne(function (err, found) {
      if (err) throw err.message;
      var board = found.toBoard(); 
      test.equal(board.name, 'name');
      test.equal(board.wins, 42);
      test.equal(board.losses, 14);
      test.equal(board.pct.toFixed(2), 0.75);
      test.equal(board.goals_for.toFixed(1), 8.7);
      test.equal(board.goals_against.toFixed(1), 4.0);
      test.done();
    });
  }

});

