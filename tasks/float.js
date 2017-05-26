
'use strict';
const co = require('co');
const provision = require('./provision').task;
const configure = require('./configure').task;
const deploy = require('./deploy').task;
const destroy = require('./destroy').task;
const host = require('../lib/host');
const packageJson = require(process.cwd() + '/package.json');
const log = require('../lib/logger');

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/v2/';

function task (opts) {
	var testAppName;
	return co(function* (){
		let isMaster = host.isMasterBranch();
		if(isMaster){
			log.warn('On master branch');
		}

		if(isMaster && !opts.master){
			log.info('On master branch - don\'t run float.  Use --master option if you want to do this');
			return;
		}


		let appName = opts.app || packageJson.name;
		testAppName = opts.testapp || appName + '-' + host.buildNumber();


		log.info('Creating test app %s', testAppName);
		yield provision(testAppName);
		log.success('Created app %s', testAppName);

		if (opts.configure) {
			log.info('Configure test app');
			yield configure({
				source:appName,
				target:testAppName,
				overrides:['NODE_ENV=branch', `TEST_APP=${testAppName}`, `WEB_CONCURRENCY=1`],
				registry: opts.registry || DEFAULT_REGISTRY_URI,
				vault:!!opts.vault
			});
			log.success('App configured');
		}

		log.info('Deploy to test app and run __gtg checks');
		yield deploy({ app: testAppName, skipGtg: opts.skipGtg });
		log.success('Deployed successfully');

		if(opts.destroy){
			log.info('Destroy test app');
			yield destroy({app:testAppName});
			log.success('Removed Test App');
		}

		log.art.canoe();
		log.success('IT FLOATS!');
	}).catch(function (err) {
		log.error('Man overboard', err);
		if (opts.destroy) {
			return destroy({ app: testAppName, verbose: true })
				.then(function () {
					throw err;
				});
		} else {
			throw err;
		}

	});
};

module.exports = function (program, utils) {
	program
		.command('float')
		.description('Deploys code to a test app and checks it doesn\'t die')
		.option('-a --app', 'Name of the app')
		.option('-c --no-configure', 'Skip the configure step')
		.option('-t --vault', 'Use the vault instead of next-config-vars for any configuration')
		.option('-t --testapp [value]', 'Name of the app to be created')
		.option('-m --master', "Run even if on master branch (not required if using nbt ship).")
		.option('-d --no-destroy', 'Don\'t automatically destroy new apps')
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('-s --skip-gtg', 'skip the good-to-go HTTP check')
		.action(function (options){
			task(options).catch(utils.exit);
		});
};

module.exports.task = task;
