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
var verifyLayoutDeps = require('../tasks/verify-layout-deps');
var destroy = require('../tasks/destroy');
var nightwatch = require('../tasks/nightwatch');
var downloadConfiguration = require('../tasks/download-configuration');
var deployHashedAssets = require('../tasks/deploy-hashed-assets');
var deployHashedAssetsToS3 = require('../tasks/deploy-hashed-assets-s3');

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
		.command('download-configuration <app>')
		.description('downloads environment variables from app from Heroku to make adding them to the next-config-vars service easier')
		.action(function(app) {
			if (app) {
				downloadConfiguration(app).catch(exit);
			} else {
				exit("Please provide an app name");
			}
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
		.description('deploys ./hashed-assets/ to <app-name> on GitHub')
		.action(function() {
			Promise.all([
				deployHashedAssets(),
				deployHashedAssetsToS3()
			]).catch(exit);
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
		.command('*')
		.description('')
		.action(function(app) {
			exit("The command ‘" + app + "’ is not known");
		});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
	program.outputHelp();
}
