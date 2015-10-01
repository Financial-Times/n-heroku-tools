'use strict';
const co = require('co');
const scale = require('./scale');
const configure = require('./configure');
const packageJson = require(process.cwd() + '/package.json');
const normalizeName = require('../lib/normalize-name');
const pipelines = require('../lib/pipelines');
const deploy = require('./deploy');
const log = require('../lib/logger');

module.exports = function ship(opts){
	return co(function* (){
		let support = yield pipelines.supported();
		if(!support){
			log.error('Heroku pipelines are not enabled on this system');
			return;
		}

		let appName = normalizeName(packageJson.name, { version: false });
		let pipelineName = opts.pipeline || ('ft-next-' + appName);
		log.info('Deploy to ' + pipelineName);
		let apps = yield pipelines.getApps(pipelineName);
		if(!apps.staging){
			log.error('No staging app found');
			return;
		}

		if(!apps.production.eu){
			log.error('No EU production app found');
			return;
		}

		if(opts.multiregion && !apps.production.us){
			log.error('No US App Found - add --no-multiregion if it does not exist yet');
			return;
		}

		log.info('Found apps %j', apps);

		if(opts.configure){
			log.log('Configure enabled');
			let source = pipelineName;
			let configureTasks = [
				configure({source:source, target:apps.staging}),
				configure({source:source, target:apps.production.eu, overrides:['REGION=EU']})
			];
			if(opts.multiregion){
				configureTasks.push(configure({source:source, target:apps.production.us, overrides:['REGION=US']}))
			}

			log.log('Configure all apps');
			yield Promise.all(configureTasks);
			log.success('configure complete');
		}

		log.info('Scale staging app to 1 dyno');
		yield scale({target:apps.staging, scale:'web=1'}).catch(function(){
			log.info('Failed to scale up staging app - is this the first run?')
		});

		log.info('Deploy to staging app and run gtg checks');
		yield deploy({app:apps.staging, skipEnablePreboot:true});
		log.success('Deploy successful');

		log.info('Promote slug to production');
		yield pipelines.promote(apps.staging);
		log.success('Slug promoted');

		if(opts.scale){
			log.log('scale enabled');
			let source = appName;
			let scaleTasks = [
				scale({source:source, target:apps.staging}),
				scale({source:source, target:apps.production.eu})
			];
			if(opts.multiregion){
				scaleTasks.push(scale({source:source, target:apps.production.us}))
			}

			log.info('scale production apps');
			yield Promise.all(scaleTasks);
			log.success('scale complete');
		}

		log.info('scale staging app back to 0');
		yield scale({target:apps.staging, scale:'web=0'});

		log.success('Shipped!');
		log.art.ship();
	});
};
