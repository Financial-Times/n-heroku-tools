'use strict';

require('isomorphic-fetch');
const notifySauceLabs = require('notify-saucelabs');

const notify = (sessionId, passed) =>
	notifySauceLabs({ sessionId, passed })
		.then(() => {
			console.info('Finished updating Sauce Labs');
		})
		.catch(err => {
			console.error('An error has occurred notifying Sauce Labs');
			return err;
		});

module.exports = {
	afterEach: function (browser, done) {
		const sessionId = browser.sessionId;
		const results = browser.currentTest.results;
		console.log(`Sauce Test Results at https://saucelabs.com/tests/${browser.sessionId}`);
		if (results.failed || results.errors) {
			browser
				.getLog('browser', logs => {
					console.log('JS Console');
					console.log('==========');
					console.log(logs);
				})
				.end(() => notify(sessionId, false).then(done));
		} else {
			notify(sessionId, true)
				.then(err => {
					browser.end();
					done(err);
				});
		}
	}
};
