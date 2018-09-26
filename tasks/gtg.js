const host = require('../lib/host');
const waitForOk = require('../lib/wait-for-ok');

module.exports = function (program) {
	program
		.command('gtg [app]')
		.description('Runs gtg checks for an app')
		.action(function (app) {
			const url = `${host.url(app)}/__gtg`;
			return waitForOk(url);
		});
};
