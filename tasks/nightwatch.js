'use strict';

var path = require('path');
var spawn = require('child_process').spawn;

function toStdOut(data) {
	process.stdout.write(data.toString());
}

function toStdErr(data) {
	process.stderr.write(data.toString());
}

module.exports = function(opts) {
	var test = opts.test;
	var env = opts.env || 'ie10,firefox36,chrome41,iphone7,Android_Nexus7HD';
	var config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');

	return new Promise(function(resolve, reject) {
		var nightwatch = spawn('nightwatch', [
			'--env ' + env,
			'--test ' + test,
			'--config ' + config
		], { cwd: process.cwd() });
		nightwatch.stdout.on('data', toStdOut);
		nightwatch.stderr.on('data', toStdErr);
		nightwatch.on('error', reject);
		nightwatch.on('close', resolve);
	});
};
