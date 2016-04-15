'use strict';

module.exports = {
	buildNumber: () => {
		return process.env.CIRCLE_BUILD_NUM ||
			process.env.TRAVIS_BUILD_NUMBER ||
			process.env.BUILD_NUMBER ||
				'test'
	},

	isMasterBranch: () => {
		return process.env.CIRCLE_BRANCH === 'master' ||
				process.env.GIT_BRANCH === 'master' ||
			(!process.env.TRAVIS_PULL_REQUEST && process.env.TRAVIS_BRANCH === 'master');
	}
};
