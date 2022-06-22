'use strict';

const packageJson = require(process.cwd() + '/package.json');
const findService = require('../lib/find-service');
const herokuAuthToken = require('../lib/heroku-auth-token');
const normalizeName = require('../lib/normalize-name');
const vault = require('../lib/vault');
const pipelines = require('../lib/pipelines');
const HerokuConfigVars = require('../lib/heroku-config-vars');

const FORBIDDEN_ATTACHMENT_VARIABLES = [
	'DATABASE_URL',
	'REDIS_URL',
	'REDIS_TLS_URL'
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

const fetchFromVault = (serviceData) => {
	const path = serviceData.config.replace('https://vault.in.ft.com/v1/', '');

	return Promise.all([path, vault.get()])
		.then(([path, vault]) => {
			return Promise.all([
				vault.read('secret/data/teams/next/shared/production'),
				vault.read(`${path}/production`),
				vault.read(`${path}/shared`)
			]);
		})
		.then(([sharedVars, appVars, appShared]) => {
			// Only include globals the application needs.
			const shared = appShared.data.data.env.reduce((shared, key) => {
				if (key in sharedVars.data.data) {
					shared[key] = sharedVars.data.data[key];
				}

				return shared;
			}, {});

			return Object.assign({}, shared, appVars.data.data);
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
};

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

const getPipelineId = async (pipelineName) => {
	const pipeline = await pipelines.info(pipelineName);
	return pipeline.id;
};

async function task (opts) {
	let source = opts.source || 'ft-next-' + normalizeName(packageJson.name);
	let target = opts.target || source;
	let overrides = {};

	if (opts.overrides) {
		opts.overrides.map(function (o) {
			let t = o.split('=');
			overrides[t[0]] = t[1];
		});
	}

	console.log('Retrieving pipeline details from Heroku...'); // eslint-disable-line no-console

	const authToken = await herokuAuthToken();
	const pipelineId = await getPipelineId(source);

	const herokuConfigVars = new HerokuConfigVars({ target, pipelineId, authToken });

	const serviceData = await getServiceData(source, opts.registry);

	console.log('Retrieving current and desired config vars...'); // eslint-disable-line no-console

	const [ desired, current ] = await Promise.all([
		fetchFromVault(serviceData),
		herokuConfigVars.get()
	]);

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
			console.log(`Adding or updating config var: ${key}`); // eslint-disable-line no-console
		}
	});

	const invalidVariables = Object.keys(patch).filter(prop => patch[prop] === '' || typeof patch[prop] === 'number');
	if (invalidVariables.length > 0) {
		throw new Error(`Variable values cannot be empty strings or numbers, please fix the following variables in the Vault UI: ${invalidVariables.join(', ')}`);
	}

	console.log('Setting config vars', Object.keys(patch)); // eslint-disable-line no-console

	await herokuConfigVars.set(patch);

	console.log(`${target} config vars are set`); // eslint-disable-line no-console
};

module.exports = function (program, utils) {

	program
		.command('configure [source] [target]')
		.description('gets environment variables from Vault and uploads them to the current app')
		.option('-o, --overrides <abc>', 'override these values', utils.list)
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('--vault', 'no-op, please remove this option from your Makefile')
		.action(function (source, target, options) {
			return task({
				source: source,
				target: target,
				overrides: options.overrides,
				splunk: options.splunk,
				registry: options.registry
			}).catch(utils.exit);
		});
};

module.exports.task = task;
