'use strict';

var exec = require('../lib/exec');
var spawn = require('child_process').spawn;
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

function runLocal(opts) {
	var port = opts.port;
	return new Promise(function(resolve, reject) {
		var env = Object.create(process.env);
		env.PORT = port;
		var local = spawn('nodemon', ['server/app', '--watch server'], { cwd: process.cwd(), env: env });

		local.stdout.on('data', toStdOut);
		local.stderr.on('data', toStdErr);
		local.on('error', reject);
		local.on('close', resolve);
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

module.exports = function(opts) {
	var localPort = process.env.PORT || 3002;
	return Promise.all([ ensureRouterInstall() ])
		.then(function() {
			return Promise.all([
				runLocal({ port: localPort }),
				runRouter({ port: 5050, localPort: localPort })
			]);
		});
};
