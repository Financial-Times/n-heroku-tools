'use strict';

var spawn = require('shellpromise');

module.exports = function(name) {
	return spawn('heroku create -a ' + name + ' --region us --org financial-times --no-remote', { verbose: true });
};
