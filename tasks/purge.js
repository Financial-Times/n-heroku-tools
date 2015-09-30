var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) {
	console.log(stdout);
	console.log(stderr);
	return [err, stdout];
});

var FASTLY_KEY = process.env.FASTLY_KEY;

module.exports = function(url, opts){
	if(!FASTLY_KEY){
		throw new Error('No Fastly Key Found!');
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
