var denodeify = require('denodeify');
var fs = require('fs');
var writeFile = denodeify(fs.writeFile);
var mkdir = denodeify(fs.mkdir);

module.exports = function(opts) {
	var name = opts.name;
	var commit = opts.commit;

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
};
