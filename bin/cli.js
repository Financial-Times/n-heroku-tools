#!/usr/bin/env node

require('es6-promise').polyfill();
require('isomorphic-fetch');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');
var provision = require('../tasks/provision');

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
	.command('provision')
	.action(function() {
		provision().then(function () { console.log(arguments) }).catch(exit);
	});

program.parse(process.argv);
