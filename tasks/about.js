'use strict';

var about = require('../lib/about');
var packageJson = require(process.cwd() + '/package.json');
var normalizeName = require('../lib/normalize-name');
module.exports = function() {
	return about({
		name: 'ft-next-' + normalizeName(packageJson.name)
	});
};
