'use strict';

var about = require('../lib/about');
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
var commit = require('../lib/commit');

module.exports = function() {
	return commit()
		.then(function(commit) {
			return about({
				name: 'ft-next-' + normalizeName(packageJson.name),
				commit: commit
			});
		});
};
