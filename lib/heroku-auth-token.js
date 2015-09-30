var shellpromise = require('shellpromise');

module.exports = function() {
	if (process.env.HEROKU_AUTH_TOKEN) {
		return Promise.resolve(process.env.HEROKU_AUTH_TOKEN);
	} else {
		return shellpromise('heroku auth:whoami 2>/dev/null')
			.then(function() {
				return shellpromise('heroku auth:token 2>/dev/null');
			})
			.then(function(token) {
				return token.trim();
			})
			.catch(function() {
				throw new Error("Please make sure the Heroku CLI is authenticated by running `heroku auth:token`");
			});
	}
};
