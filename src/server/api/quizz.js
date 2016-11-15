var Models = require("../modules/models");
var Config = require("../modules/config");
var Promise = require("bluebird");
var _ = require("lodash");
var QuizzRes = require('../res/q');
var Ops = require('../operators');
module.exports = {
    crud: {
        list: {
            handler: function(req, res, next) {
                Ops.quizz.getQuizzs()
                    .then(function(quizzs) {
                        res.status(200).json({
                            status: 'success',
                            data: {
                                quizzs: quizzs
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
        }
    },
    custom: []
};