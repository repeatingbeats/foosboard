
var Foosboard = (function() {

  function numfmt(num, len) {
    var out = num + "";
    while (out.length < len) {
      out = "0" + out;
    }
    return out;
  }

  function summarize(matchup) {
    var player_a = matchup[0],
        player_b = matchup[1],
        summary = {},
        first,
        second
    ;

    // Don't show empty matchups
    if (player_a.wins == 0 && player_b.wins == 0) {
      return null;
    }

    if (player_a.wins >= player_b.wins) {
      first = player_a;
      second = player_b;
    } else {
      second = player_a;
      first = player_b;
    }
    summary.rel = (first.wins == second.wins) ? 'ties' : 'leads';
    summary.first = first.name;
    summary.second = second.name;
    summary.record = first.wins + '-' + second.wins;

    return summary;
  }

  return {

    results: function ($, options) {
      url = '/results';
      if (options['limit']) url += '?limit=' + options['limit'];
      $.getJSON(url, {}, function(data) {
        var selector = options['div'] + ' tbody';
        data.forEach(function(row) {
          var utc = new Date(row.utc);
          var day = numfmt(utc.getMonth() + 1, 2) + '/' +
                    numfmt(utc.getDate(), 2) + '/' +
                    utc.getFullYear();
          var time = numfmt(utc.getHours(), 2) + ':' +
                     numfmt(utc.getMinutes(), 2);
          // ewwwwww
          var html = '<tr><td>' + day + '</td><td>' + time + '</td><td>' + row.winner + '</td><td>over</td><td>' + row.loser + '</td><td>' + row.winner_goals + '-' + row.loser_goals + '</td></tr>';
          $(selector).append(html);
        });
      });
    },

    scoreboard: function ($, options) {
      $.getJSON('/board', {}, function (data) {
        var selector = options['div'] + ' tr:last';
        data.forEach(function(row) {
          // ewwww
          $(selector).after('<tr><td>' + row.name + '</td><td>' + row.wins + '</td><td>' + row.losses + '</td><td>' + row.pct.toFixed(2) + '</td><td>' + row.goals_for.toFixed(1) + '</td><td>' + row.goals_against.toFixed(1) + '</td></tr>');
        });
      });
    },

    matchups: function ($, options) {
      $.getJSON('/matchups', function (data) {
        var selector = options['div'] + ' tbody';
        data.forEach(function (matchup) {
          summary = summarize(matchup);
          // triple ewwww
          if (summary) {
            $(selector).append('<tr><td>' + summary.first + '</td><td>' + summary.rel + '</td><td>' + summary.second + '</td><td>' + summary.record + '</td></tr>');
          }
        });
      });
    }

  };

}());
