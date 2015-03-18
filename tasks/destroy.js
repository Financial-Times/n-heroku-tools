"use strict";

var destroy = require('haikro/lib/destroy');
var herokuAuthToken = require('../lib/heroku-auth-token');
var logger = require('haikro/lib/logger');

module.exports = function(app) {
	logger.setLevel('debug');
	return herokuAuthToken()
		.then(function(token) {
			return destroy({
				app: app,
				token: token
			});
		});
};
