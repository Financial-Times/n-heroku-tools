'use strict';

var path = require('path');

module.exports = function () {

	return new Promise(function (resolve, reject) {
		var packageJson = require(path.join(process.cwd(), 'package.json'));
		if (packageJson.dependencies && packageJson.dependencies['ft-next-express'] && packageJson.dependencies['next-metrics']) {
			console.error('When using next-express avoid requiring next-metrics as a direct dependency');
			console.error('- it risks duplicating data collection');
			console.error('Use `require(\'ft-next-express\').metrics` instead');
			reject('Don\'t require next-metrics directly!');
		}
		if (packageJson.dependencies && packageJson.dependencies['ft-next-express'] && packageJson.dependencies['next-feature-flags-client']) {
			console.error('When using next-express avoid requiring next-feature-flags-client as a direct dependency');
			console.error('- it risks breaking the application');
			console.error('Use `require(\'ft-next-express\').flags` instead');
			reject('Don\'t require next-feature-flags-client directly!');
		}
		resolve('Npm dependencies ok');
	});

};
