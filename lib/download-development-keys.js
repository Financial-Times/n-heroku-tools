'use strict';

var developmentKeysPath = require('./development-keys-path');
var configVarsKey = require('./config-vars-key');
var fetchres = require('fetchres');
var denodeify = require('denodeify');
var writeFile = denodeify(require('fs').writeFile);
var packageJson = require(process.cwd() + '/package.json');

function toDotEnvFormat(data) {
	return Object.keys(data).map(function(key) {
			return key + '=' + data[key];
		}).join("\n");
}

module.exports = function(opts) {
	opts = opts || {};
	return configVarsKey()
		.then(function(key) {
			return fetch('https://ft-next-config-vars.herokuapp.com/development/' + packageJson.name, { headers: { Authorization: key } });
		})
		.then(function(res) {
			if (res.status === 404) {
				throw new Error(packageJson.name + " has not had development keys set up in config-vars, please set them up here:"
					+ "\nhttp://git.svc.ft.com:8080/projects/NEXTPRIVATE/repos/config-vars/browse/models/development.json.");
			} else {
				return fetchres.json(res)
					.catch(function(err) {
						throw new Error("Could not download development keys from Heroku, make sure you have joined the ft-next-config-vars app and have ‘operate’ permissions.");
					});
			}
		})
		.then(function(data) {
			return writeFile(developmentKeysPath, toDotEnvFormat(data));
		});
};
