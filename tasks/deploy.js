var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var build = require('haikro/lib/build');
var deploy = require('haikro/lib/deploy');
var logger = require('haikro/lib/logger');

function normalizeName(name) {
	var matches = name.match(/^(?:ft-)?(?:next-)?(.*)/);
	if (matches) {
		return matches[1];
	}
	return name;
}

module.exports = function() {
	logger.setLevel('debug');
	var token;
	return Promise.all([
		process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'),
		exec('npm prune --production')
	])
		.then(function(results) {
			token = results[0];
			return build(process.cwd());
		})
		.then(function() {
			var name = 'ft-next-' + normalizeName(packageJson.name) + '-test';
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd()
			});
		});
};
