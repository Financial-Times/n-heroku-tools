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

module.exports = function() {
	return exec('origami-build-tools verify --jsHintPath ' + path.join(__dirname, '..', 'config', 'jshint.json'));
};
