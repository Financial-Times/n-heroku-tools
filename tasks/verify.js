'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');
var path = require('path');

module.exports = function() {
	return new Promise(function(resolve, reject) {
		origamiBuildTools.verify(gulp, {
			jsHintPath: path.join(__dirname, '..', 'config', 'jshint.json')
		})
			.on('end', resolve)
			.on('error', reject);
	});
};
