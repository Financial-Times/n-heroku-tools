'use strict';

var shellpromise = require('shellpromise');

module.exports = function(name) {
	if (process.env.HEROKU_AUTH_TOKEN) {
		return Promise.resolve(process.env.HEROKU_AUTH_TOKEN);
	} else {
		return shellpromise('heroku auth:whoami', { verbose: true })
			.then(function() {
				return shellpromise('heroku auth:token', { verbose: true });
			})
			.then(function(token) {
				return token.trim();
			})
			.catch(function() {
				throw new Error("Please make sure the Heroku CLI is authenticated by running `heroku auth:token`");
			});
	}
};
