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

function task (opts) {
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

module.exports = function (program, utils) {
	program
		.command('verify')
		.option('--skip-layout-checks', 'run verify checks when the application doesn\'t have customer facing html pages')
		.option('--skip-npm-checks', 'skip npm dependency checks')
		.option('--skip-dotenv-check', 'skip checking `.gitignore` has `.env` in it')
		.description('internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS. Front End components should continue to use origami-build-tools verify)')
		.action(function(opts) {
			task({
				skipLayoutChecks: opts.skipLayoutChecks,
				skipNpmChecks: opts.skipNpmChecks,
				skipDotenvCheck: opts.skipDotenvCheck
			}).catch(utils.exit);
		});
};
