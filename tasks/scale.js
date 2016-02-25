
'use strict';

require('array.prototype.find');
var packageJson = require(process.cwd() + '/package.json');
var herokuAuthToken = require('../lib/heroku-auth-token');
var normalizeName = require('../lib/normalize-name');
var fetchres = require('fetchres');
var shellpromise = require('shellpromise');

function task (opts) {

	var source = opts.source || normalizeName(packageJson.name, { version: false });
	var target = opts.target || packageJson.name;
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
		.then(() => fetch('https://next-registry.ft.com/v2'))
		.then(fetchres.json)
		.then(data => {
			const serviceData = data.filter(service => service.name === source);
			const processInfo = serviceData.processes;

			if (!processInfo) {
				throw new Error('Could not get process info for ' + serviceData.name + '. Please check the service registry.');
			}

			const processProfiles = Object.keys(processInfo).map(process => {
					return '=' + (opts.minimal ? 1 : process.scale)
						+ ':' + (opts.minimal ? 'standard-1X' : process.size);
				});

			return shellpromise('heroku ps:scale ' + processProfiles.join(' ') + ' --app ' + target, { verbose: true });

		})
		.then(function(processProfiles) {
			console.log(target + ' config vars are set to', processProfiles);
		})
		.catch(function(err) {
			console.log('Error scaling processes - ' + err);
			console.log('Pro tip: Check that your process names haven\'t changed');
			throw err;
		});
};

module.exports = function (program, utils) {
	program
		.command('scale [source] [target]')
		.description('downloads process information from next-service-registry and scales/sizes the application servers')
		.option('-m, --minimal', 'scales each dyno to a single instance (useful for provisioning a test app)')
		.action(function(source, target, options) {
			task({
				source: source,
				target: target,
				minimal: options.minimal
			}).catch(utils.exit);
		});
};

module.exports.task = task;
