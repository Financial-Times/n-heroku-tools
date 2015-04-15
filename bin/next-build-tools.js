#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');
var configure = require('../tasks/configure');
var provision = require('../tasks/provision');
var verify = require('../tasks/verify');
var build = require('../tasks/build');
var verifyLayoutDeps = require('../tasks/verify-layout-deps');
var destroy = require('../tasks/destroy');
var purge = require('../tasks/purge');
var deployVcl = require('../tasks/deploy-vcl');
var nightwatch = require('../tasks/nightwatch');
var deployHashedAssets = require('../tasks/deploy-hashed-assets');

function list(val) {
	return val.split(',');
}

function exit(err) {
	console.log(err);
	process.exit(1);
}

program.version(require('../package.json').version);

program
	.command('clean')
	.description('runs git clean -fxd')
	.action(function() {
		clean().catch(exit);
	});

	program
		.command('deploy [app]')
		.description('runs haikro deployment scripts with sensible defaults for Next projects')
		.action(function(app) {
			deploy(app).catch(exit);
		});

	program
		.command('configure [source] [target]')
		.description('downloads environment variables from next-config-vars and uploads them to the current app')
		.option('-o, --overrides <abc>', 'override these values', list)
		.action(function(source, target, options) {
			configure({ source: source, target: target, overrides: options.overrides }).catch(exit);
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
		.description('internally calls origami-build-tools verify with some Next specific configuration (use only for APPLICATIONS.  Front End components should continue to use origami-build-tools verify)')
		.action(function() {
			verify().catch(exit);
		});

	program
		.command('verify-layout-deps')
		.option('-l, --layout [type]', 'Only check dependencies whose templates are needed in this layout')
		.description('Verifies that the application has installed compatible versions of bower components which provide templates used by page layouts contained in ft-next-express')
		.action(function(options) {
			verifyLayoutDeps({
				layout: options.layout || 'wrapper'
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
		.description('build javascript and css')
		.action(function() {
			build().catch(exit);
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
			if(url){
				purge(url, options).catch(exit);
			}else{
				exit('Please provide a url');
			}
		});

	program
		.command('deploy-vcl [folder]')
		.description('Deploys VCL in [folder] to the fastly service given in the FASTLY_SERVICE_ID env var.  Also requires FASTLY_KEY env var')
		.option('-m, --main <main', 'Set the name of the main vcl file (the entry point).  Defaults to "main.vcl"')
		.option('-v, --vars <vars>', 'A way of injecting environment vars into the VCL.  So if you pass --vars AUTH_KEY,SERVICE the values {$AUTH_KEY} and ${SERVICE} in the vcl will be replaced with the values of the environmemnt variable')
		.action(function(folder, options){
			if(folder){
				deployVcl(folder, options);
			}else{
				exit('Please provide a folder where the .vcl is located');
			}
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
