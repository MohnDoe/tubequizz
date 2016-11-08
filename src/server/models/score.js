var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('score', {
	points: {
		type: Sequelize.INTEGER,
		defaultValue: 0
	}
}, {
	paranoid: true,
	underscored: true,
	hooks: {
		// beforeCreate: function(channel){
		// 	channel.hash_id = this.generateHash(channel.id)
		// }
	},
	classMethods: {
		init: function() {
			Models.score.belongsTo(Models.user);
		},
	},
	instanceMethods: {
		toJSON: function() {
			var values = _.omit(
				this.dataValues, []
			);
			return values;
		}
	}
});