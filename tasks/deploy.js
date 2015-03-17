"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var herokuAuthToken = require('../lib/heroku-auth-token');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var build = require('haikro/lib/build');
var deploy = require('haikro/lib/deploy');
var logger = require('haikro/lib/logger');
var normalizeName = require('../lib/normalize-name');

module.exports = function(app) {
	logger.setLevel('debug');
	var token;
	var commit;
	var name = (app) ? app : 'ft-next-' + normalizeName(packageJson.name);

	return Promise.all([
		herokuAuthToken(),
		exec('git rev-parse HEAD')
	])
		.then(function(results) {
			token = results[0];
			commit = results[1];
			return build({ project: process.cwd() });
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
		.then(function() {
			return new Promise(function(resolve, reject) {
				var timeout;
				var checker;
				function checkGtg() {
					console.log('starting polling: http://' + name + '.herokuapp.com/__gtg');
					fetch('http://' + name + '.herokuapp.com/__gtg')
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
		});
};
