'use strict';

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var configVarsKey = require('../lib/config-vars-key');
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

	return Promise.all([
			herokuAuthToken(),
			configVarsKey()
		])
		.then(function(keys) {
			authorizedPostHeaders.Authorization = 'Bearer ' + keys[0];
			return Promise.all([
				fetch('https://ft-next-config-vars.herokuapp.com/app/' + source, { headers: { Authorization: keys[1] } }),
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
			desired["___WARNING___"] = "Don't edit config vars manually. Make PR to git.svc.ft.com/projects/NEXTPRIVATE/repos/config-vars/browse";
			var patch = {};

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

			console.log("Setting environment keys", Object.keys(patch));

			return fetch('https://api.heroku.com/apps/' + target + '/config-vars', {
				headers: authorizedPostHeaders,
				method: 'patch',
				body: JSON.stringify(patch)
			});
		})
		.then(function() {
			console.log(target + " config vars are set");
		}).then(function () {
			if (opts.splunk) {
				if (!process.env.SPLUNK_URL) {
					throw 'Either set a SPLUNK_URL environment variable or run `nbt configure --no-splunk`';
				}
				console.log("Setting up logging to splunk");
				return fetch('https://api.heroku.com/apps/' + target + '/log-drains', {
						headers: authorizedPostHeaders,
						method: 'post',
						body: JSON.stringify({
							url: process.env.SPLUNK_URL + target
						})
					})
					.then(function () {
						console.log(target + " logging to splunk");
					});
			}
		});

};
