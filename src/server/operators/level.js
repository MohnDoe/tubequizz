var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');


function generate(level) {
	return new Promise(function(resolve, reject) {
		return getLevel(level)
			.then(function(_level) {
				return _level.getClips({
					order: [
						[Sequelize.fn('RANDOM')]
					],
					limit: 5
				});
			})
			.then(function(clips) {
				resolve(clips);
			})
			.catch(function(err) {
				reject(err);
			})
	});
}

function getLevel(level) {
	return new Promise(function(resolve, reject) {
		return Models.level
			.findOne({
				where: {
					id: level.id
				}
			})
			.then(function(_level) {
				resolve(_level);
			})
			.catch(function(err) {
				reject(err);
			})
	})
}

module.exports = {
	generate: generate
}