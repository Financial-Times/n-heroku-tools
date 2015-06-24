'use strict';

var developmentKeysPath = require('./development-keys-path');
var configVarsKey = require('./config-vars-key');
var fetchres = require('fetchres');
var fs = require('fs');
var denodeify = require('denodeify');
var writeFile = denodeify(fs.writeFile);

module.exports = function(opts) {
	opts = opts || {};
	return configVarsKey()
		.then(function(key) {
			return fetch('https://ft-next-config-vars.herokuapp.com/development', { headers: { Authorization: key } });
		})
		.then(fetchres.json)
		.then(function(data) {
			return writeFile(developmentKeysPath, JSON.stringify(data, undefined, 2));
		})
		.catch(function(err) {
			throw new Error("Could not download development keys from Heroku, make sure you have joined the ft-next-config-vars app and have ‘operate’ permissions");
		});
};
