const smokeTest = require('../lib/smoke-test');

const task = opts => smokeTest.run(opts);

module.exports = function (program, utils) {
	program
		.command('smoke [app]')
		.description('Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
		.action(function (app, options) {
			task({
				app: app
			})
		});
};

module.exports.task = task;
