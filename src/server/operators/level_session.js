var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');

var scoreOps = require('./score');


function save_new(level_session) {
	return new Promise(function(resolve, reject) {
		return Models.level_session.create({
				total_points: level_session.total_points,
				questions: level_session.questions
			})
			.then(function(new_level_session) {
				resolve(new_level_session);
			})
			.catch(function(err) {
				reject(err);
			})
	});
}

function check(level_session, answers) {
	return new Promise(function(resolve, reject) {
		return get_level_session(level_session)
			.then(function(_level_session) {
				resolve(_level_session);
			})
			.catch(function(err) {
				reject(err);
			})
	})
}

function get_level_session(level_session) {
	return new Promise(function(resolve, reject) {
		return Models.level_session
			.findOne({
				where: {
					id: level_session.id
				}
			})
			.then(function(_level_session) {
				resolve(_level_session);
			})
			.catch(function(err) {
				reject(err);
			})
	})
}

module.exports = {
	save_new: save_new
}