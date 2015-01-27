'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');

module.exports = function() {
	var name;
	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json'
	};
	return process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token')
		.then(function(token) {
			authorizedPostHeaders.Authorization = 'Bearer ' + token;
		})
		.then(function() {
			name = 'ft-next-' + normalizeName(packageJson.name);
			console.log('Next Build Tools going to set config vars of ' + name);
			return fetch('https://api.heroku.com/apps/ft-next-config-vars/config-vars', { headers: authorizedPostHeaders });
		})
		.then(fetchres.json)
		.then(function(data) {
			return Promise.all([
				fetch('https://ft-next-config-vars.herokuapp.com/app/' + name, { headers: { Authorization: data.APIKEY } }),
				fetch('https://api.heroku.com/apps/' + name + '/config-vars', { headers: authorizedPostHeaders })
			]);
		})
		.then(fetchres.json)
		.catch(function(err) {
			if (err instanceof fetchres.BadServerResponseError) {
				throw new Error("Could not download config vars for " + name + ", check it's set up in ft-next-config-vars and that you have already joined it on Heroku");
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

			Object.keys(patch).forEach(function(key) {
				if (patch[key] === null) {
					console.log("Deleting config var: " + key);
				} else if (patch[key] !== current[key]) {
					console.log("Setting config var: " + key);
				}
			});

			return fetch('https://api.heroku.com/apps/' + name + '/config-vars', {
				headers: authorizedPostHeaders,
				method: 'patch',
				body: JSON.stringify(patch)
			});
		})
		.then(function() {
			console.log(name + " config vars are set");
		});
};
