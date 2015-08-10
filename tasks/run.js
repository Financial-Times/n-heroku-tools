'use strict';

var exec = require('../lib/exec');
var spawn = require('child_process').spawn;
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var downloadDevelopmentKeys = require('../lib/download-development-keys');
var keys = require('../lib/keys');
var developmentKeysPath = require('../lib/development-keys-path');
var existsSync = require('fs').existsSync;
var path = require('path');

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

function configureAndSpawn (opts, func) {
	return keys()
		.then(function(env) {
			// Overwrite any key specified locally
			Object.keys(process.env).forEach(function(key) {
				env[key] = process.env[key];
			});

			Object.keys(opts).forEach(function(key) {
				env[key] = opts[key];
			});

			var processToRun = func(env);

			return new Promise(function(resolve, reject) {
				var local = spawn.apply(null, processToRun);

				local.stdout.on('data', toStdOut);
				local.stderr.on('data', toStdErr);
				local.on('error', reject);
				local.on('close', resolve);
			});
		});
}

function runLocal(opts) {
	return configureAndSpawn(opts, function(env) {
		var args = ['server/app.js', '--watch server'];
		if (opts.harmony) {
			args.push('--harmony');
		}
		return ['nodemon', args, { cwd: process.cwd(), env: env }];
	});
}

function runScript(opts) {
	return configureAndSpawn({}, function(env) {
		var args = [path.join(process.cwd(), opts.script)];
		if (opts.harmony) {
			args.push('--harmony');
		}
		return ['node', args, { cwd: process.cwd(), env: env }];
	});
}


function runProcfile() {
	return configureAndSpawn({}, function(env) {
		return ['foreman', ['start'], { cwd: process.cwd(), env: env }];
	});
}

function runRouter(opts) {
	var envVars = {
		DEBUG: 'proxy',
		PORT: opts.PORT
	};

	envVars[normalizeName(packageJson.name, { version: false })] = opts.localPort;
	return configureAndSpawn(envVars, function (env) {
		return ['next-router', { env: env }];
	});
}

function ensureRouterInstall() {
	return exec('which next-router')
		.catch(function(err) { throw new Error('You need to install the next router first!  See docs here: http://git.svc.ft.com/projects/NEXT/repos/router/browse'); });
}

module.exports = function (opts) {
	return (existsSync(developmentKeysPath) ? Promise.resolve() : downloadDevelopmentKeys())
		.then(function() {

			// Silent update — throw away any errors
			downloadDevelopmentKeys();

			var localPort = process.env.PORT || 3002;

			if (opts.local) {
				return runLocal({ PORT: localPort, harmony: opts.harmony });
			} else if (opts.procfile) {
				return runProcfile();
			} else if (opts.script) {
				return runScript({script: opts.script, harmony: opts.harmony});
			} else {
				return ensureRouterInstall()
					.then(function() {
						return Promise.all([
							runLocal({ PORT: localPort, harmony: opts.harmony }),
							runRouter({ PORT: 5050, localPort: localPort, harmony: opts.harmony })
						]);
					});
			}
		});
};
