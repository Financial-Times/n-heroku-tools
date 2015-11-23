
'use strict';

var log = require('../lib/log');

function task (options) {
	return log.open({
		summary: options.summary,
		environment: options.environment,
		name: options.name,
		gateway: options.gateway
	})
		.then(function(id) {
			return log.close(id, { gateway: options.gateway });
		});
};

module.exports = function (program, utils) {
	program
		.command('log')
		.description('Logs to SalesForce™®©')
		.option('--summary [summary]', 'An Enterprise™ summary of the change')
		.option('--environment [environment]', 'Which Enterprise™ environment was the change in?  ‘Test’ (capital T) or ‘Production’ (capital P)')
		.option('--name [name]', 'Name of Enterprise™ service, e.g. ft-next-front-page')
		.option('--gateway [gateway]', 'Name of Enterprise™ gateway, e.g. ‘mashery’, ‘internal’, ‘konstructor’')
		.action(function(options) {
			task({
				summary: options.summary,
				environment: options.environment,
				name: options.name,
				gateway: options.gateway || 'konstructor'
			}).catch(utils.exit);
		});
};

module.exports.task = task;
