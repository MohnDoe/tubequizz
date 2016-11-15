var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');
var QuizzRes = require('../res/q');


function getQuizzs() {
	return new Promise(function(resolve, reject) {
		var result = [];
		_.forEach(QuizzRes, function(value) {
			if (value.infos.public) {
				var quizz = {
					infos: value.infos
				};
				result.push(quizz);
			}
		});
		resolve(result);
	});
}

module.exports = {
	getQuizzs: getQuizzs
}