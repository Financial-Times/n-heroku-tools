'use strict';

var exec = require('./exec');

module.exports = function(name) {
	return process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token');
};
