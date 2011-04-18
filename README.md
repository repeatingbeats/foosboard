This is a foosboard. Prove your dominance.

## The short and sweet developer guide

1. You need node. Figure that part out [here](http://nodejs.org/#download)

2. You probably want to use npm to manage your node packages. Learn about that [here](https://github.com/isaacs/npm)

3. Current required packages are express, mongoose, connect, qs, mime, mongodb, connect-mongodb, jade, async, request, nodeunit, and jake

        npm install <package_name>

4. You need a local mongodb server. More info [here](http://www.mongodb.org/downloads)

5. You need a config JSON with the same keys that are in config/super_secrets.json.example. The actual file needs to be config/super_secrets.json. The production db uri is unimportant for development and test environments. The easiest thing to do locally is:

        cp config/super_secrets.json.example config/super_secrets.json

6. Assuming you have mongo up and running, start the app with:

        node app.js

7. Then go to http://localhost:8090/

8. Run the tests:

        nodeunit test

9. If tests complain about duplicate keys, you probably threw an exception on your previous test that caused the test to abort without cleanup. You'll need to go into the mongodb shell and manually remove the players and results collections from the foosboard-test db. Or you could tell slloyd to fix the tests to catch exceptions and do that.

        $ mongo
        > use foosboard-test
        > db.players.remove({})
        > db.results.remove({})
