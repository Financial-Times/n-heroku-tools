const host = require('../lib/host');
const SmokeTest = require('@financial-times/n-test').SmokeTest;

module.exports = function (program) {
	program
		.command('smoke [app]')
		.option('--auth', 'Authenticate with FT_NEXT_BACKEND_KEY')
		.description('[DEPRECATED - Use n-test directly]. Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
		.action(function (app, opts) {
			const smoke = new SmokeTest({
				host: host.url(app),
				headers: opts.auth ? { 'FT-NEXT-BACKEND-KEY': process.env.FT_NEXT_BACKEND_KEY } : null
			});
			smoke.run();
		});
};
