const host = require('../lib/host');
const waitForOk = require('../lib/wait-for-ok');

module.exports = function (program, utils) {
	program
		.command('gtg [app]')
		.description('Runs gtg checks for an app')
		.action(async (app) => {
			const url = `${host.url(app)}/__gtg`;
		
			try {
				return await waitForOk(url);
			} catch (err) {
				utils.exit(err);
			}
		});
};
