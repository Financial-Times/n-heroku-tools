'use strict';

require('es6-promise').polyfill();

var denodeify = require('denodeify');
var writeFile = denodeify(require('fs').writeFile);

module.exports = function(opts) {
	var name = opts.name;
	var commit = opts.commit;

	console.log(process.cwd() + '/public/about.json');
	return writeFile(process.cwd() + '/public/about.json', JSON.stringify({
		description: name,
		support: 'next.team@ft.com',
		supportStatus: 'active',
		appVersion: commit
	}));
};


module.exports({
	name: 'hi',
	commit: 'wat'
}).catch(function(err) {
	console.log(err);
});
