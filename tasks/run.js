'use strict';

var exec = require('../lib/exec');
var spawn = require('child_process').spawn;
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var keys = require('../lib/keys');
var path = require('path');

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

function configureAndSpawn(opts, func) {
	return keys()
		.then(function (env) {
			// Overwrite any key specified locally
			Object.keys(process.env).forEach(function (key) {
				env[key] = process.env[key];
			});

			Object.keys(opts).forEach(function (key) {
				env[key] = opts[key];
			});

			var processToRun = func(env);

			return new Promise(function (resolve, reject) {
				var local = spawn.apply(null, processToRun);

				local.stdout.on('data', toStdOut);
				local.stderr.on('data', toStdErr);
				local.on('error', reject);
				local.on('close', resolve);
			});
		});
}

function runLocal(opts) {
	return configureAndSpawn(opts, function (env) {
		var args = [];

		if(opts.script) {
			args.push(opts.script);
		} else {
			args.push(packageJson.main || 'server/app.js');
		}

		if (opts.harmony) {
			args.push('--harmony');
		}

		if (opts.debug) {
			args.unshift('--debug');
		}

		if(opts.nodemon) {
			args.push('--watch server');

			return ['nodemon', args, { cwd: process.cwd(), env: env }];
		} else {
			return ['node', args, { cwd: process.cwd(), env: env }];
		}

	});
}

function runScript(opts) {

	return configureAndSpawn({}, function (env) {
		var args = [path.join(process.cwd(), opts.script)];
		if (opts.debug) {
			args.push('--debug');
		}
		if (opts.subargs) {
			args = args.concat(opts.subargs.replace(/^\[/, '').replace(/]$/, '').split(','));
		}
		return ['node', args, { cwd: process.cwd(), env: env }];
	});
}


function runProcfile() {
	return configureAndSpawn({}, function (env) {
		return ['foreman', ['start'], { cwd: process.cwd(), env: env }];
	});
}

function runRouter(opts) {
	var envVars = {
		DEBUG: 'proxy',
		REGION: 'us',
		PORT: opts.PORT
	};

	// Only use the cert/key in the arguments if both provided
	// Fallback to defaults if not
	if (opts.https && opts.cert && opts.key) {
		envVars.CERT = opts.cert;
		envVars.CERT_KEY = opts.key;
	}

	envVars[normalizeName(packageJson.name, { version: false })] = opts.localPort;
	return configureAndSpawn(envVars, function (env) {

		var bin = opts.https ? 'next-router-https' : 'next-router';
		return [bin, { env: env }];
	});
}

function ensureRouterInstall() {
	return exec('which next-router')
		.catch(function () { throw new Error('You need to install the next router first!  See docs here: https://github.com/Financial-Times/next-router'); });
}

function task (opts) {
	var localPort = process.env.PORT || 3002;

	if (opts.local) {
		return runLocal({ PORT: localPort, harmony: opts.harmony, debug: opts.debug, script: opts.script, nodemon: opts.nodemon });
	} else if (opts.procfile) {
		return runProcfile();
	} else if (opts.script) {
		return runScript({script: opts.script, harmony: opts.harmony, debug: opts.debug, subargs: opts.subargs});
	} else {
		return ensureRouterInstall()
			.then(function () {
				return Promise.all([
					runLocal({ PORT: localPort, harmony: opts.harmony, debug: opts.debug, nodemon: opts.nodemon }),
					runRouter({ PORT: 5050, localPort: localPort, harmony: opts.harmony, https: opts.https, cert: opts.cert, key: opts.key })
				]);
			});
	}
};

module.exports = function (program, utils) {
	program
		.command('run')
		.description('Runs the local app through the router')
		.option('-l, --local', 'Run the app but don\'t start the router')
		.option('--harmony', 'Runs the local app with harmony')
		.option('--debug', 'Runs the local app with debug flag')
		.option('--procfile', 'Runs all processes specified in the Procfile')
		.option('-s, --script <file>', 'Runs a single javascript file')
		.option('--subargs [subargs]', 'Sub arguments to pass to a single script', /^\[.+]$/)
		.option('--no-nodemon', 'Do not run through nodemon')
		.option('--https', 'Run with HTTPS')
		.option('--cert <file>', 'Specify a certificate to use with HTTPS. Use with --https.')
		.option('--key <file>', 'Specify a certificate key to use with HTTPS. Use with --https.')
		.action(function (opts){
			task(opts).catch(utils.exit);
		});
};

module.exports.task = task;
