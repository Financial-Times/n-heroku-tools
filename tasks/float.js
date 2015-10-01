'use strict';
const co = require('co');
const provision = require('./provision');
const configure = require('./configure');
const deploy = require('./deploy');
const destroy = require('./destroy');
const host = require('../lib/host');
const packageJson = require(process.cwd() + '/package.json');
const log = require('../lib/logger');


module.exports = function(opts){
	var testAppName;
	return co(function* (){
		let isMaster = host.isMasterBranch();
		if(isMaster){
			log.warn('On master branch');
		}

		if(isMaster && !opts.master){
			log.info('On master branch and skipmaster is true - don\'t run float');
			return;
		}


		let appName = opts.app || packageJson.name;
		testAppName =  opts.testapp || appName + '-' + host.buildNumber();


		log.info('Creating test app');
		yield provision(testAppName);
		log.success('Created app %s', testAppName);

		log.info('Configure test app');
		yield configure({source:appName, target:testAppName, overrides:['NODE_ENV=branch']});
		log.success('App configured');

		log.info('Deploy to test app and run __gtg checks');
		yield deploy({app:testAppName, skipEnablePreboot:true});
		log.success('Deployed successfully');

		log.info('Destroy test app');
		yield destroy({app:testAppName});
		log.success('Removed Test App');

		log.art.canoe();
		log.success('IT FLOATS!');
	}).catch(function(err){
		log.error('Man overboard', err);
		return destroy({app:testAppName, verbose:true}).then(function(){
			throw err;
		});
	});
};
