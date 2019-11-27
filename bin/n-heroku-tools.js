#!/usr/bin/env node
'use strict';

require('isomorphic-fetch');

let program = require('commander');

const utils = {
	list: val => {
		return val.split(',');
	},

	exit: err => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	}
};

program.version(require('../package.json').version);

require('../tasks/configure')(program, utils);
require('../tasks/deploy-hashed-assets')(program, utils);
require('../tasks/deploy-static')(program, utils);
require('../tasks/run')(program, utils);
require('../tasks/rebuild')(program, utils);
require('../tasks/gtg')(program, utils);
require('../tasks/review-app')(program, utils);
require('../tasks/upload-assets-to-s3')(program, utils);

program
	.command('*')
	.description('')
	.action(function (app) {
		utils.exit(`The command ${app} is not known`);
	});


program.parse(process.argv);

if (!process.argv.slice(2).length) {
	program.outputHelp();
}
