var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('video', {
	title: {
		type: Sequelize.STRING(255)
	},
	description: {
		type: Sequelize.TEXT
	},
	published_at: {
		type: Sequelize.DATE
	},
	num_clips: { //cached number of clips linked to this video
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 0
	},
	youtube_id: {
		type: Sequelize.STRING(11),
		unique: true,
		allowNull: false
	},
	unique_id: {
		type: Sequelize.STRING,
		unique: true,
		allowNull: false
	},
	duration: {
		type: Sequelize.INTEGER, //in ms
		defaultValue: 0
	}
}, {
	paranoid: true,
	underscored: true,
	hooks: {},
	classMethods: {
		init: function() {
			Models.video.belongsTo(Models.channel);
			Models.video.hasMany(Models.clip);
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