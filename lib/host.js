'use strict';

module.exports = {
	buildNumber: () => {
		return process.env.CIRCLE_BUILD_NUM ||
			process.env.TRAVIS_BUILD_NUMBER ||
			process.env.BUILD_NUMBER ||
				'test';
	},

	url: (appName) => {
		let host = appName || 'http://local.ft.com:3002';
		if (!/:|\./.test(host)) {
			host += '.herokuapp.com';
		}

		if (!/https?\:\/\//.test(host)) {
			host = 'http://' + host;
		}

		return host;
	}
};
