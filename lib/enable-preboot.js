'use strict';

var fetchres = require('fetchres');

module.exports = function(opts) {
	var token = opts.token;
	var app = opts.app;
	return fetch('https://api.heroku.com/apps/' + app + '/features/preboot', {
			method: 'PATCH',
			headers: {
				'Accept': 'Accept: application/vnd.heroku+json; version=3',
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			},
			body: JSON.stringify({ enabled: true })
		})
		.then(fetchres.json);
};
