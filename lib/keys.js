"use strict";

var denodeify = require('denodeify');
var readFile = denodeify(require('fs').readFile);
var developmentKeysPath = require('./development-keys-path');
var dotenv = require('dotenv');

module.exports = function() {
	return readFile(developmentKeysPath, { encoding: 'utf8' })
		.then(function(env) {
			return dotenv.parse(env);
		});
};
