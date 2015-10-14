"use strict";

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var deploy = require('haikro/lib/deploy');
var normalizeName = require('../lib/normalize-name');
var enablePreboot = require('../lib/enable-preboot');
var waitForOk = require('../lib/wait-for-ok');
var denodeify = require('denodeify');
var fs = require('fs');
var exists = denodeify(fs.exists, function(exists) { return [undefined, exists]; });
var commit = require('../lib/commit');
var log = require('../lib/log');

module.exports = function(opts) {
	var token;
	var hash;
	var name = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	var salesForceReleaseId;

	return Promise.all([
		herokuAuthToken(),
		commit(),
		exists(process.cwd() + '/.haikro-cache/slug.tgz')
	])
		.then(function(results) {
			token = results[0];
			hash = results[1].trim();
			var hasAbout = results[2];
			if (!hasAbout) {
				throw new Error("/.haikro-cache/slug.tgz must be generated during the build step.  Make sure your app implements `make build-production` that contains all the build steps including `nbt build`");
			}
		})
		.then(function() {
			if (opts.log) {
				var environment = name.indexOf('branch') > -1 ? 'Test': 'Production';
				console.log("Logging this deploy to CMDB");
				return log.open({
					summary: 'Releasing ' + packageJson.name + ' version ' + hash.substring(0, 20) + ' to ' + environment,
					environment: environment,
					name: packageJson.name,
					gateway: opts.logGateway
				})
					.then(function(sfId) {
						salesForceReleaseId = sfId;
					})
					.catch(function(err) {
						console.log("Logging to SalesForce failed!  Check `" + packageJson.name + "` exists in CMDB.  If you've only just created an app try adding `--skip-logging` to `nbt deploy`");
						throw err;
					});
			}
		})
		.then(function() {
			if (opts.skipEnablePreboot) {
				console.log("Skipping enable preboot step");
			} else {
				return enablePreboot({ app: name });
			}
		})
		.then(function() {
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd(),
				commit: hash
			});
		})

		// Start polling
		.then(() => {
			// Always skip gtg if preboot enabled as heroku's implementation of preboot means
			// we are most likley hitting the last successful deploy, not the current one
			if (opts.skipEnablePreboot && !opts.skipGtg) {
				return waitForOk(`http://${name}.herokuapp.com/__gtg`);
			} else {
				console.log("Skipping gtg check. (Note: gtg is always skipped if preboot is turned on to avoid false positives)");
			}
		})
		.then(function() {
			if (opts.log) {
				return log.close(salesForceReleaseId, { gateway: opts.logGateway });
			}
		}, function(err) {
			if (opts.log) {
				return log.close(salesForceReleaseId, { gateway: opts.logGateway, closeCategory: 'Rejected' })
					.then(function() {
						console.log("An error has occurred", err);
						throw err;
					});
			}
			throw err;
		});
};
