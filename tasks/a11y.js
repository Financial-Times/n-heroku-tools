'use strict';

var spawn = require('child_process').spawn;

function task (options) {
	var app = options.app;
	var promise = Promise.resolve();

	promise = promise.then(function () {
		return spawn('pa11y-ci', { verbose: true });
	});
	return promise;
};


module.exports = function (program, utils) {
	program
		.command('pa11y-ci [app]')
		.action(function (app) {
			task({
				app: app
			})
			.catch(utils.exit);
		});
};

module.exports.task = task;
