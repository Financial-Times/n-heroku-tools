'use strict';

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');

module.exports = function(opts) {

	var source = opts.source || 'ft-next-' + normalizeName(packageJson.name);
	var target = opts.target || source;
	var overrides = {};

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

	return herokuAuthToken()
		.then(function(token) {
			authorizedPostHeaders.Authorization = 'Bearer ' + token;
		})
		.then(function() {
			console.log('Next Build Tools going to apply ' + source + ' config to ' + target);
			return fetch('https://api.heroku.com/apps/ft-next-config-vars/config-vars', { headers: authorizedPostHeaders });
		})
		.then(fetchres.json)
		.then(function(data) {
			return Promise.all([
				fetch('https://ft-next-config-vars.herokuapp.com/app/' + source, { headers: { Authorization: data.APIKEY } }),
				fetch('https://api.heroku.com/apps/' + source + '/config-vars', { headers: authorizedPostHeaders })
			]);
		})
		.then(fetchres.json)
		.catch(function(err) {
			if (err instanceof fetchres.BadServerResponseError) {
				throw new Error("Could not download config vars for " + source + ", check it's set up in ft-next-config-vars and that you have already joined it on Heroku");
			} else {
				throw err;
			}
		})
		.then(function(data) {
			var desired = data[0];
			var current = data[1];
			var patch = {"___WARNING___": "Don't edit config vars manually. Make PR to git.svc.ft.com/projects/NEXTPRIVATE/repos/config-vars/browse"};

			Object.keys(current).forEach(function(key) {
				patch[key] = null;
			});

			Object.keys(desired).forEach(function(key) {
				patch[key] = desired[key];
			});

			Object.keys(overrides).forEach(function(key) {
				patch[key] = overrides[key];
			});

			Object.keys(patch).forEach(function(key) {
				if (patch[key] === null) {
					console.log("Deleting config var: " + key);
				} else if (patch[key] !== current[key]) {
					console.log("Setting config var: " + key);
				}
			});

			console.log("Setting environment to", patch);

			return fetch('https://api.heroku.com/apps/' + target + '/config-vars', {
				headers: authorizedPostHeaders,
				method: 'patch',
				body: JSON.stringify(patch)
			});
		})
		.then(function() {
			console.log(target + " config vars are set");
		});
};
