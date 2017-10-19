'use strict';

let denodeify = require('denodeify');
let readFile = denodeify(require('fs').readFile);
let developmentKeysPath = require('./development-keys-path');
let dotenv = require('dotenv');

module.exports = function () {
	return readFile(developmentKeysPath, { encoding: 'utf8' })
		.then(function (env) {
			return dotenv.parse(env);
		});
};
