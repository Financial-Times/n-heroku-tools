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
	var env = opts.env || 'ie9,ie10,ie11,firefox38,firefox39,chrome42,chrome43,iphone6_plus,Android_Nexus7HD';
	var config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');
	var args = [ '--env', env, '--test', test, '--config', config ];

	return new Promise(function(resolve, reject) {
		var nightwatch = spawn('nightwatch', args, { cwd: process.cwd() });
		nightwatch.stdout.on('data', toStdOut);
		nightwatch.stderr.on('data', toStdErr);
		nightwatch.on('error', reject);
		nightwatch.on('close', function(code, signal) {
			if (code === 0) {
				resolve(0);
			} else {
				reject("nightwatch exited with " + code + ', signal ' + signal);
			}
		});
	});
};
