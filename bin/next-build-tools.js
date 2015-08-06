#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var waitForGtg = require('../tasks/wait-for-gtg');
var configure = require('../tasks/configure');
var scale = require('../tasks/scale');
var provision = require('../tasks/provision');
var verify = require('../tasks/verify');
var build = require('../tasks/build');
var destroy = require('../tasks/destroy');
var purge = require('../tasks/purge');
var ingest = require('../tasks/ingest');
var deployVcl = require('../tasks/deploy-vcl');
var nightwatch = require('../tasks/nightwatch');
var deployHashedAssets = require('../tasks/deploy-hashed-assets');
var deployStatic = require('../tasks/deploy-static');
var downloadDevelopmentKeys = require('../tasks/download-development-keys');
var run = require('../tasks/run');
var about = require('../tasks/about');
var rebuild = require('../tasks/rebuild');

function list(val) {
	return val.split(',');
}

function exit(err) {
	console.log(err);
	process.exit(1);
}

program.version(require('../package.json').version);

program
	.command('deploy [app]')
	.description('runs haikro deployment scripts with sensible defaults for Next projects')
	.option('-s, --skip-gtg', 'skip the good-to-go HTTP check')
	.option('--skip-enable-preboot', 'skip the preboot')
	.option('--docker', 'deploy an app which uses docker')
	.option('--gtg-urls <urls>', 'Comma separated list of urls to check before concluding the app is ok (these are in addition to __gtg)', list)
	.action(function(app, options) {
		deploy({
			app: app,
			docker: options.docker,
			skipGtg: options.skipGtg,
			gtgUrls: options.gtgUrls,
			skipEnablePreboot: options.skipEnablePreboot
		}).catch(exit);
	});

program
	.command('configure [source] [target]')
	.description('downloads environment variables from next-config-vars and uploads them to the current app')
	.option('-o, --overrides <abc>', 'override these values', list)
	.option('-n, --no-splunk', 'configure not to drain logs to splunk')
	.action(function(source, target, options) {
		configure({
			source: source,
			target: target,
			overrides: options.overrides,
			splunk: options.splunk
		}).catch(exit);
	});

program
	.command('download-development-keys')
	.description('downloads development environment variables from next-config-vars and stores them in your home directory if a file doesn\'t already exist')
	.option('--update', 'overwrites the keys files in your home directory')
	.action(function(opts) {
		downloadDevelopmentKeys({ update: opts.update })
			.catch(exit);
	});

program
	.command('scale [source] [target]')
	.description('downloads process information from next-service-registry and scales/sizes the application servers')
	.option('-m, --minimal', 'scales each dyno to a single instance (useful for provisioning a test app)')
	.action(function(source, target, options) {
		scale({
			source: source,
			target: target,
			minimal: options.minimal
		}).catch(exit);
	});

program
	.command('provision [app]')
	.description('provisions a new instance of an application server')
	.action(function(app) {
		if (app) {
			provision(app).catch(exit);
		} else {
			exit("Please provide an app name");
		}
	});

program
	.command('verify')
	.option('--skip-layout-checks', 'run verify checks when the application doesn\'t have customer facing html pages')
	.option('--skip-npm-checks', 'skip npm dependency checks')
	.option('--skip-dotenv-check', 'skip checking `.gitignore` has `.env` in it')
	.option('-l, --layout [type]', 'Only check dependencies whose templates are needed in this layout')
	.description('internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)')
	.action(function(opts) {
		verify({
			skipLayoutChecks: opts.skipLayoutChecks,
			skipNpmChecks: opts.skipNpmChecks,
			skipDotenvCheck: opts.skipDotenvCheck,
			layout: opts.layout
		}).catch(exit);
	});

program
	.command('nightwatch [test]')
	.option('-c, --config <config>', 'The location of the nightwatch.json, defaults to Next Build Tools nightwatch.json')
	.option('-e, --env <env>', 'The location of the nightwatch.json, defaults to Next Build Tools defined environments')
	.description('runs nightwatch with some sensible defaults')
	.action(function(test, options) {
		nightwatch({
			test: test,
			env: options.env,
			config: options.config

		})
			.catch(exit);
	});

program
	.command('deploy-hashed-assets')
	.description('deploys hashed asset files to S3 (if AWS keys set correctly)')
	.action(function() {
		deployHashedAssets().catch(exit);
	});

