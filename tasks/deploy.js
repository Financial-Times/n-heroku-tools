"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var herokuAuthToken = require('../lib/heroku-auth-token');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var build = require('haikro/lib/build');
var deploy = require('haikro/lib/deploy');
var logger = require('haikro/lib/logger');
var normalizeName = require('../lib/normalize-name');

module.exports = function() {
	logger.setLevel('debug');
	var token;
	var commit;
	return Promise.all([
		herokuAuthToken(),
		exec('git rev-parse HEAD'),
		exec('npm prune --production')
	])
		.then(function(results) {
			token = results[0];
			commit = results[1];
			return build({ project: process.cwd() });
		})
		.then(function() {
			var name = 'ft-next-' + normalizeName(packageJson.name);
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd(),
				commit: commit
			});
		});
};
