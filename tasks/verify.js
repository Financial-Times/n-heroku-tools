'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');
var path = require('path');
var verifyLayoutDeps = require('../lib/verify-layout-deps');

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
	if (opts.skipLayoutChecks) {
		return obtVerify();
	}
	return Promise.all([
			obtVerify(),
			verifyLayoutDeps({ layout: opts.layout })
		]);
};
