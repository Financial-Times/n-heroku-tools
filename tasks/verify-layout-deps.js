'use strict';
var semver = require('semver');
var fs = require('fs');
var path = require('path');

module.exports = function() {
	return new Promise(function (resolve, reject) {
		var layoutBowerDeps;

		try {
			layoutBowerDeps = require(path.join(process.cwd(), 'node_modules/ft-next-express/bower.json')).dependencies;
		} catch (e) {
			console.log('No layout bower template dependencies found. Updating ft-next-express recommended');
			resolve();
		}

		Object.keys(layoutBowerDeps).forEach(function (dep) {
			if (!fs.existsSync(path.join(process.cwd(), 'bower_components', dep, '.bower.json'))) {
				reject('This app needs to bower install ' + dep + (layoutBowerDeps[dep] !== '*' ? ('#' + layoutBowerDeps[dep]) : '') + ' in order to render layouts');
			}
			var appSemver = require(path.join(process.cwd(), 'bower_components', dep, '.bower.json')).version;

			if (!semver.satisfies(appSemver, layoutBowerDeps[dep])) {
				reject('This app needs to install a version of ' + dep + ' compatible with the semver ' + layoutBowerDeps[dep] + ' in order to render layouts');
			}
		});

		console.log('Layout bower template dependencies OK');
		resolve();
	});

};
