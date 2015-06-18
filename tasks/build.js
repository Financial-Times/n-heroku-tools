'use strict';

var gulp = require('gulp');
require('gulp-watch');

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
var isDev = false;

function getGlob(task) {
	switch(task) {
		case 'build-sass':
			return './client/**/*.scss';
		case 'build-js':
		case 'build-minify-js':
			return './client/**/*.js';
	}
}

function run(task, opts) {
	return new Promise(function(resolve, reject) {
		if (opts.watch) {
			console.log("Watching " + getGlob(task) + " and will trigger " + task);
			gulp.watch(getGlob(task), [task]);
		} else {
			gulp.start([task], resolve);
		}
	});
}

gulp.task('build-sass', function() {
	return obt.build.sass(gulp, {
			sass: sourceFolder + mainScssFile,
			buildFolder: buildFolder,
			env: isDev ? 'development' : 'production'
		})
		.on('end', function () {
			console.log('build-sass completed');
		})
		.on('error', function () {
			console.warn('build-sass errored');
		});
});

gulp.task('build-js', function() {
	return obt.build.js(gulp, {
			js: sourceFolder + mainJsFile,
			buildFolder: buildFolder,
			env: 'development' // need to run as development as we do our own sourcemaps
		})
		.on('end', function () {
			console.log('build-js completed');
		})
		.on('error', function () {
			console.warn('build-js errored');
		});
});

gulp.task('build-minify-js', ['build-js'], function() {
	var app = normalizeName(packageJson.name, { version: false });
	return gulp.src(buildFolder + mainJsFile)
		.pipe(extractSourceMap({ saveTo: buildFolder + mainJsSourceMapFile }))
		.pipe(minify({ sourceMapIn: buildFolder + mainJsSourceMapFile, sourceMapOut: '/' + app + '/' + mainJsSourceMapFile }))
		.pipe(gulp.dest(buildFolder))
		.on('end', function () {
			console.log('build-minify-js completed');
		})
		.on('error', function () {
			console.log('build-minify-js errored');
		});
});

module.exports = function(opts) {
	isDev = opts.isDev;
	return Promise.all([
		run('build-sass', opts),
		run(opts.isDev ? 'build-js' : 'build-minify-js', opts)
	]);
};
