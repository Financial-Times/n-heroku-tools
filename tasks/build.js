'use strict';

var gulp = require('gulp');
require('gulp-watch');

var obt = require('origami-build-tools');
var normalizeName = require('../lib/normalize-name');
var extractSourceMap = require('next-gulp-tasks').extractSourceMap;
var minify = require('next-gulp-tasks').minify;
var build = require('haikro/lib/build');
var packageJson = require(process.cwd() + '/package.json');
var about = require('../lib/about');

var mainJsFile = 'main.js';
var workerJsFile = 'worker.js';
var mainScssFile = 'main.scss';
var sourceFolder = './client/';
var buildFolder = './public/';
var mainJsSourceMapFile = 'main.js.map';
var workerJsSourceMapFile = 'worker.js.map';
var isDev = false;
const hashAssets = require('../lib/hash-assets');

function getGlob(task) {
	switch(task) {
		case 'build-sass':
			return './client/**/*.scss';
		case 'build-js':
		case 'build-worker':
		case 'build-minify-js':
			return './client/**/*.js';
	}
}

function run(tasks, opts) {
	if (tasks.length === 0) {
		return Promise.resolve();
	}
	return new Promise(function(resolve, reject) {
		if (opts.watch) {
			tasks.forEach(task => {
				console.log(`Watching ${getGlob(task)} and will trigger ${task}`);
				gulp.watch(getGlob(task), [task]);
			});
		} else {
			console.log(`Starting to run ${tasks.join(', ')}`);
			gulp.start(tasks, resolve)
				.on('error', reject);
		}
	});
}

gulp.task('build-sass', function() {
	return obt.build.sass(gulp, {
			sass: sourceFolder + mainScssFile,
			buildFolder: buildFolder,
			env: isDev ? 'development' : 'production'
		})
		.on('end', function() {
			console.log('build-sass completed');
		})
		.on('error', function(err) {
			console.warn('build-sass errored');
			throw err;
		});
});

function buildJs(jsFile) {
	return obt.build.js(gulp, {
			js: sourceFolder + jsFile,
			buildFolder: buildFolder,
			buildJs: jsFile,
			env: 'development' // need to run as development as we do our own sourcemaps
		})
		.on('end', function() {
			console.log('build-js completed for ' + jsFile);
		})
		.on('error', function(err) {
			console.warn('build-js errored for ' + jsFile);
			throw err;
		});
}

function buildMinifyJs(jsFile, sourceMapFile) {
	var app = normalizeName(packageJson.name, { version: false });
	return gulp.src(buildFolder + jsFile)
		.pipe(extractSourceMap({ saveTo: buildFolder + sourceMapFile }))
		.pipe(minify({ sourceMapIn: buildFolder + sourceMapFile, sourceMapOut: '/' + app + '/' + sourceMapFile }))
		.pipe(gulp.dest(buildFolder))
		.on('end', function() {
			console.log('build-minify-js completed for ' + jsFile);
		})
		.on('error', function(err) {
			console.log('build-minify-js errored' + jsFile);
			throw err;
		});
}

gulp.task('build-js', function() {
	return buildJs(mainJsFile);
});

gulp.task('build-worker', function() {
	return buildJs(workerJsFile);
});

gulp.task('build-minify-js', ['build-js'], function() {
	return buildMinifyJs(mainJsFile, mainJsSourceMapFile);
});

gulp.task('build-minify-worker', ['build-worker'], function() {
	return buildMinifyJs(workerJsFile, workerJsSourceMapFile);
});

module.exports = function(opts) {
	isDev = opts.isDev;
	let tasks = [];
	if (!opts.skipSass) {
		tasks.push('build-sass');
	}
	if (!opts.skipJs) {
		tasks.push(opts.isDev ? 'build-js' : 'build-minify-js');
	}
	if (opts.worker) {
		tasks.push(opts.isDev ? 'build-worker' : 'build-minify-worker');
	}
	return Promise.all([
			run(tasks, opts),
			about()
		])
		.then(() => {
			if (!opts.isDev) {
				return hashAssets();
			}
		})
		.then(() => {
			if (!opts.isDev) {
				console.log("Building the Heroku tarball");
				return build({ project: process.cwd() });
			}
		});
};
