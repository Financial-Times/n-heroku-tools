'use strict';

var spawn = require('child_process').spawn;

function toStdErr(data) {
	console.warn(data.toString());
}
function toStdOut(data) {
	console.warn(data.toString());
}

module.exports = function(processToRun, options) {
	if (options.verbose) {
		console.log("About to spawn " + processToRun.join(' '));
	}
	return new Promise(function(resolve, reject) {
		var local = spawn.call(null, processToRun.shift(), processToRun);

		if (options.verbose) {
			local.stdout.on('data', toStdOut);
			local.stderr.on('data', toStdErr);
		}
		local.on('error', reject);
		local.on('close', function(code) {
			if (code === 0) {
				resolve();
			} else {
				if (options.verbose) {
					toStdErr(processToRun.join(' ') + ' exited with exit code ' + code);
				}
				reject();
			}
		});
	});
};

