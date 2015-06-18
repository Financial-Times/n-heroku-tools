'use strict';

var herokuAuthToken = require('./heroku-auth-token');
var fetchres = require('fetchres');

module.exports = function(name) {

	return herokuAuthToken()
		.then(function(token) {
			var authorizedPostHeaders = {
				'Accept': 'application/vnd.heroku+json; version=3',
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			};
			return fetch('https://api.heroku.com/apps/ft-next-config-vars/config-vars', { headers: authorizedPostHeaders });
		})
		.then(fetchres.json)
		.then(function(data) {
			return data.APIKEY;
		});
};
