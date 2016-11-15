var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var QuizzRes = require('../res/q');

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
            res.status(200).json({
                data: {
                    infos: QuizzRes[req.params.channel].infos,
                    level: QuizzRes[req.params.channel].levels[req.params.id - 1]
                }
            });
        }
    }]
};