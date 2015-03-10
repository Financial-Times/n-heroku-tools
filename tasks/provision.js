'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var create = require('haikro/lib/create');
var logger = require('haikro/lib/logger');

// create a Heroku application server
module.exports = function (name) {
	var heroku_auth = process.env.HEROKU_AUTH_TOKEN;

	if (!heroku_auth) {
		throw "You need to set a HEROKU_AUTH_TOKEN environment variables";
	}

	var token;
	return Promise.all([
		process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'),
	])
		.then(function(results) {
			logger.setLevel('debug');
			token = results[0].trim();
			var server = {
				app: name,
				region: 'eu',
				token: token,
				organization: 'financial-times'
			};
			return create(server);
		});
};
