
'use strict';

var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var configVarsKey = require('../lib/config-vars-key');
var normalizeName = require('../lib/normalize-name');
var vault = require('../lib/vault');
var fetchres = require('fetchres');

function fetchFromNextConfigVars(source, target, key) {
	console.log(`Fetching ${source} config from Next Config Vars for ${target}`);
	const configEnv = process.env.CONFIG_ENV || 'production';
	return fetch(`https://ft-next-config-vars.herokuapp.com/${configEnv}/${source}`, { headers: { Authorization: key } })
		.then(fetchres.json)
		.then(json => {
			if (configEnv === 'continuous-integration') {
				return json.env;
			}
			return json;
		})
		.catch(function (err) {
			if (err instanceof fetchres.BadServerResponseError) {
				if (err.message === 404) {
					throw new Error("Could not download config vars for " + source + ", check it's set up in ft-next-config-vars");
				}
				throw new Error("Could not download config vars for " + source + ", check you have already joined it on Heroku");
			} else {
				throw err;
			}
		});
}

function fetchFromVault(source, target) {
	console.log(`Fetching ${source} config from the vault for ${target}`);

	const path = fetch('https://next-registry.ft.com/v2/')
		.then(fetchres.json)
		.then(json => json.find(app => app.name === normalizeName(source)).config)
		.then(url => url.replace('https://vault.in.ft.com/v1/',''))

	return Promise.all([path, vault.get()])
		.then(([path, vault]) => {
			return Promise.all([
				vault.read(`secret/teams/next/next-globals/production`),
				vault.read(`${path}/production`)
			]);
		})
		.then(([globals, app]) => Object.assign({}, globals.data, app.data));
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

	return Promise.all([
			herokuAuthToken(),
			configVarsKey()
		])
		.then(function (keys) {
			authorizedPostHeaders.Authorization = 'Bearer ' + keys[0];
			return Promise.all([
				opts.vault ? fetchFromVault(source, target) : fetchFromNextConfigVars(source, target, keys[1]),
				fetch('https://api.heroku.com/apps/' + target + '/config-vars', { headers: authorizedPostHeaders })
					.then(fetchres.json)
					.catch(function (err) {
						if (err instanceof fetchres.BadServerResponseError && err.message === 404) {
							throw new Error(source + " app needs to be manually added to heroku before it, or any branches, can be deployed");
						} else {
							throw err;
						}
					})
			]);
		})
		.then(function (data) {
			var desired = data[0];
			var current = data[1];
			desired["___WARNING___"] = "Don't edit config vars manually. Use the Vault or make a PR to next-config-vars";
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
					console.log("Deleting config var: " + key);
				} else if (patch[key] !== current[key]) {
					console.log("Setting config var: " + key);
				}
			});

			console.log("Setting environment keys", Object.keys(patch));

			return fetch('https://api.heroku.com/apps/' + target + '/config-vars', {
				headers: authorizedPostHeaders,
				method: 'patch',
				body: JSON.stringify(patch)
			});
		})
		.then(function () {
			console.log(target + " config vars are set");
		});

};

module.exports = function (program, utils) {

	program
		.command('configure [source] [target]')
		.description('gets environment variables from next-config-vars or the vault and uploads them to the current app')
		.option('-o, --overrides <abc>', 'override these values', utils.list)
		.option('-n, --no-splunk', 'configure not to drain logs to splunk')
		.option('-t, --vault', 'use the vault instead of next-config-vars')
		.action(function (source, target, options) {
			if (!options.splunk) {
				console.log("WARNING: --no-splunk no longer does anything and will be removed in the next version of NBT")
			}
			task({
				source: source,
				target: target,
				overrides: options.overrides,
				splunk: options.splunk,
				vault: !!options.vault
			}).catch(utils.exit);
		});
}

module.exports.task = task;
