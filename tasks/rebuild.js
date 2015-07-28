'use strict';

var fetchres = require('fetchres');
var keys = require('../lib/keys');
var circleToken;

function circleFetch(path, opts) {
	opts = opts || {};
	path = 'https://circleci.com/api/v1' + path + '?circle-token=' + circleToken;
	opts.timeout = opts.timeout || 3000;
	opts.headers = opts.headers || {};
	opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
	opts.headers.Accept = opts.headers.Accept || 'application/json';
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

function clearCache(project) {
	return circleFetch('/project/Financial-Times/' + project + '/build-cache', { method: 'DELETE' });
}

function rebuildMasterBuild(project) {
	return circleFetch('/project/Financial-Times/' + project + '/tree/master', { method: 'POST' });
}

function lastMasterBuild(project) {
	return circleFetch('/project/Financial-Times/' + project + '/tree/master');
}

module.exports = function(options) {
	var apps = options.apps;

	return keys()
		.then(function(env) {
			circleToken = env.CIRCLECI_REBUILD_KEY;
			if (apps.length === 0) {
				return fetch('http://next-registry.ft.com/services')
					.then(fetchres.json)
					.then(function(data) {
						apps = data
							.filter(function(apps) { return apps.versions['1'] || apps.versions['2']; })
							.map(function(app) {
								var repo;
								Object.keys(app.versions).forEach(function(version) {
									version = app.versions[version];
									if (/https?:\/\/github\.com\/Financial-Times\//.test(version.repo)) {
										repo = version.repo.replace(/https?:\/\/github\.com\/Financial-Times\//, '');
										repo = repo.replace(/\/$/, '');
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
				return lastMasterBuild(app)
					.then(function(data) {
						var lastBuild = data[0];
						if (lastBuild.status !== 'running') {
							console.log("Clearing cache and triggering rebuild of last master build of " + app + " (" + lastBuild.committer_name + ": " + lastBuild.subject.replace(/\n/g, " ") + ")");
							return clearCache(app).then(function() {
									rebuildMasterBuild(app);
								});
						} else {
							console.log("Skipping rebuild of " + app + " because job already exists.");
						}
					})
					.catch(function() {
						console.log("Skipped rebuild of " + app + " probably because Circle CI not set up for this repo");
					});
			}));
		});
};
