const smokeTest = require('../lib/smoke-test');

const task = opts => smokeTest.run(opts);

module.exports = function (program, utils) {
	program
		.command('smoke [app]')
		.option('--auth', 'Authenticate with FT_NEXT_BACKEND_KEY')
		.description('Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
		.action(function (app, opts) {
			task({
				authenticated: opts.auth,
				app: app
			}).catch(utils.exit);
		});
};

module.exports.task = task;
