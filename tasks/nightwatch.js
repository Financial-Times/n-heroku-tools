/* eslint no-console: 0 */
'use strict';

const path = require('path');
const spawn = require('child_process').spawn;

function toStdOut (data) {
	process.stdout.write(data.toString());
}

function toStdErr (data) {
	process.stderr.write(data.toString());
}

function filterBrowsers (env, broken) {
	if (!broken) {
		return env;
	}

	broken = broken.split(',');

	return env.split(',').filter(browser => {
		if (broken.indexOf(browser) > -1) {
			console.warn(`${browser} is unstable currently - nightwatch tests disabled`);
			return false;
		}
		return true;
	}).join(',');
}


function task (opts) {
	let env = opts.env || process.env.SAUCELABS_BROWSERS || 'default';
	env = filterBrowsers(env, process.env.SAUCELABS_UNSTABLE_BROWSERS);
	if (opts.js) {
		env = filterBrowsers(env, process.env.SAUCELABS_UNSTABLE_BROWSERS_JS);
	}
	const config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');
	const args = ['--env', env, '--config', config];

	for (let opt in opts) {
		if (opts.hasOwnProperty(opt) && opts[opt] && args.indexOf(opts[opt]) === -1) {
			args.push('--' + opt);
			args.push(opts[opt]);
		}
	}

	return new Promise(function (resolve, reject) {
		const nightwatch = spawn('nightwatch', args, {cwd: process.cwd()});
		nightwatch.stdout.on('data', toStdOut);
		nightwatch.stderr.on('data', toStdErr);
		nightwatch.on('error', reject);
		nightwatch.on('close', function (code, signal) {
			if (code === 0) {
				resolve(0);
			} else {
				reject(`nightwatch exited with ${code}, signal ${signal}`);
			}
		});
	});
}

module.exports = function (program, utils) {
	program
		.command('nightwatch [test]')
		.option('-c, --config <config>', 'The location of the nightwatch.json, defaults to Next Build Tools nightwatch.json')
		.option('-e, --env <env>', 'List of browser environments to run on DEPRECATED')
		.option('--retries <retries>', 'Retries failed or errored testcases up to the specified number of times')
		.option('--suiteRetries <suiteRetries>', 'Retries failed or errored testsuites up to the specified number of times')
		.option('-a, --tag <tag>', 'Filter test modules by tags. Only tests that have the specified tags will be loaded')
		.option('--skiptags <skiptags>', 'Skips tests that have the specified tag or tags (comma separated)')
		.option('-g, --group <group>', 'Runs only the specified group of tests (subfolder). Tests are grouped by being placed in the same subfolder')
		.option('-s, --skipgroup <skipgroup>', 'Skip one or several (comma separated) group of tests')
		.option('--no-js', 'Specify the tests are not dependent on javascript running in the browser')
		.option('--reporter <reporter>', 'Specify a custom nightwatch reporter')
		.description('runs nightwatch with some sensible defaults')
		.action(function (test, options) {
			task({
				test: test,
				config: options.config,
				retries: options.retries,
				suiteRetries: options.suiteRetries,
				tag: options.tag,
				env: options.env,
				skiptags: options.skiptags,
				js: options.js,
				group: options.group,
				skipgroup: options.skipgroup,
				reporter: options.reporter
			})
			.catch(utils.exit);
		});
};

module.exports.task = task;
