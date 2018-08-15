'use strict';
require('isomorphic-fetch');
module.exports = function (url) {
	return new Promise(function (resolve, reject) {
		let timeout;
		let checker;
		function checkGtg () {
			console.log(`polling: ${url}`); // eslint-disable-line no-console
			fetch(url, { timeout: 2000, follow: 0 })
				.then(function (response) {
					if (response.ok) {
						console.log(`poll ${url} ok`); // eslint-disable-line no-console
						clearTimeout(timeout);
						clearInterval(checker);
						resolve();
					} else {
						console.log(`poll ${url} not ok`); // eslint-disable-line no-console
					}
				})
				.catch(error => {
					if (error.includes('FetchError: network timeout')) {
						console.log(`👋 Hey, ${url} doesn't seem to be responding yet, so there's that. You're amazing, by the way. I don't say that often enough. But you really are.`); // eslint-disable-line no-console
					}
					else {
						console.log(`😿 ${url} Error: ${error}`); // eslint-disable-line no-console
					}
				});
		}
		checker = setInterval(checkGtg, 3000);
		timeout = setTimeout(function () {
			console.log('2 minutes passed, bailing'); // eslint-disable-line no-console
			reject(`${url} not responding with an ok response within 2 minutes`);
			clearInterval(checker);
		}, 2*60*1000);
	});

};
