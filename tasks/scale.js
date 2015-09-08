'use strict';

require('array.prototype.find');
var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');
var shellpromise = require('shellpromise');

module.exports = function(opts) {

	var source = opts.source || normalizeName(packageJson.name, { version: false });
	var target = opts.target || packageJson.name;
	var overrides = {};
	var token;

	if (opts.overrides) {
		opts.overrides.map(function (o) {
			var t = o.split('=');
			overrides[t[0]] = t[1];
		});
	}

	function getProcessInfo(serviceData) {
		if (serviceData && serviceData.versions) {
			return serviceData.versions[Object.keys(serviceData.versions).find(function (versionNumber) {
				return serviceData.versions[versionNumber].isPrimary;
			})].processes;
		}
	}

	console.log('Scaling ' + target + ' using service registry information for ' + source);
	return herokuAuthToken()
		.then(function(authToken) {
			token = authToken;
		})
		.then(function() {
			return fetch('https://ft-next-service-registry.herokuapp.com/services');
		})
		.then(fetchres.json)
		.then(function(data) {
			var serviceData = data.filter(function(service) {
				return service.name === source;
			});
			serviceData = serviceData.length ? serviceData[0] : null;

			var processInfo = getProcessInfo(serviceData);

			if (!processInfo) {
				throw new Error("Could not get process info for " + serviceData.name + ". Please check the service registry.");
			}

			var processProfiles = [];

			for (var process in processInfo) {
				if (processInfo.hasOwnProperty(process)) {
					processProfiles.push(process
						+ '=' + (opts.minimal ? 1 : processInfo[process].scale)
						+ ':' + (opts.minimal ? 'standard-1X' : processInfo[process].size));
				}
			}

			return shellpromise('heroku ps:scale ' + processProfiles.join(' ') + ' --app ' + target, { verbose: true });

		})
		.then(function(processProfiles) {
			console.log(target + " config vars are set to", processProfiles);
		})
		.catch(function(err) {
			console.log('Error scaling processes - ' + err);
			console.log("Pro tip: Check that your process names haven't changed");
			throw err;
		});
};
