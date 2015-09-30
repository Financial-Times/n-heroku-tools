var log = require('../lib/log');

module.exports = function(options) {
	return log.open({
		summary: options.summary,
		environment: options.environment,
		name: options.name,
		gateway: options.gateway
	})
		.then(function(id) {
			return log.close(id, { gateway: options.gateway });
		});
};
