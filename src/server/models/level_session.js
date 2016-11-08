var _ = require('lodash'),
	Sequelize = require('sequelize'),
	Promise = require('bluebird');

var DB = require('../modules/db').instance;
var Config = require('../modules/config');
var Models = require('../modules/models');

module.exports = DB.define('level_session', {
	unique_id: {
		type: Sequelize.STRING,
		unique: true,
		allowNull: false
	},
	total_points: {
		type: Sequelize.INTEGER,
		defaultValue: 0
	},
	questions: {
		type: Sequelize.JSON
	},
	responses: {
		type: Sequelize.JSON
	}
}, {
	paranoid: true,
	underscored: true,
	hooks: {

	},
	classMethods: {
		init: function() {
			Models.level_session.belongsTo(Models.user);
			Models.level_session.belongsTo(Models.level);
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