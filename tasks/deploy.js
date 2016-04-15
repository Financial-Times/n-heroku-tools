'use strict';

const packageJson = require(process.cwd() + '/package.json');
const herokuAuthToken = require('../lib/heroku-auth-token');
const deploy = require('haikro/lib/deploy');
const normalizeName = require('../lib/normalize-name');
const waitForOk = require('../lib/wait-for-ok');
const denodeify = require('denodeify');
const fs = require('fs');
const exists = denodeify(fs.exists, function (exists) { return [undefined, exists]; });
const commit = require('../lib/commit');

function task (opts) {
	let token;
	let hash;
	const name = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);

	return Promise.all([
		herokuAuthToken(),
		commit(),
		exists(process.cwd() + '/.haikro-cache/slug.tgz')
	])
		.then(function (results) {
			token = results[0];
			hash = results[1].trim();
			const hasAbout = results[2];
			if (!hasAbout) {
				throw new Error('/.haikro-cache/slug.tgz must be generated during the build step.');
			}
		})
		.then(function () {
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd(),
				commit: hash
			});
		})

		// Start polling
		.then(() => {
			// Always skip gtg if preboot enabled as heroku's implementation of preboot means
			// we are most likley hitting the last successful deploy, not the current one
			if (!opts.skipGtg) {
				return waitForOk(`http://${name}.herokuapp.com/__gtg`);
			} else {
				console.log('Skipping gtg check.');
			}
		});
};

module.exports = function (program, utils) {
	program
		.command('deploy [app]')
		.description('runs haikro deployment scripts with sensible defaults for Next projects')
		.option('-s, --skip-gtg', 'skip the good-to-go HTTP check')
		.option('--gtg-urls <urls>', 'Comma separated list of urls to check before concluding the app is ok (these are in addition to __gtg)', utils.list)
		.action(function (app, options) {
			if (options.gtgUrls) {
				throw 'Configuring gtg urls is now supported in a separate task: nbt test-urls';
			}
			task({
				app: app,
				skipGtg: options.skipGtg,
			}).catch(utils.exit);
		});
}

module.exports.task = task;
