var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var QuizzRes = require('../res/q');
var Ops = require('../operators');

module.exports = {
    crud: {
        read: {
            handler: function(req, res, next) {
                console.log(req.params);
                console.log(req);
                res.status(200).json(QuizzRes.wankil)
            }
        }
    },
    custom: [{
        url: '/:channel',
        method: 'get',
        handler: function(req, res, next) {
            res.status(200).json({
                data: QuizzRes[req.params.channel].infos
            });
        }
    }, {
        url: '/:channel/:id',
        method: 'get',
        handler: function(req, res, next) {
            //TODO : shuffle clips and limit it
            Ops.level.getLevel(req.params.channel, req.params.id).then(function(level) {
                    res.status(200).json({
                        status: 'success',
                        data: {
                            infos: QuizzRes[req.params.channel].infos,
                            level: level
                        }
                    });
                })
                .catch(function(err) {
                    res.status(400).json({
                        status: 'error',
                        message: err
                    });
                })
        }
    }]
};