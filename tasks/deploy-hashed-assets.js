"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var normalizeName = require('../lib/normalize-name');
var readFile = denodeify(require('fs').readFile);
var writeFile = denodeify(require('fs').writeFile);
var glob = denodeify(require('glob'));
var crypto = require('crypto');
var basename = require('path').basename;

function hashAndUpload(opts) {
	var file = opts.file;
	var app = opts.app;
	var token = process.env.GITHUB_AUTH_TOKEN;
	var authorizedHeaders = {
		'Content-Type': 'application/json',
		'Accept': 'application/vnd.github.v3+json',
		'Authorization': 'token ' + token
	};
	var api = 'https://api.github.com/repos/Financial-Times/next-hashed-assets/contents/';
	return fetch(api + encodeURIComponent(app + '/' + file.hashedName), {
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
				console.log('Successfully pushed ' + file.hashedName + ' to GitHub for app ' + app);
			} else {
				return response.json()
					.then(function(err) {
						if (err.message === 'Invalid request.\n\n"sha" wasn\'t supplied.') {
							console.log('Hashed file ' + app + '/' + file.hashedName + ' already exists');
						} else {
							throw new Error(err.message);
						}
					});
			}
		})
		.then(function() {
			return {
				name: file.name,
				hashedName: file.hashedName
			};
		});

}

module.exports = function(app) {
	if (!process.env.GITHUB_AUTH_TOKEN) {
		return Promise.reject("GITHUB_AUTH_TOKEN must be set");
	}
	app = app || normalizeName(packageJson.name, { version: false });

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
			var mapHashName = '';
			return files
				.map(function(file) {
					var hash = crypto.createHash('sha1').update(file.content.toString('utf8')).digest('hex');
					file.hashedName = file.name.replace(/(.*)(\.[a-z0-9])/i, '$1-' + hash.substring(0, 8) + '$2');
					if (file.name === 'main.js.map') {
						mapHashName = file.hashedName;
					}
					return file;
				})
				.map(function(file) {
					var content;
					if (file.name === 'main.js') {
						content = file.content.toString('utf8');
						content = content.replace('/# sourceMappingURL=/' + app + '/' + file.name + '.map', '/# sourceMappingURL=/' + app + '/' + mapHashName);
						file.content = new Buffer(content, 'utf8');
					}
					return file;
				});
		})
		.then(function(files) {
			var promise = files.reduce(function(promise, file) {
					return promise.then(function(obj) {
						return hashAndUpload({ app: app, file: file })
							.then(function(file) {
								obj[file.name] = file.hashedName;
								return obj;
							});
						});
				}, Promise.resolve({}));
			return promise;
		})
		.then(function(hashes) {
			console.log("Writing public/asset-hashes.json");
			return writeFile(process.cwd() + '/public/asset-hashes.json', JSON.stringify(hashes, undefined, 2));
		});
};
