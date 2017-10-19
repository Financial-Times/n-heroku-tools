'use strict';

var packageJson = require(process.cwd() + '/package.json');
var findService = require('../lib/find-service');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var vault = require('../lib/vault');
var fetchres = require('fetchres');

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/v2/';

const getServiceData = (source, registry) => fetch(registry)
	.then(response => response.json())
	.then(json => {
		const serviceData = findService(json, normalizeName(source));
		if (!serviceData) {
			throw new Error('Could not find a service in the registry, with `name` or `systemCode`, matching ' + source + '. Please check the service registry.');
			return false;
		}
		else {
			return serviceData;
		}
	});

function fetchFromVault (source, target, serviceData) {
	const path = serviceData.config.replace('https://vault.in.ft.com/v1/','');

	return Promise.all([path, vault.get()])
		.then(([path, vault]) => {
			return Promise.all([
				vault.read('secret/teams/next/shared/production'),
				vault.read(`${path}/production`),
				vault.read(`${path}/shared`)
			]);
		})
		.then(([sharedVars, appVars, appShared]) => {
			// Only include globals the application needs.
			const shared = appShared.data.env.reduce((shared, key) => {
				if (key in sharedVars.data) {
					shared[key] = sharedVars.data[key];
				}

				return shared;
			}, {});

			return Object.assign({}, shared, appVars.data);
		});
}

function task (opts) {
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
		.then(function (key) {
			authorizedPostHeaders.Authorization = 'Bearer ' + key;

			return getServiceData(source, opts.registry).then(serviceData => Promise.all([
				fetchFromVault(source, target, serviceData),
				fetch('https://api.heroku.com/apps/' + target + '/config-vars', { headers: authorizedPostHeaders })
					.then(fetchres.json)
					.catch(function (err) {
						if (err instanceof fetchres.BadServerResponseError && err.message === 404) {
							throw new Error(source + ' app needs to be manually added to heroku before it, or any branches, can be deployed');
						} else {
							throw err;
						}
					})
				])
				.then(function (data) {
					var desired = data[0];
					var current = data[1];

					desired['SYSTEM_CODE'] = serviceData.code;

					desired['___WARNING___'] = 'Don\'t edit config vars manually. Use the Vault or make a PR to next-config-vars';
					var patch = {};

					Object.keys(current).forEach(function (key) {
						patch[key] = null;
					});

					Object.keys(desired).forEach(function (key) {
						patch[key] = desired[key];
					});

					Object.keys(overrides).forEach(function (key) {
						patch[key] = overrides[key];
					});

					Object.keys(patch).forEach(function (key) {
						if (patch[key] === null) {
							console.log('Deleting config var: ' + key);
						} else if (patch[key] !== current[key]) {
							console.log('Setting config var: ' + key);
						}
					});

					console.log('Setting environment keys', Object.keys(patch));

					return fetch('https://api.heroku.com/apps/' + target + '/config-vars', {
						headers: authorizedPostHeaders,
						method: 'patch',
						body: JSON.stringify(patch)
					});
				})
				.then(function () {
					console.log(target + ' config vars are set');
				}));
			});
};

module.exports = function (program, utils) {

	program
		.command('configure [source] [target]')
		.description('gets environment variables from Vault and uploads them to the current app')
		.option('-o, --overrides <abc>', 'override these values', utils.list)
		.option('-n, --no-splunk', 'configure not to drain logs to splunk')
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.action(function (source, target, options) {
			if (!options.splunk) {
				console.log('WARNING: --no-splunk no longer does anything and will be removed in the next version of NBT');
			}
			task({
				source: source,
				target: target,
				overrides: options.overrides,
				splunk: options.splunk,
				registry: options.registry
			}).catch(utils.exit);
		});
};

module.exports.task = task;
