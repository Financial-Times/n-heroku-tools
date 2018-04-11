'use strict';

let spawn = require('shellpromise');

function task (options) {
	let app = options.app;
	let verbose = options.verbose;

	return spawn('heroku info ' + app, {verbose: true }).then(function () {
		let promise = Promise.resolve();
		if (verbose) {
			promise = promise.then(function () {
				// `|| echo` to stop this failing failing builds
				return spawn('heroku logs -a ' + app + ' || echo', { verbose: true });
			});
		}
		promise = promise.then(function () {
			return spawn('heroku destroy -a ' + app + ' --confirm ' + app, { verbose: true });
		});
		return promise;
	}).catch(function () {
		console.log(app + ' does not exist'); // eslint-disable-line no-console
	});
};

module.exports = function (program, utils) {
	program
		.command('destroy [app]')
		.option('--skip-logs', 'skips trying to output the logs before destroying the app')
		.description('deletes the app from heroku')
		.action(function (app, options) {
			if (app) {
				task({
					app: app,
					verbose: !options.skipLogs
				}).catch(utils.exit);
			} else {
				utils.exit('Please provide an app name');
			}
		});
};

module.exports.task = task;
