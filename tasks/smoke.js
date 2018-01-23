const nTest = require('@financial-times/n-test');
const task = opts => nTest.smoke.run(opts);

module.exports = function (program) {
	program
		.command('smoke [app]')
		.option('--auth', 'Authenticate with FT_NEXT_BACKEND_KEY')
		.description('[DEPRECATED - Use n-test directly]. Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
		.action(function (app, opts) {
			task({
				host: app,
				authenticate: opts.auth
			});
		});
};

module.exports.task = task;
