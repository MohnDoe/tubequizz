var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var Ops = require('../operators');

module.exports = {
    crud: {
        read: {
            handler: function(req, res, next) {

            }
        }
    },
    custom: [{
        url: '/i/:clip_video_id',
        method: 'get',
        handler: function(req, res, next) {
            Ops.video.getVideoForClip(req.params.clip_video_id)
                .then(function(video) {
                    res.status(200).json({
                        status: "success",
                        data: {
                            video: video
                        }
                    });

                })
                .catch(function(err) {
                    console.log(err)
                })
        }
    }, {
        url: '/:channel_id',
        method: 'get',
        handler: function(req, res, next) {
            Ops.video.getVideos(req.params.channel_id)
                .then(function(videos) {
                    res.status(200).json({
                        status: "success",
                        data: {
                            videos: videos
                        }
                    });

                })
                .catch(function(err) {
                    console.log(err)
                })
        }
    }, {
        url: '/:channel_id/:level_id',
        method: 'get',
        handler: function(req, res, next) {
            Ops.video.getVideosForLevel(req.params.channel_id, req.params.level_id)
                .then(function(videos) {
                    res.status(200).json({
                        status: "success",
                        data: {
                            videos: videos
                        }
                    });

                })
                .catch(function(err) {
                    console.log(err)
                })
        }
    }]
};