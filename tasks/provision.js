const spawn = require('shellpromise');

const DEFAULT_REGION = 'us';
const DEFAULT_ORG = 'ft-customer-products';

function task (name, { region = DEFAULT_REGION, organisation = DEFAULT_ORG } = {}) {
	return spawn(`heroku create -a ${name} --region ${region} --team ${organisation} --no-remote`, { verbose: true });
};

module.exports = function (program, utils) {
	program
		.command('provision [app]')
		.description('provisions a new instance of an application server')
		.option('-r --region [region]', 'Region to create app in (default: us)', DEFAULT_REGION)
		.option('-o --organisation [org]', 'Specify the organisation to own the created assets', DEFAULT_ORG)
		.action(function (appName, options) {
			if (appName) {
				task(appName, options).catch(utils.exit);
			} else {
				utils.exit('Please provide an app name');
			}
		});
};

module.exports.task = task;
