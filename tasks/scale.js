'use strict';

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');
// var scale = require('haikro/lib/scale');

module.exports = function(opts) {

	var source = opts.source || normalizeName(packageJson.name, { version: false });
	var target = opts.target || source;
	var overrides = {};
	var token;

	if (opts.overrides) {
		opts.overrides.map(function (o) {
			var t = o.split('=');
			overrides[t[0]] = t[1];
		});
	}

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json'
	};

	function getProcessInfo(serviceData) {
		return serviceData &&
			serviceData.versions &&
			serviceData.versions[Object.keys(serviceData.versions).length.toString()] &&
			serviceData.versions[Object.keys(serviceData.versions).length.toString()].processes;
	}

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

			if(!processInfo) {
				throw new Error("Could not get process info for " + serviceData.name + ". Please check the service registry.");
			}
			var processProfiles = {
				updates: []
			};

			for( var process in processInfo ) {
				if(processInfo.hasOwnProperty(process)) {
					processProfiles.updates.push({
						process: process,
						size: processInfo[process].size,
						quantity: processInfo[process].scale
					});
				};
			}

			// scale({
			// 	token: token,
			// 	app: normalizeName(packageJson.name),
			// 	processProfiles: {
			// 		updates: [

			// 		]
			// 	}
			// })


			// desired["___WARNING___"] = "Don't edit config vars manually. Make PR to git.svc.ft.com/projects/NEXTPRIVATE/repos/config-vars/browse";
			// var patch = {};

			// Object.keys(current).forEach(function(key) {
			// 	patch[key] = null;
			// });

			// Object.keys(desired).forEach(function(key) {
			// 	patch[key] = desired[key];
			// });

			// Object.keys(overrides).forEach(function(key) {
			// 	patch[key] = overrides[key];
			// });

			// Object.keys(patch).forEach(function(key) {
			// 	if (patch[key] === null) {
			// 		console.log("Deleting config var: " + key);
			// 	} else if (patch[key] !== current[key]) {
			// 		console.log("Setting config var: " + key);
			// 	}
			// });

			// console.log("Setting environment keys", Object.keys(patch));

			// return fetch('https://api.heroku.com/apps/' + target + '/config-vars', {
			// 	headers: authorizedPostHeaders,
			// 	method: 'patch',
			// 	body: JSON.stringify(patch)
			// });
		})
		.then(function() {
			console.log(target + " config vars are set");
		});
};
