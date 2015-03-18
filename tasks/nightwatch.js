'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) {
	if (err) {
		console.log(stdout);
		console.log(stderr);
	}
	return [err];
});
var path = require('path');

module.exports = function(opts) {
	var test = opts.test || path.join('tests', 'browser', 'tests', '*');
	var environment = opts.environment || 'ie10,firefox36,chrome41';
	var config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');
	return exec('nightwatch'
		+ ' --env ' + environment
		+ ' --test ' + test
		+ ' --config ' + config);
};

