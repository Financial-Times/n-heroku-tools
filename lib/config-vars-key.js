var herokuAuthToken = require('./heroku-auth-token');
var fetchres = require('fetchres');

module.exports = function() {

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
		})
		.catch(function(err) {
			if (err.name === fetchres.BadServerResponseError.name) {
				throw new Error("Cannot get the API key for the config vars service because you need to be added to the ft-next-config-vars service on Heroku with operate permissions");
			} else {
				throw err;
			}
		});
};
