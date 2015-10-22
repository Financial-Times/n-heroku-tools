'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');
var path = require('path');
var verifyLayoutDeps = require('../lib/verify-layout-deps');
var verifyNpmDeps = require('../lib/verify-npm-deps');
var verifyDotenvInGitignore = require('../lib/verify-dotenv-in-gitignore');
var doFix = false;

function obtVerify() {
	return new Promise(function(resolve, reject) {
		gulp.start(['verify'], resolve)
			.on('error', reject);
	});
}


gulp.task('verify', function() {
	return origamiBuildTools.verify(gulp, {
			esLintPath: path.join(__dirname, '..', 'config', 'eslint.json'),
			fix: doFix
		});
});

module.exports = function(opts) {

	// should not be possible to run with --fix flag in CI
	if (opts.fix && (process.env.CI || process.env.JENKINS_URL)) {
		throw 'nbt verify should not be called with --fix in CI';
	}

	doFix = opts.fix;

	var checks = [
		obtVerify()
	];
	if (!opts.skipNpmChecks && !opts.fix) {
		verifyNpmDeps();
	}

	if (!opts.skipLayoutChecks && !opts.fix) {
		checks.push(verifyLayoutDeps({ layout: opts.layout }));
	}

	if (!opts.skipDotenvCheck && !opts.fix) {
		checks.push(verifyDotenvInGitignore());
	}
	return Promise.all(checks);
};
