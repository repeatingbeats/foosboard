
var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    async = require('async')
;

var Result = new Schema({
  winner: String,
  loser: String,
  winner_goals: {
    type: Number,
    validate: [ function (v) { return v == 10 },
                'winner score must be 10'
              ]
  },
  loser_goals: {
    type: Number,
    validate: [ function(v) { return v >= 0 && v < 10 },
                'loser score must be between 0 and 9'
              ]
  },
  date: Date
});

// Update player documents before saving the result
Result.pre('save', function (next) {

  async.parallel([
    update_player(this, this.winner, 'win'),
    update_player(this, this.loser, 'lose')
  ], function (err, empty_result) {
    next(err);
  });

});

// Update players if we have to revoke a result
Result.pre('remove', function (next) {

  async.parallel([
    update_player(this, this.winner, 'revokeWin'),
    update_player(this, this.loser, 'revokeLoss')
  ], function (err, empty_result) {
    next(err);
  });

});

var Player = mongoose.model('Player');

function update_player(result, name, action) {
  return function (callback) {
    Player.findOne({ name: name }, function (err, player) {
      if (err) return callback(err);
      player[action](result, function (err) {
        callback(err);
      });
    });
  };
};

module.exports = mongoose.model('Result', Result);

