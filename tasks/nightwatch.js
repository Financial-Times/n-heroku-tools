'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) {
	console.log(stdout);
	console.log(stderr);
	return [err];
});
var path = require('path');

module.exports = function(opts) {
	var test = opts.test;
	var env = opts.env || 'ie10,firefox36,chrome41,iphone7,Android_Nexus7HD';
	var config = opts.config || path.join(__dirname, '..', 'config', 'nightwatch.json');
	return exec('nightwatch'
		+ ' --env ' + env
		+ ' --test ' + test
		+ ' --config ' + config);
};