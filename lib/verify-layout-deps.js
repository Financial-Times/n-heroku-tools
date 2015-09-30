var fs = require('fs');
var path = require('path');

module.exports = function() {
	return new Promise(function(resolve, reject) {
		var nLayoutPath = path.join(process.cwd(), 'bower_components/n-layout');
		var templatePath = path.join(nLayoutPath, 'templates/wrapper.html');

		console.log('Checking Bower dependencies for n-layout');
		console.log('If this app doesn\'t render any templates call nbt verify with --skip-layout-checks');

		if (!fs.existsSync(templatePath)) {
			reject('n-layout could not be found');
			return;
		}

		var appBowerDeps = require(path.join(process.cwd(), 'bower.json')).dependencies;
		var nLayoutBowerDeps = require(path.join(nLayoutPath, 'bower.json')).dependencies;

		Object.keys(nLayoutBowerDeps).forEach(function(dep) {
			if (appBowerDeps.hasOwnProperty(dep)) {
				reject('n-layout handles ' + dep + ' now so your app doesn\'t have to. Remove ' + dep + ' from your Bower manifest');
			}
		});

		if (appBowerDeps.hasOwnProperty('next-express')) {
			reject('do not try to install next-express as Bower dependency');
		}

		resolve();
	}).then(function() {
		console.log('n-layout bower dependencies OK');
	});

};
