'use strict';
const co = require('co');
const provision = require('./provision');
const configure = require('./configure');
const deploy = require('./deploy');
const destroy = require('./destroy');
const host = require('../lib/host');
const packageJson = require(process.cwd() + '/package.json');
const log = require('../lib/logger');


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

		log.info('Configure test app');
		yield configure({source:appName, target:testAppName, overrides:['NODE_ENV=branch']});
		log.success('App configured');

		log.info('Deploy to test app and run __gtg checks');
		yield deploy({app:testAppName, skipEnablePreboot:true});
		log.success('Deployed successfully');

		if(opts.destroy){
			log.info('Destroy test app');
			yield destroy({app:testAppName});
			log.success('Removed Test App');
		}

		log.art.canoe();
		log.success('IT FLOATS!');
	}).catch(function(err){
		log.error('Man overboard', err);
		if(opts.destroy){
			return destroy({app:testAppName, verbose:true}).then(function(){
				throw err;
			});
		}else{
			return Promise.resolve(null);
		}

	});
};

module.exports = function (program, utils) {
	program
		.command('float')
		.description('Deploys code to a test app and checks it doesn\'t die')
		.option('-a --app', 'Name of the app')
		.option('-t --testapp [value]', 'Name of the app to be created')
		.option('-m --master', "Run even if on master branch (not required if using nbt ship).")
		.option('-d, --no-destroy', 'Don\'t automatically destroy new apps')
		.action(function(options){
			task(options).catch(utils.exit);
		});
};
