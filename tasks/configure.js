'use strict';

let packageJson = require(process.cwd() + '/package.json');
let findService = require('../lib/find-service');
let herokuAuthToken = require('../lib/heroku-auth-token');
let normalizeName = require('../lib/normalize-name');
let vault = require('../lib/vault');
let fetchres = require('fetchres');
let pipelines = require('../lib/pipelines');

const FORBIDDEN_ATTACHMENT_VARIABLES = [
	'DATABASE_URL'
];

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
		})
		.then((vars) => {
			const { TEST_USER_TYPES, TEST_SESSIONS_URL, TEST_SESSIONS_API_KEY } = vars;
			if (!(TEST_USER_TYPES && TEST_SESSIONS_API_KEY && TEST_SESSIONS_URL)) {
				return vars;
			}

			const userTypes = TEST_USER_TYPES.split(',');
			return Promise.all(userTypes.map((type) => fetchSessionToken(type.trim().toLowerCase(), TEST_SESSIONS_URL, TEST_SESSIONS_API_KEY)))
				.then(tokens => {
					return tokens.reduce((accumulator, token) => {
						return Object.assign({}, accumulator, token);
					}, vars);
				})
				.catch((e) => {
					console.log('Couldn\'t fetch the session tokens. Please check TEST_USER_TYPES, TEST_SESSIONS_URL and TEST_SESSIONS_API_KEY environment variables.'); // eslint-disable-line no-console
					console.error(e); // eslint-disable-line no-console
					throw e;
				});
		});
}

const fetchSessionToken = (userType, url, apiKey) => {
	return fetch(`${url}/${userType}?api_key=${apiKey}`)
		.then(response => response.json())
		.then((result) => {
			const tokens = {};
			if (result.FTSession) {
				tokens[`${userType.toUpperCase()}_FTSession`] = result.FTSession;
			}
			if (result.FTSession_s) {
				tokens[`${userType.toUpperCase()}_FTSession_s`] = result.FTSession_s;
			}
			return tokens;
		});
};

const getPipelineId = (pipelineName) => {
	return pipelines.info(pipelineName)
	.then(pipeline => {
		return pipeline.id;
	});
};

const fetchConfigVars = ({ target, herokuToken, pipelineId, options = {} }) => {
	let acceptHeader;
	let url;

	if (target === 'review-app') {
		acceptHeader = 'application/vnd.heroku+json; version=3.pipelines';
		url = `https://api.heroku.com/pipelines/${pipelineId}/stage/review/config-vars`;
	} else {
		acceptHeader = 'application/vnd.heroku+json; version=3';
		url = 'application/vnd.heroku+json; version=3';
	}

	return fetch(url, {
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Bearer ' + herokuToken,
			'Accept': acceptHeader
		},
		...options
	});
};

function task (opts) {
	let source = opts.source || 'ft-next-' + normalizeName(packageJson.name);
	let target = opts.target || source;
	let overrides = {};

	if (opts.overrides) {
		opts.overrides.map(function (o) {
			let t = o.split('=');
			overrides[t[0]] = t[1];
		});
	}

	return Promise.all([
		herokuAuthToken(),
		getPipelineId(source)
	])
		.then(function ([herokuToken, pipelineId]) {

			return getServiceData(source, opts.registry).then(serviceData => Promise.all([
				fetchFromVault(source, target, serviceData),
				fetchConfigVars({ target, herokuToken, pipelineId })
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
					let desired = data[0];
					let current = data[1];

					desired['SYSTEM_CODE'] = serviceData.code;

					desired['___WARNING___'] = 'Don\'t edit config vars manually. Use the Vault UI.';
					let patch = {};

					Object.keys(current).forEach(function (key) {
						if (!key.startsWith('HEROKU_') && !FORBIDDEN_ATTACHMENT_VARIABLES.includes(key)) {
							patch[key] = null;
						}
					});

					Object.keys(desired).forEach(key => {
						if (FORBIDDEN_ATTACHMENT_VARIABLES.includes(key)) {
							throw new Error(`\nCannot set environment variable '${key}' as this variable name is used for an attachment variable by Heroku, `
								+ 'if this is for an external service, please use a different environment variable name in your app\n');
						} else {
							patch[key] = desired[key];
						}
					});

					Object.keys(overrides).forEach(function (key) {
						patch[key] = overrides[key];
					});

					Object.keys(patch).forEach(function (key) {
						if (patch[key] === null) {
							console.log(`Deleting config var: ${key}`); // eslint-disable-line no-console
						} else if (patch[key] !== current[key]) {
							console.log(`Setting config var: ${key}`); // eslint-disable-line no-console
						}
					});

					console.log('Setting environment keys', Object.keys(patch)); // eslint-disable-line no-console

					return fetchConfigVars({ target, herokuToken, pipelineId, options: {
						method: 'patch',
						body: JSON.stringify(patch)
					} });
				})
				.then(response => {
					if (response.status !== 200) return response.json().then(({id, message}) => Promise.reject(new Error(`Heroku Error - id: ${id}, message: ${message}`)));
					console.log(`${target} config vars are set`); // eslint-disable-line no-console
				}));
			});
};

module.exports = function (program, utils) {

	program
		.command('configure [source] [target]')
		.description('gets environment variables from Vault and uploads them to the current app')
		.option('-o, --overrides <abc>', 'override these values', utils.list)
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('--vault', 'no-op, please remove this option from your Makefile')
		.action(function (source, target, options) {
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
