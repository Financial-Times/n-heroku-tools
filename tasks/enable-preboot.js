'use strict';

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var enablePreboot = require('../lib/enable-preboot');

module.exports = function(app) {
	var name = app || 'ft-next-' + normalizeName(packageJson.name);

	return herokuAuthToken()
		.then(function(token) {
			return enablePreboot({ app: name, token: token });
		})
		.then(function() {
			console.log('Preboot enabled for ' + name);
		});
};
