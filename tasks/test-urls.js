module.exports = function (program) {
	program
		.command('test-urls [app]')
		.description('Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
		.option('-t, --throttle <n>', 'The maximum number of tests to run concurrently. default: 5')
		.option('-c, --config', 'Path to config file, relative to cwd [default test/smoke]')
		.action(function (app, options) {
			console.warn('test-urls is deprecated. Smoke tests are now carried out as part of the deploy, ship and float tasks. \n To run smoke tests against a local app use e.g. `nht smoke local.ft.com:5050`');
			if (options.configPath) {
				console.warn('Custom config path for test-urls is deprecated. Config must now be held in ./test/smoke.js');
			}
		});
};

module.exports.task = function () {};
