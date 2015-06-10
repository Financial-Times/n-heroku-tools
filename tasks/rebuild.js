'use strict';

var fetchres = require('fetchres');
var denodeify = require('denodeify');
var fs = require('fs');
var readFile = denodeify(fs.readFile);

var travisToken;

function travisFetch(path, opts) {
	opts = opts || {};
	path = 'https://api.travis-ci.org' + path;
	opts.timeout = opts.timeout || 3000;
	opts.headers = opts.headers || {};
	opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
	opts.headers.Accept = opts.headers.Accept || 'application/vnd.travis-ci.2+json';
	if (travisToken && !opts.headers.Authorization) {
		opts.headers.Authorization = 'token ' + travisToken;
	}
	return fetch(path, opts)
		.then(function(res) {
			var ok = res.ok;
			var status = res.status;
			return res.json()
				.then(function(data) {
					if (ok) {
						return data;
					} else {
						console.log("Response not OK for " + path + ", got: " + status);
						console.log(data);
						throw new Error(status);
					}

				});
		});
}

module.exports = function(options) {
	var apps = options.apps;

	return readFile(process.env.HOME + '/.github_token', { encoding: 'UTF8' })
		.then(function(githubToken) {
			return travisFetch('/auth/github', {
				method: 'POST',
				body: JSON.stringify({ github_token: githubToken })
			});
		})
		.then(function(data) {
			travisToken = data.access_token;

			if (apps.length === 0) {
				return fetch('http://next-registry.ft.com/services')
					.then(fetchres.json)
					.then(function(data) {
						apps = data
							.filter(function(apps) { return apps.versions['1']; })
							.map(function(app) {
								var repo;
								Object.keys(app.versions).forEach(function(version) {
									version = app.versions[version];
									if (/https?:\/\/github\.com\/Financial-Times\//.test(version.repo)) {
										repo = version.repo.replace(/https?:\/\/github\.com\/Financial-Times\//, '');
									}
								});
								return repo;
							})
							.filter(function(repo) { return repo; });
					});
			}
		})
		.then(function() {
			return Promise.all(apps.map(function(app) {
				console.log("Considering whether to rebuild " + app);
				return travisFetch('/repos/Financial-Times/' + app + '/branches/master')
					.then(function(data) {
						if (data.branch.state === 'passed' || data.branch.state === 'failed') {
							console.log("Triggering rebuild of last master build of " + app + " (" + data.commit.author_name + ": " + data.commit.message.replace(/\n/g, " ") + ")");
							return travisFetch('/builds/' + data.branch.id + '/restart', {
								method: 'POST'
							});
						} else {
							console.log("Skipping rebuild of " + app + " because job already exists.");
						}
					})
					.catch(function() {
						console.log("Skipped rebuild of " + app + " probably because Travis CI not set up for this repo");
					});
			}));
		});
};
