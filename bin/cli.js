#!/usr/bin/env node

var program = require('commander');

program
	.version(require('../package.json').version)
	.command('deploy');



program.parse(process.argv);
