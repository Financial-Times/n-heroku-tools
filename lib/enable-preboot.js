'use strict';

var shellpromise = require('shellpromise');

module.exports = function(opts) {
	return shellpromise(`heroku features:enable -a ${opts.app} preboot`);
};
