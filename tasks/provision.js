
var util   = require('util');
var debug  = require('debug')('next-build-tools');
var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var create = require('haikro/lib/create');
var logger = require('haikro/lib/logger');

// create a Heroku application server
module.exports = function () {

    var build = process.env.CI_BUILD_NUMBER;
    var branch = process.env.CI_BRANCH;
    var project = process.env.PROJECT;
    var heroku_auth = process.env.HEROKU_API_TOKEN;

    if (!project || !branch || !build || !heroku_auth) {
        throw "You need to set HEROKU_API_TOKEN, PROJECT, CI_BRANCH, and CI_BUILD_NUMBER environment variables";
    }

	var token;
	return Promise.all([
		process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'),
	])
		.then(function(results) {
	        logger.setLevel('debug');
			token = results[0].trim();
            var server = {
                app: util.format('%s-%s-%s', project, branch, build),
                region: 'eu',
				token: token,
                organization: 'financial-times'
            }
            return create(server);
		});
};

/*
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
	var commit;
	return Promise.all([
		process.env.HEROKU_AUTH_TOKEN ? Promise.resolve(process.env.HEROKU_AUTH_TOKEN) : exec('heroku auth:token'),
		exec('git rev-parse HEAD'),
		exec('npm prune --production')
	])
		.then(function(results) {
			token = results[0];
			commit = results[1];
			return build({ project: process.cwd() });
		})
		.then(function() {
			var name = 'ft-next-' + normalizeName(packageJson.name);
			console.log('Next Build Tools going to deploy to ' + name);
			return deploy({
				app: name,
				token: token,
				project: process.cwd(),
				commit: commit
			});
		});
};*/
