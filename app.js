
var express = require('express'),
    app = module.exports = express.createServer(),
    mongoose = require('mongoose'),
    mongoStore = require('connect-mongodb'),
    jade = require('jade'),
    fs = require('fs')
;

app.config = JSON.parse(fs.readFileSync(__dirname + '/config/super_secrets.json'));

app.configure('test', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.set('db-uri', 'mongodb://localhost/foosboard-test');
});

app.configure('development', function() {
  app.use(express.errorHandler({
    dumpExceptions: true,
    showStack: true
  }));
  app.set('db-uri', 'mongodb://localhost/foosboard-development');
});

app.configure('production', function() {
  app.use(express.errorHandler());
  app.set('db-uri', app.config.production_db_uri);
});

app.configure(function() {
  app.use(express.logger({
    format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms'
  }));
  app.use(express.cookieParser());
  app.use(express.session({
    store: mongoStore({ url: app.set('db-uri')}),
    secret: app.config.cookie_secret 
  }));
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  mongoose.connect(app.set('db-uri'));
});

// Models
require('./models/player');
require('./models/result');
app.Player = mongoose.model('Player');
app.Result = mongoose.model('Result');

// Routes
require('./routes/all')(app);

if (!module.parent) {
  app.listen(8090);
  console.log("express server listening on port %d, env: %s",
              app.address().port,
              app.settings.env);
}

