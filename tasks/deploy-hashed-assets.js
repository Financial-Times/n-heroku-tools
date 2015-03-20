"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var normalizeName = require('../lib/normalize-name');
var readFile = denodeify(require('fs').readFile);
var glob = denodeify(require('glob'));
var crypto = require('crypto');
var basename = require('path').basename;

module.exports = function(app) {
	var token = process.env.GITHUB_AUTH_TOKEN;
	app = app || normalizeName(packageJson.name);
	var authorizedHeaders = {
		'Content-Type': 'application/json',
		'Accept': 'application/vnd.github.v3+json',
		'Authorization': 'token ' + token
	};
	var api = 'https://api.github.com/repos/Financial-Times/next-hashed-assets/contents/';

	return glob(process.cwd() + '/public/*.@(css|js|map)')
		.then(function(files) {
			return Promise.all(files.map(function(file) {
				return readFile(file)
					.then(function(content) {
						return {
							name: basename(file),
							content: content
						};
					});
			}));
		})
		.then(function(files) {
			return Promise.all(files.map(function(file) {
				// PUT /repos/:owner/:repo/contents/:path
				var hash = crypto.createHash('sha1').update(file.content.toString('utf8')).digest('hex');
				file.name = file.name.replace(/(.*)(\.[a-z0-9])/i, '$1-' + hash.substring(0, 8) + '$2');
				console.log(file.name);
				return fetch(api + encodeURIComponent(app + '/' + file.name), {
					method: 'PUT',
					headers: authorizedHeaders,
					body: JSON.stringify({
						message: 'Create ' + file.name + ' for ' + app,
						content: file.content.toString('base64'),
						branch: 'gh-pages',
						committer: {
							name: 'Next Team',
							email: 'next.team@ft.com'
						}
					})
				})
					.then(function(response) {
						if (response.status === 201) {
							console.log('Successfully pushed ' + file.name + ' to GitHub for app' + app);
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
