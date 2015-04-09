'use strict';

var gulp = require('gulp');
var origamiBuildTools = require('origami-build-tools');

module.exports = function() {
	return new Promise(function(resolve, reject) {
		origamiBuildTools.build(gulp, {
			js: './client/main.js',
			sass: './client/main.scss',
			buildCss: 'main.css',
			buildJs: 'main.js',
			buildFolder: './public/'
		})
			.on('end', resolve)
			.on('error', reject);
	});
};
