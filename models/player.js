
var mongoose = require('mongoose'),
    Schema = mongoose.Schema
;

/**
 * Player
 *
 * This document stores player data required to generate a leaderboad. Player
 * documents should only be updated via .pre or .post hooks from actions on
 * Results to ensure that data stays consistent.
 */
var Player = new Schema({
  name: {
    type: String,
    index: {
       unique: true
    }
  },
  wins: Number,
  losses: Number,
  goals_for: Number,
  goals_against: Number
});

Player.methods.toBoard = function() {
  var matchCount = this.wins + this.losses;
  var pct = matchCount == 0 ? 0.0 : this.wins / matchCount;
  return {
    name: this.name,
    wins: this.wins,
    losses: this.losses,
    pct: pct,
    goals_for: perMatch(this.goals_for, matchCount),
    goals_against: perMatch(this.goals_against, matchCount),
  };
}

function perMatch(stat, matchCount) {
  return matchCount == 0 ? 0.0 : stat / matchCount;
}

Player.methods.win = function (result, callback) {
  this.wins++;
  this.goals_for += result.winner_goals;
  this.goals_against += result.loser_goals;
  this.save(function (err) {
    callback(err);
  });
}

Player.methods.lose = function (result, callback) {
  this.losses++;
  this.goals_for += result.loser_goals;
  this.goals_against += result.winner_goals;
  this.save(function (err) {
    callback(err);
  });
}

Player.methods.revokeWin = function (result, callback) {
  this.wins--;
  this.goals_for -= result.winner_goals;
  this.goals_against -= result.loser_goals;
  this.save(function (err) {
    callback(err);
  });
}

Player.methods.revokeLoss = function (result, callback) {
  this.losses--;
  this.goals_for -= result.loser_goals;
  this.goals_against -= result.winner_goals;
  this.save(function (err) {
    callback(err);
  });
}

module.exports = mongoose.model('Player', Player);

