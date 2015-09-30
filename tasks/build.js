var gulp = require('gulp');
require('gulp-watch');

var obt = require('origami-build-tools');
var normalizeName = require('../lib/normalize-name');
var extractSourceMap = require('next-gulp-tasks').extractSourceMap;
var minify = require('next-gulp-tasks').minify;
var packageJson = require(process.cwd() + '/package.json');

var mainJsFile = 'main.js';
var workerJsFile = 'worker.js';
var mainScssFile = 'main.scss';
var sourceFolder = './client/';
var buildFolder = './public/';
var mainJsSourceMapFile = 'main.js.map';
var workerJsSourceMapFile = 'worker.js.map';
var isDev = false;

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

function run(task, opts) {
	return new Promise(function(resolve, reject) {
		if (opts.watch) {
			console.log("Watching " + getGlob(task) + " and will trigger " + task);
			gulp.watch(getGlob(task), [task]);
		} else {
			gulp.start([task], resolve)
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
	var promises = [];
	if (!opts.skipSass) {
		promises.push(run('build-sass', opts));
	}
	if (!opts.skipJs) {
		promises.push(run(opts.isDev ? 'build-js' : 'build-minify-js', opts));
	}
	if(opts.worker) {
		promises.push(run(opts.isDev ? 'build-worker' : 'build-minify-worker', opts));
	}
	return Promise.all(promises);
};
