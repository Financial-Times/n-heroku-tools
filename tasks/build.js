'use strict';

var gulp = require('gulp');
var obt = require('origami-build-tools');

var extractSourceMap = require('next-gulp-tasks').extractSourceMap;
var minify = require('next-gulp-tasks').minify;

function buildSass() {
	return new Promise(function(resolve, reject) {
		obt.build.sass(gulp, {
			sass: './client/main.scss',
			buildCss: 'main.css',
			buildFolder: './public/',
			sourcemaps: true,
			env: 'production'
		})
			.on('end', resolve)
			.on('error', reject);
	});
}

function buildJs() {
	return new Promise(function(resolve, reject) {
		obt.build.js(gulp, {
			js: './client/main.js',
			buildJs: 'main.js',
			buildFolder: './public/',
			sourcemaps: true,
			env: 'development' // need to run as development as we do our own sourcemaps
		})
			.on('end', resolve)
			.on('error', reject);
	});
}

function minifyJs() {
	return new Promise(function(resolve, reject) {
		var sourceMapFile = './public/main.js.map';
		return gulp.src(mainJsFile)
			.pipe(extractSourceMap({ saveTo: sourceMapFile }))
			.pipe(minify({ sourceMapIn: sourceMapFile, sourceMapOut: '/grumman/main.js.map' }))
			.pipe(gulp.dest('./public/'))
			.on('end', resolve)
			.on('error', reject);
	});
}

module.exports = function(opts) {
	return Promise.all([
		buildSass(),
		buildJs()
			.then(function() {
				if (opts.minify) {
					return minifyJs();
				}
			})
	]);
};
