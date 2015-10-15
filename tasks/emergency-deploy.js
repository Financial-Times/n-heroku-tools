'use strict';

const fetchres = require('fetchres');
const packageJson = require(process.cwd() + '/package.json');
const configVarsKey = require('../lib/config-vars-key');
const shellpromise = require('shellpromise');

module.exports = function(options) {
	if (!options.iKnowWhatIAmDoing) {
		return Promise.reject(new Error('This command may only be used if `--i-know-what-i-am-doing`'));
	}

	return configVarsKey()
		.then(function(key) {
			return fetch('https://ft-next-config-vars.herokuapp.com/continuous-integration/' + packageJson.name, { headers: { Authorization: key } });
		})
		.then(function(res) {
			if (res.status === 404) {
				throw new Error(packageJson.name + " has not had continuous integration keys set up in config-vars, please set them up here:"
					+ "\nhttp://git.svc.ft.com/projects/NEXTPRIVATE/repos/config-vars/browse/models/continuous-integration.js.");
			} else {
				return fetchres.json(res);
			}
		})
		.then(function(env) {
			env = Object.assign(process.env, env, { PATH: process.env.PATH });
			return shellpromise('make clean install build-production deploy', { env, cwd: process.cwd(), verbose: true });
		});
};
