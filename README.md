This is a foosboard. Prove your dominance.

## The short and sweet developer guide

1. You need node. Figure that part out [here](http://nodejs.org/#download)

2. You probably want to use npm to manage your node packages. Learn about that [here](https://github.com/isaacs/npm)

3. Current required packages are express, mongoose, connect-mongodb, jade, async, and nodeunit
        npm install <package_name>

4. You need a local mongodb server. More info [here](http://www.mongodb.org/downloads)

5. You need a config JSON with the same keys that are in config/super_secrets.json.example. The actual file needs to be config/super_secrets.json. Ther production db uri is unimportant for development and test environments.

6. Assuming you have mongo up and running, start the app with:
        node app.js

7. Then go to http://localhost:8090/

8. Run the tests:
        nodeunit test
