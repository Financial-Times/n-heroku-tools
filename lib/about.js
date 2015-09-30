'use strict';

const commit = require('../lib/commit');
const denodeify = require('denodeify');
const fs = require('fs');
const writeFile = denodeify(fs.writeFile);
const mkdir = denodeify(fs.mkdir);
const packageJson = require(process.cwd() + '/package.json');
const normalizeName = require('../lib/normalize-name');

module.exports = function(opts) {
	return commit()
		.then(function(commit) {
			var name = 'ft-next-' + normalizeName(packageJson.name);
			return mkdir(process.cwd() + '/public')
				.catch(function () {})
				.then(function() {
					console.log('Writing /public/__about.json');
					return writeFile(process.cwd() + '/public/__about.json', JSON.stringify({
						description: name,
						support: 'next.team@ft.com',
						supportStatus: 'active',
						appVersion: commit,
						buildCompletionTime: new Date().toISOString()
					}));
				});
		});
};
