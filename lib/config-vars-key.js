'use strict';

const shellpromise = require('shellpromise');

module.exports = () => {
	return shellpromise('heroku config:get APIKEY --app ft-next-config-vars')
		.then(key => key.trim())
		.catch(() => {
			throw new Error('Cannot get the API key for the config vars service because you need to be added to the ft-next-config-vars service on Heroku with operate permissions.  Do that here - https://docs.google.com/spreadsheets/d/1mbJQYJOgXAH2KfgKUM1Vgxq8FUIrahumb39wzsgStu0 (or ask someone to do it for you).');
		});
};
