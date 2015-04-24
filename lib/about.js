'use strict';

var denodeify = require('denodeify');
var writeFile = denodeify(require('fs').writeFile);

module.exports = function(opts) {
	var name = opts.name;
	var commit = opts.commit;

	return writeFile(process.cwd() + '/public/__about', JSON.stringify({
		description: name,
		support: 'next.team@ft.com',
		supportStatus: 'active',
		appVersion: commit
	}));
};
