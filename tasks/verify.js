'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');
var path = require('path');
var verifyLayoutDeps = require('../lib/verify-layout-deps');
var verifyNpmDeps = require('../lib/verify-npm-deps');

function obtVerify() {
	return new Promise(function(resolve, reject) {
		origamiBuildTools.verify(gulp, {
			jsHintPath: path.join(__dirname, '..', 'config', 'jshint.json')
		})
			.on('end', resolve)
			.on('error', reject);
	});
}

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
	return Promise.all(checks);
};
