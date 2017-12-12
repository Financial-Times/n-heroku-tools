const log = require('../lib/logger');
const pipelines = require('../lib/pipelines');

const provision = require('./provision');
const destroy = require('./destroy');

const DEFAULT_ORG = 'ft-customer-products';

async function task (pipelineName, { multiregion, organisation = DEFAULT_ORG } = {}){

	let stagingApp = pipelineName + '-staging';
	let euApp = pipelineName + '-eu';
	let usApp = pipelineName + '-us';

	let apps = [stagingApp, euApp];
	if(multiregion){
		apps.push(usApp);
	}

	try {

		log.info(`Creating apps for pipeline (organisation: ${organisation})...`);
		let provisionPromises = [
			provision.task(stagingApp, { organisation }),
			provision.task(euApp, { region: 'eu', organisation })
		];

		if(multiregion){
			provisionPromises.push(provision.task(usApp, { region: 'us', organisation }));
		}

		await Promise.all(provisionPromises);
		log.success('Created apps: %s', apps.join(', '));

		await pipelines.create(pipelineName, { stagingApp, organisation });
		log.success('Created pipeline %s', pipelineName);

		let addAppToPipelinePromises = [
			pipelines.addAppToPipeline(pipelineName, euApp, 'production')
		];
		if(multiregion){
			addAppToPipelinePromises.push(pipelines.addAppToPipeline(pipelineName, usApp, 'production'));
		}

		log.info('Add non-staging apps to pipeline');
		await Promise.all(addAppToPipelinePromises);

		log.success('DRY-DOCK COMPLETE');
		log.art.yacht();

	} catch (error) {
		log.error('Man overboard!', error, error.stack);
		await Promise.all(apps.map(a => destroy.task({app:a})));

		// Log and rethrow
		log.error(error.message);
		throw error;
	}
};

module.exports = function (program, utils) {
	program
		.command('drydock [name]')
		.description('Creates a new pipeline with a staging and EU production app')
		.option('-m, --multiregion', 'Will create an additional app in the US')
		.option('-o, --organisation [org]', 'Specify the organisation to own the created assets', DEFAULT_ORG)
		.action(function (name, options){
			if(!name){
				throw new Error('Please specify a name for the pipeline');
			}
			log.info(`Running drydock task with name: ${name}, org: ${options.organisation}, multiregion: ${options.multiregion}`);
			task(name, options).catch(utils.exit);
		});
};

module.exports.task = task;
