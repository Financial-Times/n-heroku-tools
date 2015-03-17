'use strict';

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

				// The ‘app not found’ error page is hosted in the US stack
				// and it seems there is a bit of latency between Heroku's
				// US and EU stacks which means if you hit the app's URL
				// before the US is aware of it, the DNS will point to the US
				// and take a *few minutes* to expire and point to the EU.
				// For simplicity, just spin these boxes up in the US.
				region: 'us',
				token: token,
				organization: 'financial-times'
			};
			return create(server);
		});
};
