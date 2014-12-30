var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });

module.exports = function() {
	return exec('git clean -fxd')
		.then(function(output) {
			console.log(output);
		});
};
