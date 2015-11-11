'use strict';
const co = require('co');
const provision = require('./provision');
const log = require('../lib/logger');
const pipelines = require('../lib/pipelines');
const destroy = require('./destroy');

function task (pipelineName, opts){
	var apps = [];

	return co(function* (){
		let support = yield pipelines.supported();
		if(!support){
			throw new Error('Pipelines not installed on this system - run "heroku plugins:install heroku-pipelines"');
		}

		let stagingApp = pipelineName + '-staging';
		apps.push(stagingApp);
		let euApp = pipelineName + '-eu';
		apps.push(euApp);
		if(opts.multiregion){
			var usApp = pipelineName + '-us';
			apps.push(usApp);
		}
		log.info('Creating apps for pipeline...');
		let provisionPromises = [
			provision(stagingApp),
			provision(euApp, 'eu')
		];
		if(opts.multiregion){
			provisionPromises.push(provision(usApp, 'us'));
		}
		yield Promise.all(provisionPromises);
		log.success('Created apps: %s', apps.join(', '));

		log.info('About to create pipeline');
		yield pipelines.create(pipelineName, stagingApp);
		log.success('Created pipeline %s', pipelineName);

		log.info('Add apps to pipeline');
		let promises = [
			pipelines.addAppToPipeline(pipelineName, euApp, 'production')
		];
		if(opts.multiregion){
			promises.push(pipelines.addAppToPipeline(pipelineName, usApp, 'production'));
		}

		yield Promise.all(promises);

		log.success('DRY-DOCK COMPLETE');
		log.art.yacht();
	}).catch(function(err){
		log.error('Man overboard!', err, err.stack);
		let cleanupTasks = apps.map(a => destroy({app:a}));
		return Promise.all(cleanupTasks).then(function(){
			log.error(err.message);
			throw err;
		});
	});
};

module.exports = function (program, utils) {
	program
		.command('drydock [name]')
		.description('Creates a new pipeline with a staging and EU production app')
		.option('-m --multiregion', 'Will create an additional app in the US')
		.action(function(name, options){
			if(!name){
				throw new Error('Please specifiy a name for the pipeline');
			}
			task(name, options).catch(utils.exit);
		});
};
