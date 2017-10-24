
'use strict';

const fetchres = require('fetchres');
const keys = require('../lib/keys');
let circleToken;

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/services.json';

function circleFetch (path, opts) {
	opts = opts || {};
	path = 'https://circleci.com/api/v1' + path + '?circle-token=' + circleToken;
	opts.timeout = opts.timeout || 3000;
	opts.headers = opts.headers || {};
	opts.headers['Content-Type'] = opts.headers['Content-Type'] || 'application/json';
	opts.headers.Accept = opts.headers.Accept || 'application/json';
	return fetch(path, opts)
		.then(function (res) {
			let ok = res.ok;
			let status = res.status;
			return res.json()
				.then(function (data) {
					if (ok) {
						return data;
					} else {
						console.log('Response not OK for ' + path + ', got: ' + status); // eslint-disable-line no-console
						console.log(data); // eslint-disable-line no-console
						throw new Error(status);
					}

				});
		});
}

function clearCache (project) {
	return circleFetch('/project/Financial-Times/' + project + '/build-cache', { method: 'DELETE' });
}

function rebuildMasterBuild (project) {
	return circleFetch('/project/Financial-Times/' + project + '/tree/master', { method: 'POST' });
}

function lastMasterBuild (project) {
	return circleFetch('/project/Financial-Times/' + project + '/tree/master');
}

function task (options) {
	let apps = options.apps;
	let registry = options.registry || DEFAULT_REGISTRY_URI;
	let serves = options.serves;
	let allApps = options.all;
	const keyPromise = process.env.CIRCLECI_REBUILD_KEY ? Promise.resolve(process.env.CIRCLECI_REBUILD_KEY) : keys().then(env => env.CIRCLECI_REBUILD_KEY);
	return keyPromise
		.then(token => {
			circleToken = token;
			let appNamesPromise;
			if (apps.length) {
				appNamesPromise = Promise.resolve(apps);
			} else if (allApps) {
				appNamesPromise = fetch(registry)
					.then(fetchres.json)
					.then(function (data) {
						apps = data
							.filter(function (app) {
								if (serves) { return app.serves && app.serves.indexOf(serves) > -1; }
								return true;
							})
							.filter(function (app) { return app.versions['1'] || app.versions['2']; })
							.map(function (app) {
								let repo;
								Object.keys(app.versions).forEach(function (version) {
									version = app.versions[version];
									if (/https?:\/\/github\.com\/Financial-Times\//.test(version.repo)) {
										repo = version.repo.replace(/https?:\/\/github\.com\/Financial-Times\//, '');
										repo = repo.replace(/\/$/, '');
									}
								});
								return repo;
							})
							.filter(function (repo) { return repo; });
					});
			} else {
				console.log('Use the --all flag to rebuild all apps or supply a specific app name.'); // eslint-disable-line no-console
				process.exit(1);
			}
			return appNamesPromise;
		})
		.then(function () {
			return Promise.all(apps.map(function (app) {
				console.log('Considering whether to rebuild ' + app); // eslint-disable-line no-console
				return lastMasterBuild(app)
					.then(function (data) {
						let lastBuild = data[0];
						if (lastBuild.status !== 'running' && lastBuild.status !== 'not_running') {
							console.log(`Clearing cache and triggering rebuild of last master build of ${app} ( ${lastBuild.committer_name}: ${lastBuild.subject ? lastBuild.subject.replace(/\n/g, ' ') : 'No subject'})`); // eslint-disable-line no-console
							return clearCache(app).then(function () {
									rebuildMasterBuild(app);
								});
						} else {
							console.log('Skipping rebuild of ' + app + ' because job already exists.'); // eslint-disable-line no-console
						}
					})
					.catch(function () {
						console.log('Skipped rebuild of ' + app + ' probably because Circle CI not set up for this repo'); // eslint-disable-line no-console
					});
			}));
		});
};

module.exports = function (program, utils) {
	program
		.command('rebuild [apps...]')
		.option('--all', 'Trigger rebuilds of all apps.')
		.option('--registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('--serves <type>', 'Trigger rebuilds of apps where type is served.')
		.description('DEPRECATED.  Will be moved a new home soon.  Trigger a rebuild of the latest master on Circle')
		.action(function (apps, opts) {
			return task({
				apps: apps,
				serves: opts.serves,
				registry: opts.registry,
				all: opts.all
			}).catch(utils.exit);
		});
};

module.exports.task = task;
