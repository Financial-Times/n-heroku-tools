"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var normalizeName = require('../lib/normalize-name');
var fs = require('fs');
var readdir = denodeify(fs.readdir);
var readFile = denodeify(fs.readFile);
var https = require('https');
// HACK — try to stop more than one request hit GitHub at a time
https.agent.maxSockets = 1;

module.exports = function(app) {
	var token = process.env.GITHUB_AUTH_TOKEN;
	app = app || normalizeName(packageJson.name);
	var authorizedHeaders = {
		'Content-Type': 'application/json',
		'Accept': 'application/vnd.github.v3+json',
		'Authorization': 'token ' + token
	};
	var api = 'https://api.github.com/repos/Financial-Times/next-hashed-assets/contents/';
	var dir = process.cwd() + '/hashed-assets';

	return readdir(dir)
		.then(function(files) {
			return Promise.all(files.map(function(file) {
				return readFile(dir + '/' + file, { encoding: 'base64' })
					.then(function(content) {
						return {
							name: file,
							content: content
						};
					});
			}));
		})
		.then(function(files) {
			return Promise.all(files.map(function(file) {
				// PUT /repos/:owner/:repo/contents/:path
				return fetch(api + encodeURIComponent(app + '/' + file.name), {
					method: 'PUT',
					headers: authorizedHeaders,
					body: JSON.stringify({
						path: 'test.txt',
						message: 'Create ' + file.name + ' for ' + app,
						content: file.content,
						branch: 'gh-pages',
						committer: {
							name: 'Next Team',
							email: 'next.team@ft.com'
						}
					})
				})
					.then(function(response) {
						if (response.status === 201) {
							console.log('Successfully pushed ' + file.name + ' to GitHub');
						} else {
							return response.json()
								.then(function(err) {
									if (err.message === 'Invalid request.\n\n"sha" wasn\'t supplied.') {
										console.log('Hashed file ' + file.name + ' already exists');
									} else {
										throw new Error(err.message);
									}
								});
						}
					});
			}));
		});
};
