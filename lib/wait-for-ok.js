'use strict';
require('isomorphic-fetch');
module.exports = function (url) {
	return new Promise(function (resolve, reject) {
		let timeout;
		let checker;
		function checkGtg () {
			console.log(`⏳ polling: ${url}`); // eslint-disable-line no-console
			fetch(url, { timeout: 2000, follow: 0 })
				.then(function (response) {
					if (response.ok) {
						console.log(`⌛️ ${url} ok!`); // eslint-disable-line no-console
						clearTimeout(timeout);
						clearInterval(checker);
						resolve();
					} else {
						console.log(`⌛️ ${url} not ok`); // eslint-disable-line no-console
					}
				})
				.catch(error => {
					if (error.type && error.type === 'request-timeout') {
						console.log(`👋 Hey, ${url} doesn't seem to be responding yet, so there's that. You're amazing, by the way. I don't say that often enough. But you really are.`); // eslint-disable-line no-console
					}
					else {
						reject(`😿 ${url} Error: ${error}`);
						clearInterval(checker);
					}
				});
		}
		checker = setInterval(checkGtg, 3000);
		timeout = setTimeout(function () {
			reject(`😢 ${url} did not respond with an ok response within two minutes.`);
			clearInterval(checker);
		}, 2*60*1000);
	});

};
