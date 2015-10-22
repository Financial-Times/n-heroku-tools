#!/usr/bin/env node
'use strict';

require('isomorphic-fetch');

var program = require('commander');


var deploy = require('../tasks/deploy');
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
var rebuild = require('../tasks/rebuild');
var testUrls = require('../tasks/test-urls');
var log = require('../tasks/log');
var bottle = require('../tasks/bottle');


function list(val) {
	return val.split(',');
}

function exit(err) {
	console.log(err);
	console.log(err.stack);
	process.exit(1);
}

program.version(require('../package.json').version);

program
	.command('bottle [increment]')
	.option('--npm', 'Force publishing of new component to npm')
	.option('--beta', 'Release as a beta')
	.description('releases a major, minor or patch version of a next component (similar to npm version + npm publish)')
	.action(function(increment, options) {
		bottle(increment, options.npm, options.beta)
			.catch(exit);
	});

program
	.command('deploy [app]')
	.description('runs haikro deployment scripts with sensible defaults for Next projects')
	.option('-s, --skip-gtg', 'skip the good-to-go HTTP check')
	.option('--skip-enable-preboot', 'skip the preboot')
	.option('--gtg-urls <urls>', 'Comma separated list of urls to check before concluding the app is ok (these are in addition to __gtg)', list)
	.option('--skip-logging', 'Skips trying to log to SalesForce')
	.option('--log-gateway [log-gateway]', 'Which log gateway to use: mashery, internal or konstructor')
	.action(function(app, options) {

		if (options.gtgUrls) {
			throw 'Configuring gtg urls is now supported in a separate task: nbt test-urls';
		}

		deploy({
			app: app,
			skipGtg: options.skipGtg,
			skipEnablePreboot: options.skipEnablePreboot,
			log: !options.skipLogging,
			logGateway: options.logGateway || 'konstructor'
		}).catch(exit);
	});

program
	.command('test-urls [app]')
	.description('Tests that a given set of urls for an app respond as expected. Expects the config file ./test/smoke.js to exist')
	.option('-t, --throttle <n>', 'The maximum number of tests to run concurrently. default: 5')
	.action(function(app, options) {
		testUrls({
			app: app,
			urls: options.urls,
			headers: options.headers,
			timeout: options.timeout,
			throttle: options.throttle
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
	.option('--fix', 'eslint will fix any errors it finds. Will also skip all non linty checks')
	.description('internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS. Front End components should continue to use origami-build-tools verify)')
	.action(function(opts) {
		verify({
			skipLayoutChecks: opts.skipLayoutChecks,
			skipNpmChecks: opts.skipNpmChecks,
			skipDotenvCheck: opts.skipDotenvCheck,
			fix: opts.fix
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
	.option('--worker', 'additionally builds Service Worker JavaScript')
	.description('build javascript and css')
	.action(function(options) {
		build({
			isDev: options.dev,
			watch: options.watch,
			skipJs: options.skipJs,
			skipSass: options.skipSass,
			worker: options.worker
		}).catch(exit);
	});


program
	.command('destroy [app]')
	.option('--skip-logs', 'skips trying to output the logs before destroying the app')
	.description('deletes the app from heroku')
	.action(function(app, options) {
		if (app) {
			destroy({
				app: app,
				verbose: !options.skipLogs
			}).catch(exit);
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
	.option('-v, --vars <vars>', 'A way of injecting environment vars into the VCL.  So if you pass --vars AUTH_KEY,FOO the values {$AUTH_KEY} and ${FOO} in the vcl will be replaced with the values of the environmemnt variable.  If you include SERVICEID it will be populated with the current --service option')
	.option('-e, --env', 'Load environment variables from local .env file (use when deploying from a local machine')
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
	.option('-s, --script <file>', 'Runs a single javascript file')
	.option('--subargs [subargs]', 'Sub arguments to pass to a single script', /^\[.+]$/)
	.option('--no-nodemon', 'Do not run through nodemon')
	.action(function(opts){
		run(opts).catch(exit);
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
	.option('--content-type <contentType>', 'Optionally specify a content type value')
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
			cacheControl: opts.cacheControl,
			contentType: opts.contentType
		}).catch(exit);
	});

program
	.command('rebuild [apps...]')
	.option('--serves <type>', 'Trigger rebuilds of apps where type is served.')
	.description('Trigger a rebuild of the latest master on Circle')
	.action(function(apps, opts) {
		return rebuild({
			apps: apps,
			serves: opts.serves
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
	.command('log')
	.description('Logs to SalesForce™®©')
	.option('--summary [summary]', 'An Enterprise™ summary of the change')
	.option('--environment [environment]', 'Which Enterprise™ environment was the change in?  ‘Test’ (capital T) or ‘Production’ (capital P)')
	.option('--name [name]', 'Name of Enterprise™ service, e.g. ft-next-front-page')
	.option('--gateway [gateway]', 'Name of Enterprise™ gateway, e.g. ‘mashery’, ‘internal’, ‘konstructor’')
	.action(function(options) {
		log({
			summary: options.summary,
			environment: options.environment,
			name: options.name,
			gateway: options.gateway || 'konstructor'
		}).catch(exit);
	});

program
	.command('hash-assets')
	.description('Generates an asset-hashes.json file')
	.action(() => {
		const generateAssetHashesJson = require('../lib/hash-assets');
		generateAssetHashesJson().catch(exit);
	});

program
	.command('ship')
	.description('Ships code.  Deploys using pipelines, also running the configure and scale steps automatically')
	.option('-c --no-configure', 'Skip the configure step')
	.option('-s --no-scale', 'Skip the scale step')
	.option('-p --pipeline [name]', 'The name of the pipeline to deploy to.  Defaults to the app name')
	.option('-m --multiregion', 'Will expect a US app as well as an EU one')
	.option('-l --no-logging', "Don't log to Salesforce™®©")
	.option('-n, --no-splunk', 'configure not to drain logs to splunk')
	.action(function(options){
		options.log = !options.skipLogging;
		require('../tasks/ship')(options).catch(exit);
	});

program
	.command('float')
	.description('Deploys code to a test app and checks it doesn\'t die')
	.option('-a --app', 'Name of the app')
	.option('-t --testapp [value]', 'Name of the app to be created')
	.option('-m --master', "Run even if on master branch (not required if using nbt ship).")
	.option('-d, --no-destroy', 'Don\'t automatically destroy new apps')
	.action(function(options){
		require('../tasks/float')(options).catch(exit);
	});

program
	.command('drydock [name]')
	.description('Creates a new pipeline with a staging and EU production app')
	.option('-m --multiregion', 'Will create an additional app in the US')
	.action(function(name, options){
		if(!name){
			throw new Error('Please specifiy a name for the pipeline');
		}
		require('../tasks/drydock')(name, options).catch(exit);
	});

program
	.command('emergency-deploy')
	.description('Run the deploy steps that CI would run, allowing you deploy locally')
	.option('--i-know-what-i-am-doing', 'Use this option if you know what you are doing')
	.action(function(options) {
		require('../tasks/emergency-deploy')(options).catch(exit);
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
