'use strict';

module.exports = function(url) {
	return new Promise(function(resolve, reject) {
		var timeout;
		var checker;
		function checkGtg() {
			console.log(`polling: ${url}`);
			fetch(url, { timeout: 2000, follow: 0 })
				.then(function(response) {
					if (response.ok) {
						console.log(`poll ${url} ok`);
						clearTimeout(timeout);
						clearInterval(checker);
						resolve();
					} else {
						console.log(`poll ${url} not ok`);
					}
				});
		}
		checker = setInterval(checkGtg, 3000);
		timeout = setTimeout(function() {
			console.log('2 minutes passed, bailing');
			reject(`${url} not responding with an ok response within 2 minutes`);
			clearInterval(checker);
		}, 2*60*1000);
	});

};
