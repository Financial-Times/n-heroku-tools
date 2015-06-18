'use strict';

var exec = require('../lib/exec');
var spawn = require('child_process').spawn;
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var downloadDevelopmentKeys = require('./download-development-keys');
var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

function runLocal(opts) {
	return readFile(process.env.HOME + '/.next-development-keys.json', { encoding: 'utf8' })
		.then(function(env) {
			env = JSON.parse(env);
			var port = opts.port;
			return new Promise(function(resolve, reject) {

				// Overwrite any key specified locally
				Object.keys(process.env).forEach(function(key) {
					env[key] = process.env[key];
				});
				env.PORT = port;
				var args = ['server/app.js', '--watch server'];
				if (opts.harmony) {
					args.push('--harmony');
				}
				var local = spawn('nodemon', args, { cwd: process.cwd(), env: env });

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
	return downloadDevelopmentKeys()
		.then(function() {
			var localPort = process.env.PORT || 3002;
			if (opts.local) {
				return runLocal({ port: localPort });
			}
			return Promise.all([ ensureRouterInstall() ])
				.then(function() {

					// Silent update — throw away any errors
					downloadDevelopmentKeys({ update: true });

					return Promise.all([
						runLocal({ port: localPort }),
						runRouter({ port: 5050, localPort: localPort })
					]);
				});
		});
};
