var developmentKeysPath = require('../lib/development-keys-path');
var downloadDevelopmentKeys = require('../lib/download-development-keys');
var existsSync = require('fs').existsSync;

module.exports = function(opts) {
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
