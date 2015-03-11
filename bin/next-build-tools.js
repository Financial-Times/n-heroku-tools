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
var downloadConfiguration = require('../tasks/download-configuration');

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
			configure({ source: app })
				.then(function() {
					return deploy(app);
				})
				.catch(exit);
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
		.command('provision <app>')
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
		.description('internally calls origami-build-tools verify with some Next specific configuration')
		.action(function() {
			verify().catch(exit);
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
