var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');


function getLevels(quizz) {

	return new Promise(function(resolve, reject) {
		return getQuizz(quizz)
			.then(function(_quizz) {
				return _quizz.getLevels()
			})
			.then(function(levels) {
				resolve(levels);
			})
			.catch(function(err) {
				reject(err);
			})
	});

}

function getQuizz(quizz) {

	return new Promise(function(resolve, reject) {
		return Models.quizz
			.findOne({
				where: {
					id: quizz.id
				}
			})
			.then(function(_quizz) {
				resolve(_quizz);
			})
			.catch(function(err) {
				reject(err);
			})
	})

}


module.exports = {
	getLevels: getLevels
}