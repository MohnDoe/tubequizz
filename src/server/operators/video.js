var Promise = require('bluebird'),
	_ = require('lodash'),
	Sequelize = require('sequelize'),
	jwt = require('jsonwebtoken');
var Models = require("../modules/models");
var Config = require("../modules/config");
var mixpanel = require('../modules/tracking');

var QuizzRes = require('../res/q');

var Google = require('googleapis');
var Youtube = Google.youtube('v3');

var levelOps = require('./level');
// var OAuth2 = Google.auth.OAuth2;
// var oauth2Client = new OAuth2(Config.auth.youtube.clientID, Config.auth.youtube.clientSecret, Config.auth.youtube.callbackURL);

// Google.options({
// 	auth: oauth2Client
// });

function getVideosForClip(channel_id, clip_video_id) {
	return new Promise(function(resolve, reject) {
		if (QuizzRes[channel_id]) {
			Youtube.search.list({
				part: 'snippet',
				type: 'video',
				channelId: QuizzRes[channel_id].infos.channel_youtube_ID,
				auth: Config.auth.youtube.api_key,
				maxResults: 15,
				relatedToVideoId: clip_video_id,
			}, function(err, data) {
				if (err) {
					reject(err);
				}
				var totalVideos = 0;
				var resultVideos = [];
				var wasResolve = false;

				// ONLY VIDEOS FROM THIS CHANNEL
				_.forEach(data.items, function(item) {
					if (item.snippet.channelId == QuizzRes[channel_id].infos.channel_youtube_ID) {
						totalVideos++;
						if (resultVideos.length < 3) {
							resultVideos.push(item);
						}

						if (totalVideos >= 3 && !wasResolve) {
							var videos = {
								clip_video_id: clip_video_id,
								videos: resultVideos
							}
							wasResolve = true;
							resolve(videos);
							return;
						}
					}
				});
			});
		} else {
			reject('Channel does not exists.');
		}
	})
}

function getVideosForLevel(channel_id, level_id) {
	return new Promise(function(resolve, reject) {
		levelOps.getLevel(channel_id, level_id)
			.then(function(level) {

				var videos = {};
				var i = 0;

				_.forEach(level.clips, function(clip) { //TODO : avoid asking for the same clip
					getVideosForClip(channel_id, clip.video_id)
						.then(function(_videos) {
							videos[clip.video_id] = _videos;
							i++;
							if (i >= level.clips.length) {
								resolve(videos);
							}

						})
						.catch(function(err) {
							reject(err);
						})

				});
			})
			.catch(function(err) {
				reject(err);
			})
	})
}

module.exports = {
	getVideosForClip: getVideosForClip,
	getVideosForLevel: getVideosForLevel
}