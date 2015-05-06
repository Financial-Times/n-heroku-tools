'use strict';
var semver = require('semver');
var fs = require('fs');
var path = require('path');

module.exports = function(opts) {
	opts = opts || {};

	return new Promise(function(resolve, reject) {
		var layoutBowerDeps;
		var layout = opts.layout || 'wrapper';

		console.log('Checking bower dependencies for layout ' + layout);

		if (!fs.existsSync(path.join(process.cwd(), 'node_modules/ft-next-express/layouts/', layout + '.html'))) {
			reject('Please specify a valid layout to check template dependencies for');
			return;
		}

		var tpl = fs.readFileSync(path.join(process.cwd(), 'node_modules/ft-next-express/layouts/', layout + '.html'), 'utf8');

		try {
			layoutBowerDeps = require(path.join(process.cwd(), 'node_modules/ft-next-express/bower.json')).dependencies;
		} catch (e) {
			console.warn('No layout bower template dependencies found. Updating ft-next-express recommended');
			resolve();
			return;
		}

		Object.keys(layoutBowerDeps).forEach(function(dep) {

			// test to see if the layout we're using actually references the given bower component
			if (new RegExp('\{\{>\s*' + dep).test(tpl)) {

				// test to see if the bower component is installed
				if (!fs.existsSync(path.join(process.cwd(), 'bower_components', dep, '.bower.json'))) {
					reject('This app needs to bower install ' + dep + (layoutBowerDeps[dep] !== '*' ? ('#' + layoutBowerDeps[dep]) : '') + ' in order to render layouts');
					return;
				}

				// test to see if the component is a compatible version
				var bowerJson = require(path.join(process.cwd(), 'bower_components', dep, '.bower.json'));
				var appSemver = bowerJson.version;
				if (!appSemver) {
					if (bowerJson._resolution.type === 'branch') {
						console.warn('This app is using a non-versioned release of ' + dep);
						console.warn('It\'s ok to do so while experimenting, but longer term try to revert to using a semvered version');
					}
				} else {
					if (!semver.satisfies(appSemver, layoutBowerDeps[dep])) {
						reject('This app needs to install a version of ' + dep + ' compatible with the semver ' + layoutBowerDeps[dep] + ' in order to render layouts');
					}
				}
			}
		});

		resolve();
	}).then(function() {
		console.log('Layout bower template dependencies OK');
	});

};
