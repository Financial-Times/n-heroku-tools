'use strict';

const co = require('co');
const scale = require('./scale').task;
const configure = require('./configure').task;
const packageJson = require(process.cwd() + '/package.json');
const pipelines = require('../lib/pipelines');
const deploy = require('./deploy').task;
const log = require('../lib/logger');
const normalizeName = require('../lib/normalize-name');

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/v2/';

function task (opts) {

	return co(function* (){

		let appName = normalizeName(packageJson.name);
		let pipelineName = opts.pipeline || packageJson.name;
		log.info('Deploy to ' + pipelineName);
		let apps = yield pipelines.getApps(pipelineName);
		if(!apps.staging){
			throw new Error('No staging app found');
		}

		if(!apps.production.eu){
			throw new Error('No EU production app found');
		}

		if(opts.multiregion && !apps.production.us){
			throw new Error('No US App Found - add --no-multiregion if it does not exist yet');
		}

		log.info('Found apps %j', apps);

		const REGISTRY_URI = opts.registry || DEFAULT_REGISTRY_URI;

		log.log('Using registry: ', REGISTRY_URI);

		if (opts.configure) {
			log.log('Configure enabled');
			let source = pipelineName;
			let configureTasks = [
				configure({
					source: source,
					target: apps.staging,
					registry: REGISTRY_URI
				}),
				configure({
					source: source,
					target: apps.production.eu,
					overrides: ['REGION=EU'],
					registry: REGISTRY_URI
				})
			];
			if (opts.multiregion) {
				configureTasks.push(configure({
					source: source,
					target: apps.production.us,
					overrides: ['REGION=US'],
					registry: REGISTRY_URI
				}));
			}

			log.log('Configure all apps');
			yield Promise.all(configureTasks);
			log.success('configure complete');
		}

		log.info('Scale staging app to 1 dyno');
		yield scale({
			source: appName,
			target: apps.staging,
			minimal: true,
			registry: REGISTRY_URI
		}).catch(function (){
			log.info('Failed to scale up staging app - is this the first run?');
		});

		log.info('Deploy to staging app and run gtg checks');
		yield deploy({ app: apps.staging, authenticatedSmokeTests: true});
		log.success('Deploy successful');

		log.warn('Enabling of preboot is deprecated because Heroku have changed the API and we had already decided to change the approach');

		log.info('Promote slug to production');
		yield pipelines.promote(apps.staging);
		log.success('Slug promoted');
		if(opts.scale){
			log.log('scale enabled');
			let source = appName;
			let scaleTasks = [
				scale({
					source:source,
					target:apps.staging,
					registry: REGISTRY_URI
				}),
				scale({
					source:source,
					target:apps.production.eu,
					registry: REGISTRY_URI
				})
			];
			if(opts.multiregion){
				scaleTasks.push(scale({
					source:source,
					target:apps.production.us,
					registry: REGISTRY_URI
				}));
			}

			log.info('scale production apps');
			yield Promise.all(scaleTasks);
			log.success('scale complete');
		}

		log.info('scale staging app back to 0');
		yield scale({
			source: appName,
			target: apps.staging,
			inhibit: true,
			registry: REGISTRY_URI
		}).catch(() => {
			log.warn('Failed to scale down staging app');
		});

		log.success('Shipped!');
		log.art.ship(appName);
	});
};

module.exports = function (program, utils) {
	program
		.command('ship')
		.description('Ships code.  Deploys using pipelines, also running the configure and scale steps automatically')
		.option('-c --no-configure', 'Skip the configure step')
		.option('-s --no-scale', 'Skip the scale step')
		.option('-p --pipeline [name]', 'The name of the pipeline to deploy to.  Defaults to the app name')
		.option('-r, --registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('-m --multiregion', 'Will expect a US app as well as an EU one')
		.option('--vault', 'no-op, please remove this option from your Makefile')
		.action(function (options){
			task(options).catch(utils.exit);
		});
};

module.exports.task = task;
