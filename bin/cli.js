#!/usr/bin/env node
'use strict';

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');
var configure = require('../tasks/configure');

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
		Promise.all([
			configure(),
			deploy()
		]).catch(exit);
	});

program
	.command('configure')
	.action(function() {
		configure().catch(exit);
	});


program.parse(process.argv);
