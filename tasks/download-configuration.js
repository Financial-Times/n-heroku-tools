'use strict';

var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');

module.exports = function(app) {
	var name;
	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json'
	};
	return herokuAuthToken()
		.then(function(token) {
			authorizedPostHeaders.Authorization = 'Bearer ' + token;
		})
		.then(function() {
			name = 'ft-next-' + normalizeName(app);
			return fetch('https://api.heroku.com/apps/ft-next-config-vars/config-vars', { headers: authorizedPostHeaders });
		})
		.then(fetchres.json)
		.then(function(data) {
			delete data.___WARNING___;
			process.stdout.write(JSON.stringify(data, null, 2) + "\n");
		});
};
