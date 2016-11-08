var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('quizz', {
	is_public: {
		type: Sequelize.BOOLEAN,
		defaultValue: false
	},
	num_played: {
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
			Models.quizz.belongsTo(Models.channel);
			Models.quizz.hasMany(Models.level);
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