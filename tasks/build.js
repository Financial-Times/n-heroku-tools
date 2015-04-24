'use strict';

var gulp = require('gulp');
var obt = require('origami-build-tools');
var normalizeName = require('../lib/normalize-name');
var extractSourceMap = require('next-gulp-tasks').extractSourceMap;
var minify = require('next-gulp-tasks').minify;
var packageJson = require(process.cwd() + '/package.json');

var mainJsFile = './client/main.js';
var mainJsOutputFile = 'main.js';
var mainScssFile = './client/main.scss';
var mainScssOutputFile = 'main.css';
var mainJsSourceMapFile = './client/main.js.map';
var mainJsSourceMapOutputFile = 'main.css';
var buildFolder = './public/';

function buildSass() {
	return new Promise(function(resolve, reject) {
		obt.build.sass(gulp, {
			sass: mainScssFile,
			buildCss: mainScssOutputFile,
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
			js: mainJsFile,
			buildJs: mainJsOutputFile,
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
		return gulp.src(mainJsFile)
			.pipe(extractSourceMap({ saveTo: mainJsSourceMapFile }))
			.pipe(minify({ sourceMapIn: mainJsSourceMapFile, sourceMapOut: '/' + app + '/' + mainJsSourceMapOutputFile }))
			.pipe(gulp.dest(buildFolder))
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
