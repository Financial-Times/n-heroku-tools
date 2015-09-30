var exec = require('./exec');

module.exports = function() {
	return exec('git rev-parse HEAD')
		.then(function(commit) {
			return commit.trim();
		});
};
