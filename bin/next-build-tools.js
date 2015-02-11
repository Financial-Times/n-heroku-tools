#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');
var configure = require('../tasks/configure');
var provision = require('../tasks/provision');
var downloadConfiguration = require('../tasks/download-configuration');

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
		.command('deploy')
		.description('runs haikro deployment scripts with sensible defaults for Next projects')
		.action(function() {
			deploy().catch(exit);
		});

	program
		.command('configure')
		.description('downloads environment variables from next-config-vars and uploads them to the current app')
		.action(function() {
			configure().catch(exit);
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
		.command('provision')
		.description('provisions a new instance of an application server')
		.action(function() {
			provision().catch(exit);
		});

program.parse(process.argv);
