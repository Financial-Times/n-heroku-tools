'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');

module.exports = function(app) {
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
			name = 'ft-next-' + normalizeName(app);
			return fetch('https://api.heroku.com/apps/ft-next-config-vars/config-vars', { headers: authorizedPostHeaders });
		})
		.then(fetchres.json)
		.then(function(data) {
			process.stdout.write(JSON.stringify(data, null, 2) + "\n");
		});
};
