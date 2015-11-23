
'use strict';

var developmentKeysPath = require('../lib/development-keys-path');
var downloadDevelopmentKeys = require('../lib/download-development-keys');
var existsSync = require('fs').existsSync;

function task (opts) {
	opts = opts || {};
	if (existsSync(developmentKeysPath) && !opts.update) {
		console.log(developmentKeysPath + " already exists so not attempting to download & overwrite.  Re-run with `--update` to force an update");
		return Promise.resolve();
	}
	return downloadDevelopmentKeys()
		.then(function() {
			console.log("Writing development keys to " + developmentKeysPath);
		});
};

module.exports = function (program, utils) {

	program
		.command('download-development-keys')
		.description('downloads development environment variables from next-config-vars and stores them in your home directory if a file doesn\'t already exist')
		.option('--update', 'overwrites the keys files in your home directory')
		.action(function(opts) {
			task({ update: opts.update })
				.catch(utils.exit);
		});

};

module.exports.task = task;
