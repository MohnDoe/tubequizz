var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');
var QuizzRes = require('../res/q');


function getClips(channel_id, level_id) {
	return new Promise(function(resolve, reject) {
		if (QuizzRes[channel_id]) {
			if (QuizzRes[channel_id].infos.public) {
				if (QuizzRes[channel_id].levels[level_id - 1]) {
					if (QuizzRes[channel_id].levels[level_id - 1].public) {
						//TODO : get clip's video from Youtube API
						var level = QuizzRes[channel_id].levels[level_id - 1];
						var clips = level.clips;
						clips = _.shuffle(clips);
						var result = [];
						for (var i = 0; i < level.clips_used; i++) {
							result[i] = clips[i];
						}
						resolve(result);
					} else {
						reject('Level is not public.');
					}
				} else {
					reject('Level do not exists.');
				}
			} else {
				reject('Quizz is not public.');
			}
		} else {
			reject('Channel do not exists.');
		}

	})
}

function getLevel(channel_id, level_id) {
	return new Promise(function(resolve, reject) {
		return getClips(channel_id, level_id)
			.then(function(clips) {
				var level = QuizzRes[channel_id].levels[level_id - 1];
				level.clips = clips;
				resolve(level);
			})
			.catch(function(err) {
				reject(err);
			})
	});
}

module.exports = {
	getLevel: getLevel,
	getClips: getClips
}