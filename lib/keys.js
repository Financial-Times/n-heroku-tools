"use strict";

var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);
var developmentKeysPath = require('./development-keys-path');

module.exports = function() {
	return readFile(developmentKeysPath, { encoding: 'utf8' })
		.then(function(env) {
			env = JSON.parse(env);
			return env;
		});
};
