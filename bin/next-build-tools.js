#!/usr/bin/env node
'use strict';

require('isomorphic-fetch');

var program = require('commander');

const utils = {
	list: val => {
		return val.split(',');
	},

	exit: err => {
		console.error(`\u001b[31m${err}\u001b[91m`);
		if (err.stack) {
			console.error(err.stack);
		}
		process.exit(1);
	}
};

program.version(require('../package.json').version);

require('../tasks/deploy')(program, utils);
require('../tasks/configure')(program, utils);
require('../tasks/scale')(program, utils);
require('../tasks/provision')(program, utils);
require('../tasks/verify')(program, utils);
require('../tasks/build')(program, utils);
require('../tasks/destroy')(program, utils);
require('../tasks/purge')(program, utils);
require('../tasks/deploy-vcl')(program, utils);
require('../tasks/nightwatch')(program, utils);
require('../tasks/deploy-hashed-assets')(program, utils);
require('../tasks/deploy-static')(program, utils);
require('../tasks/download-development-keys')(program, utils);
require('../tasks/run')(program, utils);
require('../tasks/rebuild')(program, utils);
require('../tasks/test-urls')(program, utils);
require('../tasks/log')(program, utils);
require('../tasks/bottle')(program, utils);
require('../tasks/ship')(program, utils);
require('../tasks/float')(program, utils);
require('../tasks/drydock')(program, utils);
require('../tasks/emergency-deploy')(program, utils);
require('../tasks/hash-assets')(program, utils);

program
	.command('*')
	.description('')
	.action(function(app) {
		utils.exit("The command ‘" + app + "’ is not known");
	});


program.parse(process.argv);

if (!process.argv.slice(2).length) {
	program.outputHelp();
}
