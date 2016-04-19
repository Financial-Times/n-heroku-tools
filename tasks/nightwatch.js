
'use strict';

var path = require('path');
var spawn = require('child_process').spawn;

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

function task (opts) {
	var test = opts.test;
	var env = opts.env || 'ie9,ie10,ie11,firefox38,firefox39,chrome42,chrome43,iphone6_plus,Android_Nexus7HD';
	var config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');

	var args = [ '--env', env, '--test', test, '--config', config ];

	if (opts.retries) {
		args.push('--retries');
		args.push(opts.retries);
	}
	if (opts.suiteRetries) {
		args.push('--suiteRetries');
		args.push(opts.suiteRetries);
	}

	return new Promise(function (resolve, reject) {
		var nightwatch = spawn('nightwatch', args, { cwd: process.cwd() });
		nightwatch.stdout.on('data', toStdOut);
		nightwatch.stderr.on('data', toStdErr);
		nightwatch.on('error', reject);
		nightwatch.on('close', function (code, signal) {
			if (code === 0) {
				resolve(0);
			} else {
				reject("nightwatch exited with " + code + ', signal ' + signal);
			}
		});
	});
};

module.exports = function (program, utils) {
	program
		.command('nightwatch [test]')
		.option('-c, --config <config>', 'The location of the nightwatch.json, defaults to Next Build Tools nightwatch.json')
		.option('-e, --env <env>', 'The location of the nightwatch.json, defaults to Next Build Tools defined environments')
		.option('--retries <retries>', 'Retries failed or errored testcases up to the specified number of times')
		.option('--suiteRetries <suiteRetries>', 'Retries failed or errored testsuites up to the specified number of times')
		.description('runs nightwatch with some sensible defaults')
		.action(function (test, options) {
			task({
				test: test,
				env: options.env,
				config: options.config

			})
				.catch(utils.exit);
		});
};

module.exports.task = task;
