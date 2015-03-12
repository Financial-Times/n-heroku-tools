'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var create = require('haikro/lib/create');
var destroy = require('haikro/lib/destroy');
var logger = require('haikro/lib/logger');
var herokuAuthToken = require('../lib/heroku-auth-token');

// create a Heroku application server
module.exports = function(name) {
	var token;

	return herokuAuthToken()
		.then(function(result) {
			logger.setLevel('debug');
			token = result;
			logger.verbose("Hack: Attempt to destroy app if already exists");
			return destroy({
				token: token,
				app: name

			// Suppress any errors
			}).catch(function() {

			});
		})
		.then(function() {
			var server = {
				app: name,
				region: 'eu',
				token: token,
				organization: 'financial-times'
			};
			return create(server);
		});
};
