var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('level', {
	title: {
		type: Sequelize.STRING
	},
	unique_id: {
		type: Sequelize.STRING(14),
		allowNull: false,
		unique: true
	},
	num_played: {
		type: Sequelize.INTEGER,
		defaultValue: 0
	},
	difficulty: {
		type: Sequelize.INTEGER,
		defaultValue: 0,
	},
	difficulty_bonus: {
		type: Sequelize.FLOAT,
		defaultValue: 1
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
			Models.level.belongsToMany(Models.clip, {
				as: 'clips',
				through: 'is_clip'
			});
			Models.level.belongsTo(Models.quizz);
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