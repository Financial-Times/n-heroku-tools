'use strict';

var configVarsKey = require('../lib/config-vars-key');
var fetchres = require('fetchres');
var fs = require('fs');
var writeFileSync = fs.writeFileSync;
var existsSync = fs.existsSync;

module.exports = function(opts) {
	opts = opts || {};
	var destination = process.env.HOME + "/.next-development-keys.json";
	if (existsSync(destination) && !opts.update) {
		console.log(destination + " already exists so not attempting to download & overwrite.  Re-run with `--update` to force an update");
		return Promise.resolve();
	}
	return configVarsKey()
		.then(function(key) {
			return fetch('https://ft-next-config-vars.herokuapp.com/development', { headers: { Authorization: key } });
		})
		.then(fetchres.json)
		.then(function(data) {
			console.log("Writing development keys to " + destination);
			writeFileSync(destination, JSON.stringify(data, undefined, 2));
		})
		.catch(function(err) {
			throw new Error("Could not download development keys from Heroku, make sure you have joined the ft-next-config-vars app");
		});
};
