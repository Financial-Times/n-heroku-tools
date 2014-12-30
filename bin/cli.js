#!/usr/bin/env node

require('es6-promise').polyfill();

var program = require('commander');
var deploy = require('../tasks/deploy');

function exit(err) {
	console.log(err);
	process.exit(1);
}


program
	.version(require('../package.json').version)
	.command('deploy')
	.action(function() {
		deploy.catch(exit);
	});



program.parse(process.argv);
