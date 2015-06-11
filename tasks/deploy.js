"use strict";

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var about = require('../lib/about');
var exec = require('../lib/exec');
var build = require('haikro/lib/build');
var deploy = require('haikro/lib/deploy');
var logger = require('haikro/lib/logger');
var normalizeName = require('../lib/normalize-name');
var enablePreboot = require('../lib/enable-preboot');

module.exports = function(opts) {
	logger.setLevel('debug');
	var token;
	var commit;
	var name = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);

	return Promise.all([
		herokuAuthToken(),
		exec('git rev-parse HEAD')
	])
		.then(function(results) {
			token = results[0];
			commit = results[1].trim();
			return about({ name: name, commit: commit });
		})
		.then(function() {
			return Promise.all([
				build({ project: process.cwd() }),
				enablePreboot({ app: name, token: token })
			]);
		})
		.then(function() {
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd(),
				commit: commit
			});
		})

		// Start polling
		.then(function() {
			if(!opts.skipGtg) {
				return new Promise(function(resolve, reject) {
					var timeout;
					var checker;
					function checkGtg() {
						console.log('polling: http://' + name + '.herokuapp.com/__gtg');
						fetch('http://' + name + '.herokuapp.com/__gtg', {
								timeout: 2000,
								follow: 0
							})
							.then(function(response) {
								if (response.ok) {
									console.log("poll ok");
									clearTimeout(timeout);
									clearInterval(checker);
									resolve();
								} else {
									console.log("poll not ok");
								}
							});
					}
					checker = setInterval(checkGtg, 3000);
					timeout = setTimeout(function() {
						console.log("2 minutes passed, bailing");
						reject(name + '.herokuapp.com/__gtg not responding with an ok response within 2 minutes');
						clearInterval(checker);
					}, 2*60*1000);
				});
			} else {
				console.log("Skipping gtg check");
				return Promise.resolve();
			}
		});
};
