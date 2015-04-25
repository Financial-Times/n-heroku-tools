'use strict';

var gulp = require('gulp');
var obt = require('origami-build-tools');
var normalizeName = require('../lib/normalize-name');
var extractSourceMap = require('next-gulp-tasks').extractSourceMap;
var minify = require('next-gulp-tasks').minify;
var packageJson = require(process.cwd() + '/package.json');

var mainJsFile = 'main.js';
var mainScssFile = 'main.scss';
var sourceFolder = './client/';
var buildFolder = './public/';
var mainJsSourceMapFile = 'main.js.map';

function buildSass() {
	return new Promise(function(resolve, reject) {
		obt.build.sass(gulp, {
			sass: sourceFolder + mainScssFile,
			buildFolder: buildFolder,
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
			js: sourceFolder + mainJsFile,
			buildFolder: buildFolder,
			sourcemaps: true,
			env: 'development' // need to run as development as we do our own sourcemaps
		})
			.on('end', resolve)
			.on('error', reject);
	});
}

function minifyJs() {
	var app = normalizeName(packageJson.name, { version: false });
	return new Promise(function(resolve, reject) {
		return gulp.src(buildFolder + mainJsSourceMapFile)
			.pipe(extractSourceMap({ saveTo: buildFolder + mainJsSourceMapFile }))
			.pipe(minify({ sourceMapIn: buildFolder + mainJsSourceMapFile, sourceMapOut: '/' + app + '/' + mainJsSourceMapFile }))
			.pipe(gulp.dest(buildFolder))
			.on('end', resolve)
			.on('error', reject);
	});
}

module.exports = function(opts) {
	return Promise.all([
//		buildSass(),
		buildJs()
			.then(function() {
				if (opts.minify) {
					console.log("will minify");
					return minifyJs();
				}
			})
	]);
};
