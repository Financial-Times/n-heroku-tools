'use strict';

var spawn = require('child_process').spawn;

module.exports = function(processToRun, options) {
	if (options.verbose) {
		console.log("About to spawn " + processToRun.join(' '));
	}
	return new Promise(function(resolve, reject) {
		var command = processToRun.shift();
		var local = spawn.call(null, command, processToRun);

		function toStdErr(data) {
			console.warn(command + " error: " + data.toString());
		}
		function toStdOut(data) {
			console.log(command + " output: " + data.toString());
		}

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

