#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');
var configure = require('../tasks/configure');
var downloadConfiguration = require('../tasks/download-configuration');

function exit(err) {
	console.log(err);
	process.exit(1);
}


program.version(require('../package.json').version);

program
	.command('clean')
	.action(function() {
		clean().catch(exit);
	});

program
	.command('deploy')
	.action(function() {
		deploy().catch(exit);
	});

program
	.command('configure')
	.action(function() {
		configure().catch(exit);
	});

program
	.command('download-configuration <app>')
	.action(function(app) {
		if (app) {
			downloadConfiguration(app).catch(exit);
		} else {
			exit("Please provide an app name");
		}
	});


program.parse(process.argv);
