'use strict';

var spawn = require('../lib/spawn');

module.exports = function(name) {
	return spawn(['heroku', 'create', '-a', name, '--region', 'us', '--org', 'financial-times'], { verbose: true });
};
