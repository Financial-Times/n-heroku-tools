
'use strict';

let spawn = require('shellpromise');

function task (name, region) {
	if (typeof region === 'undefined'){
		region = 'us';
	}
	return spawn('heroku create -a ' + name + ' --region ' + region + ' --org financial-times --no-remote', { verbose: true });
};

module.exports = function (program, utils) {
	program
		.command('provision [app]')
		.description('provisions a new instance of an application server')
		.action(function (app) {
			if (app) {
				task(app).catch(utils.exit);
			} else {
				utils.exit('Please provide an app name');
			}
		});
};

module.exports.task = task;
