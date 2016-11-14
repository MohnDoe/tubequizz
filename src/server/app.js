var Promise = require('bluebird');
var _ = require('lodash');

// var debugWeb = require('debug')('app:web');
var debugDB = require('debug')('app:db');

var Config = require('./modules/config');

//Probably find another place for this
Promise.config({
	warnings: false
});

// Connect to the databases
var promises = [];

var DB = require('./modules/db');
promises.push(DB.init().then(function() {
	console.log('Connected to PostgreSQL');
	return new Promise(function(resolve, reject) {
		return resolve();
	})
}));

// var Redis = require('./modules/redis');
// promises.push(Redis.init().then(function() {
// 	console.log('Connected to Redis');
// 	return new Promise(function(resolve, reject) {
// 		return resolve();
// 	})
// }));

Promise.all(promises).then(function() {
	debugDB('Connected to Databases');
	// Load and Sync models (return promises);
	var Models = require('./modules/models');
	return Models.init();
}).then(function() {
	console.log('Done');
	var Express = require('express');
	var app = module.exports = Express();
	var BodyParser = require('body-parser');
	var ExpressSession = require('express-session');
	var Compression = require('compression');


	//Configure the app
	app.use(Compression()); //https://github.com/expressjs/compression
	app.use(BodyParser.json()); // for parsing application/json
	app.use(BodyParser.urlencoded({
		extended: true
	})); // for parsing       application/x-www-form-urlencoded



	// console.log("Storing sessiondata in REDIS");
	// var RedisStore = require('connect-redis')(ExpressSession);
	// app.use(ExpressSession({
	// 	store: new RedisStore({
	// 		client: require("./modules/redis").client
	// 	}),
	// 	secret: Config.server.sessionSecret,
	// 	resave: false,
	// 	saveUninitialized: false,
	// }));


	//Start webserver
	var server = module.exports.server = app.listen(Config.server.port, function() {
		console.log("Server listening on port %s", Config.server.port);
	});

	//Authorization module
	require('./modules/auth/index').init();

	//Api endpoints
	// require('./modules/api').init();

	//Normal routing
	require('./modules/routes');

}).catch(function(err) {
	console.log(err);
	console.log(err.message);
});