
process.env.NODE_ENV = 'test';

var app = require('../app'),
    Result = app.Result,
    async = require('async'),
    testCase = require('nodeunit').testCase
;

exports.resultModel = testCase({

  setUp: function resultModelSetup(startTest) {
    // stub out middleware. will handle that with integration tests
    Result.schema.callQueue = [];
    startTest();
  },

  tearDown: function resultModelTearDown(endTest) {
    Result.remove({}, function (err) {
      if (err) throw err.message;
      endTest();
    });
  },

  'result should be saveable': function (test) {
    test.expect(4);
    var result = new Result({
      winner: 'win',
      loser: 'lose',
      winner_goals: 10,
      loser_goals: 4,
      date: Date.now(),
    });
    result.save(function (err) {
      if (err) throw err.message;
      Result.findOne({winner: 'win'}, function(err, found) {
        if (err) throw err.message;
        test.equal(found.winner, 'win');
        test.equal(found.loser, 'lose');
        test.equal(found.winner_goals, 10);
        test.equal(found.loser_goals, 4);
        test.done();
      });
    });
  },

  'winner_goals must be 10': function (test) {
    test.expect(2);
    var result = new Result({
      winner: 'win',
      loser: 'lose',
      winner_goals: 9,
      loser_goals: 4,
      date: Date.now()
    });
    result.save(function (err) {
      test.ok(err);
      test.ok(err.message.match(/winner score must be 10/));
      test.done();
    });
  },

  'loser_goals must be less than 10': function (test) {
    test.expect(2);
    var result = new Result({
      winner: 'win',
      loser: 'lose',
      winner_goals: 10,
      loser_goals: 10,
      date: Date.now()
    });
    result.save(function (err) {
      test.ok(err);
      test.ok(err.message.match(/loser score/));
      test.done();
    });
  },

  'loser_goals must be greater than zero': function (test) {
    test.expect(2);
    var result = new Result({
      winner: 'win',
      loser: 'lose',
      winner_goals: 10,
      loser_goals: -1,
      date: Date.now()
    });
    result.save(function (err) {
      test.ok(err);
      test.ok(err.message.match(/loser score/));
      test.done();
    });
  }

});
