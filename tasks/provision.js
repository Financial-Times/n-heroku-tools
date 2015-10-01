'use strict';

var spawn = require('shellpromise');

module.exports = function(name, region) {
	if(typeof region === 'undefined'){
		region = 'us'
	}
	return spawn('heroku create -a ' + name + ' --region ' + region + ' --org financial-times --no-remote', { verbose: true });
};
