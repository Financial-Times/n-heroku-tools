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
const smokeTest = require('@financial-times/n-test').smoke;
const shell = require('shellpromise');

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
			console.log('Next Build Tools going to deploy to ' + name); // eslint-disable-line no-console
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
			// we are most likely hitting the last successful deploy, not the current one
			if (!opts.skipGtg) {
				// Smoke test are now compulsory
				return exists(process.cwd() + '/test/smoke.js')
					.then(hasSmokeConfig => {
						if (!hasSmokeConfig) {
							throw new Error(`Smoke tests, configured using a ./test/smoke.js file, must exist for all apps.
See https://github.com/Financial-Times/n-heroku-tools/blob/master/docs/smoke.md for docs.
If this app has no web process use the --skip-gtg option`);
						}
						return waitForOk(`http://${name}.herokuapp.com/__gtg`)
							.then(() => smokeTest.run({host: name, auth: opts.authenticatedSmokeTests}))
							.catch(err => {
								console.log('/**************** heroku app logs start ****************/'); // eslint-disable-line no-console
								return shell('heroku logs -a ' + name, { verbose: true })
									.then(() => {
										console.log('/**************** heroku app logs end ****************/'); // eslint-disable-line no-console

										// eslint-disable-next-line no-console
										console.log(`\
TIP: To recreate the deployed app locally run the following:
make clean install build-production
tar xf .haikro-cache/slug.tgz -C ../my-app-slug
cp .env ../my-app-slug/app/.env
cd ../my-app-slug/app
npm install @financial-times/n-heroku-tools
nht run
`);
										if(err.urlsTested) {
											throw 'Smoke Tests failed ಠ_ಠ';
										} else {
											throw err;
										}
									});
							});
					});

			} else {
				console.log('Skipping gtg check.'); // eslint-disable-line no-console
			}
		});
};

module.exports = function (program, utils) {
	program
		.command('deploy [app]')
		.description('runs haikro deployment scripts with sensible defaults for Next projects')
		.option('-s, --skip-gtg', 'skip the good-to-go HTTP check')
		.option('-a, --authenticated-moke-tests', 'authenticate smoke tests with a backend authorization key')
		.action(function (app, options) {
			task({
				app: app,

				// Skip GTG check if ‘--skip-gtg’ specified or if doing a production (i.e. no ‘app’ specified)
				// deploy (because preboot will mean that the gtg checks are meaningless)
				skipGtg: options.skipGtg || !app,
				authenticatedSmokeTests: options.authenticatedSmokeTests,
			}).catch(utils.exit);
		});
};

module.exports.task = task;
