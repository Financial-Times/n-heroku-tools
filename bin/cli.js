#!/usr/bin/env node

require('es6-promise').polyfill();
require('isomorphic-fetch');
require('haikro/lib/logger').setLevel('debug');

var program = require('commander');
var deploy = require('../tasks/deploy');
var clean = require('../tasks/clean');

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


program.parse(process.argv);
