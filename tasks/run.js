'use strict';

var exec = require('../lib/exec');
var spawn = require('child_process').spawn;
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var downloadDevelopmentKeys = require('../lib/download-development-keys');
var keys = require('../lib/keys');
var developmentKeysPath = require('../lib/development-keys-path');
var existsSync = require('fs').existsSync;

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}


function configure(opts) {
	return keys()
		.then(function(env) {

			// Overwrite any key specified locally
			Object.keys(process.env).forEach(function(key) {
				env[key] = process.env[key];
			});
			if (opts.port) {
				env.PORT = opts.port;
			}
			return env;

		});
}

function runLocal(opts) {
	return configure(opts)
		.then(function(env) {

			return new Promise(function(resolve, reject) {
				var args = ['server/app.js', '--watch server'];

				if (opts.harmony) {
					args = ['--harmony'].concat(args);
				}
				if (opts.debug) {
					args = ['--debug'].concat(args);
				}
				var local = spawn('nodemon', args, { cwd: process.cwd(), env: env });

				local.stdout.on('data', toStdOut);
				local.stderr.on('data', toStdErr);
				local.on('error', reject);
				local.on('close', resolve);
			});
		});
}

function runProcfile() {
	return configure({})
		.then(function(env) {

			return new Promise(function(resolve, reject) {

				var local = spawn('foreman', ['start'], { cwd: process.cwd(), env: env });

				local.stdout.on('data', toStdOut);
				local.stderr.on('data', toStdErr);
				local.on('error', reject);
				local.on('close', resolve);
			});
		});
}

function runRouter(opts) {
	var localPort = opts.localPort;
	var port = opts.port;
	return new Promise(function(resolve, reject) {
		var env = Object.create(process.env);
		env.DEBUG = 'proxy';
		env.PORT = port;
		env[normalizeName(packageJson.name, { version: false })] = localPort;
		var router = spawn('next-router', { env: env });

		router.stdout.on('data', toStdOut);
		router.stderr.on('data', toStdErr);
		router.on('error', reject);
		router.on('close', resolve);
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

			var localOpts = opts;
			var localPort = localOpts.port = process.env.PORT || 3002;

			if (opts.local) {
				return runLocal(localOpts);
			}

			if (opts.procfile) {
				return runProcfile();
			}

			return ensureRouterInstall()
				.then(function() {
					return Promise.all([
						runLocal(localOpts),
						runRouter({ port: 5050, localPort: localPort })
					]);
				});
		});
};
