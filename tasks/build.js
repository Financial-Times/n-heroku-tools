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
			gulp.watch.apply(gulp, [getGlob(task), task])
				.on('end', resolve)
				.on('error', reject);
		} else {
			gulp.start.apply(gulp, [task])
				.on('end', resolve)
				.on('error', reject);
		}
	});
}

gulp.task('build-sass', function() {
	return obt.build.sass(gulp, {
		sass: sourceFolder + mainScssFile,
		buildFolder: buildFolder,
		sourcemaps: true,
		env: 'production'
	});
});

gulp.task('build-js', function() {
	return obt.build.js(gulp, {
		js: sourceFolder + mainJsFile,
		buildFolder: buildFolder,
		sourcemaps: true,
		env: 'development' // need to run as development as we do our own sourcemaps
	});
});

gulp.task('build-minify-js', ['build-js'], function() {
	var app = normalizeName(packageJson.name, { version: false });
	return gulp.src(buildFolder + mainJsFile)
		.pipe(extractSourceMap({ saveTo: buildFolder + mainJsSourceMapFile }))
		.pipe(minify({ sourceMapIn: buildFolder + mainJsSourceMapFile, sourceMapOut: '/' + app + '/' + mainJsSourceMapFile }))
		.pipe(gulp.dest(buildFolder));
});

module.exports = function(opts) {
	var runOpts = { watch: opts.watch };
	return Promise.all([
		run('build-sass', runOpts),
		run(opts.minify ? 'build-minify-js' : 'build-js', runOpts)
	]);
};
