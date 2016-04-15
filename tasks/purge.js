
'use strict';

var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function (err, stdout, stderr) {
	console.log(stdout);
	console.log(stderr);
	return [err, stdout];
});

var FASTLY_KEY = process.env.FASTLY_APIKEY;

function task (url, opts) {
	if(!FASTLY_KEY){
		throw new Error('Missing FASTLY_APIKEY!');
	}

	var options = opts || {};
	var soft = options.soft || false;
	var command = 'curl ' +
		'-s 1 ' +
		'-i ' +
		'--request PURGE ' +
		'--header "Fastly-Key: ' + FASTLY_KEY + '" ' +
		'--header "Content-Accept: application/json" ' +
		(soft ? '--header "Fastly-Soft-Purge:1' : '') +
		url;
	return exec(command);
};

module.exports = function (program, utils) {
	program
		.command('purge [url]')
		.option('-s, --soft <soft>', 'Perform a "Soft Purge (will invalidate the content rather than remove it"')
		.description('purges the given url from the Fastly cache.  Requires a FASTLY_KEY environment variable set to your fastly api key')
		.action(function (url, options){
			if (url) {
				task(url, options).catch(utils.exit);
			} else {
				utils.exit('Please provide a url');
			}
		});
};

module.exports.task = task;
