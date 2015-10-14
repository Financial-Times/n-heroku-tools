'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');
var path = require('path');
var verifyLayoutDeps = require('../lib/verify-layout-deps');
var verifyNpmDeps = require('../lib/verify-npm-deps');
var verifyDotenvInGitignore = require('../lib/verify-dotenv-in-gitignore');

function obtVerify() {
	return new Promise(function(resolve, reject) {
		gulp.start(['verify'], resolve)
			.on('error', reject);
	});
}


gulp.task('verify', function() {
	return origamiBuildTools.verify(gulp, {
			esLintPath: path.join(__dirname, '..', 'config', 'eslint.json')
		});
});

module.exports = function(opts) {
	var checks = [
		obtVerify()
	];
	if (!opts.skipNpmChecks) {
		verifyNpmDeps();
	}

	if (!opts.skipLayoutChecks) {
		checks.push(verifyLayoutDeps({ layout: opts.layout }));
	}

	if (!opts.skipDotenvCheck) {
		checks.push(verifyDotenvInGitignore());
	}
	return Promise.all(checks);
};
