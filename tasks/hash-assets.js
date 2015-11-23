
'use strict';

module.exports = function (program, utils) {
	program
		.command('hash-assets')
		.description('Generates an asset-hashes.json file')
		.action(() => {
			const generateAssetHashesJson = require('../lib/hash-assets');
			generateAssetHashesJson().catch(utils.exit);
		});
};
