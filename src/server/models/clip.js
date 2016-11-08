var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('clip', {
	title: {
		type: Sequelize.STRING,
		allowNull: false
	},
	duration: { // in MS
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 500
	},
	unique_id: {
		type: Sequelize.STRING(14),
		allowNull: false,
		unique: true
	},
	start_time: { // in MS
		type: Sequelize.INTEGER,
		allowNull: false,
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
			Models.clip.belongsTo(Models.video);
			Models.clip.belongsToMany(Models.level, {
				as: 'levels',
				through: 'is_clip'
			});
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