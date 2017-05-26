'use strict';

const packageJson = require(process.cwd() + '/package.json');
const herokuAuthToken = require('../lib/heroku-auth-token');
const normalizeName = require('../lib/normalize-name');
const fetchres = require('fetchres');
const shellpromise = require('shellpromise');

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/v2/';

function task (opts) {

	var source = opts.source || normalizeName(packageJson.name, { version: false });
	var target = opts.target || packageJson.name;
	var registry = opts.registry || DEFAULT_REGISTRY_URI;
	var overrides = {};

	if(opts.scale){
		return shellpromise('heroku ps:scale ' + opts.scale + ' --app ' + target, { verbose: true });
	}

	if (opts.overrides) {
		opts.overrides.map(function (o) {
			var t = o.split('=');
			overrides[t[0]] = t[1];
		});
	}

	console.log('Scaling ' + target + ' using service registry information for ' + source);
	return herokuAuthToken()
		.then(() => fetch(registry))
		.then(fetchres.json)
		.then(data => {
			const serviceData = data.find(service => service.name === source);
			const processInfo = serviceData.processes;

			if (!processInfo) {
				throw new Error('Could not get process info for ' + serviceData.name + '. Please check the service registry.');
			}

			const processProfiles = Object.keys(processInfo).map(process => {
				let scale = processInfo[process].scale;
				let size = processInfo[process].size;

				if (opts.minimal) {
					scale = 1;
				}

				if (opts.inhibit) {
					scale = 0;
				}

				return `${process}=${scale}:${size}`;
			});

			return shellpromise('heroku ps:scale ' + processProfiles.join(' ') + ' --app ' + target, { verbose: true });

		})
		.then(function (processProfiles) {
			console.log(target + ' config vars are set to', processProfiles);
		})
		.catch(function (err) {
			console.log('Error scaling processes - ' + err);
			console.log('Pro tip: Check that your process names haven\'t changed');
			throw err;
		});
};

module.exports = function (program, utils) {
	program
		.command('scale [source] [target]')
		.description('downloads process information from next-service-registry and scales/sizes the application servers')
		.option('-m, --minimal', 'scales each dyno to a single instance')
		.option('-i, --inhibit', 'scales each dyno down to 0')
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.action(function (source, target, options) {
			task({
				source: source,
				target: target,
				minimal: options.minimal,
				inhibit: options.inhibit,
				registry: options.registry
			}).catch(utils.exit);
		});
};

module.exports.task = task;