program
	.command('build')
	.option('--dev', 'Skip minification')
	.option('--watch', 'Watches files')
	.option('--skip-js', 'skips compilation of JavaScript')
	.option('--skip-sass', 'skips compilation of Sass')
	.description('build javascript and css')
	.action(function(options) {
		build({
			isDev: options.dev,
			watch: options.watch,
			skipJs: options.skipJs,
			skipSass: options.skipSass
		}).catch(exit);
	});


program
	.command('destroy [app]')
	.description('deletes the app from heroku')
	.action(function(app) {
		if (app) {
			destroy(app).catch(exit);
		} else {
			exit("Please provide an app name");
		}
	});

program
	.command('purge [url]')
	.option('-s, --soft <soft>', 'Perform a "Soft Purge (will invalidate the content rather than remove it"')
	.description('purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key')
	.action(function(url, options){
		if (url) {
			purge(url, options).catch(exit);
		} else {
			exit('Please provide a url');
		}
	});

program
	.command('deploy-vcl [folder]')
	.description('Deploys VCL in [folder] to the specified fastly service.  Requires FASTLY_KEY env var')
	.option('-m, --main <main>', 'Set the name of the main vcl file (the entry point).  Defaults to "main.vcl"')
	.option('-v, --vars <vars>', 'A way of injecting environment vars into the VCL.  So if you pass --vars AUTH_KEY,SERVICE the values {$AUTH_KEY} and ${SERVICE} in the vcl will be replaced with the values of the environmemnt variable')
	.option('-s, --service <service>', 'REQUIRED.  The ID of the fastly service to deploy to.')
	.action(function(folder, options) {
		if (folder) {
			deployVcl(folder, options).catch(exit);
		} else {
			exit('Please provide a folder where the .vcl is located');
		}
	});

program
	.command('run')
	.description('Runs the local app through the router')
	.option('-l, --local', 'Run the app but don\'t start the router')
	.option('--harmony', 'Runs the local app with harmony')
	.option('--debug', 'Runs the local app with debug flag')
	.option('--procfile', 'Runs all processes specified in the Procfile')
	.action(function(opts){
		run(opts).catch(exit);
	});

program
	.command('about')
	.description('Creates an __about.json file for the app')
	.action(function(){
		about().catch(exit);
	});

program
	.command('deploy-static <source> [otherSources...]')
	.description('Deploys static <source> to [destination] on S3 (where [destination] is a full S3 URL).  Requires AWS_ACCESS and AWS_SECRET env vars')
	.option('--strip <strip>', 'Optionally strip off the <strip> leading components off of the source file name')
	.option('--destination <destination>', 'Optionally add a prefix to the upload path')
	.option('--region <region>', 'Optionally set the region (default to eu-west-1)')
	.option('--bucket <bucket>', 'Optionally set the bucket (default to ft-next-qa)')
	.option('--no-cache', 'Optionally don\'t set a far future cache')
	.option('--cache-control <cacheControl>', 'Optionally specify a cache control value')
	.action(function(file, files, opts) {
		files.unshift(file);
		var region = opts.region || 'eu-west-1';
		var bucket = opts.bucket || 'ft-next-qa';
		var destination = opts.destination || "";

		return deployStatic({
			files: files,
			destination: destination,
			region: region,
			bucket: bucket,
			strip: opts.strip,
			cache: opts.cache,
			cacheControl: opts.cacheControl
		}).catch(exit);
	});

program
	.command('rebuild [apps...]')
	.description('Trigger a rebuild of the latest master on Circle')
	.action(function(apps) {
		return rebuild({
			apps: apps
		}).catch(exit);
	});

program
	.command('wait-for-gtg <app>')
	.description('Polls the /__gtg endpoint of a given app until it returns 200')
	.action(function(app) {
		return waitForGtg({
			app: app
		}).catch(exit);
	});

program
	.command('ingest [uuid...]')
	.description('[Re-]ingest content into the Elastic Search cache [api v1 only]')
	.action(function(uuids) {
		return ingest({
			uuids: uuids
		}).catch(exit);
	});

program
	.command('*')
	.description('')
	.action(function(app) {
		exit("The command ‘" + app + "’ is not known");
	});



program.parse(process.argv);

if (!process.argv.slice(2).length) {
	program.outputHelp();
}
