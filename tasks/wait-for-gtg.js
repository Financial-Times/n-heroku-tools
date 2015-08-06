'use strict';

module.exports = function(opts) {
	var name = opts.app;
	var urls = ['__gtg'];
	if (opts.urls) {
		urls = urls.concat(opts.urls);
	}
	return Promise.all(urls.map(function (url) {
		return new Promise(function(resolve, reject) {
			var timeout;
			var checker;
			function checkGtg() {
				console.log('polling: http://' + name + '.herokuapp.com/' + url);
				fetch('http://' + name + '.herokuapp.com/' + url, {
						timeout: 2000,
						follow: 0
					})
					.then(function(response) {
						if (response.ok) {
							console.log('poll ' + url + ' ok');
							clearTimeout(timeout);
							clearInterval(checker);
							resolve();
						} else {
							console.log('poll ' + url + ' not ok');
						}
					});
			}
			checker = setInterval(checkGtg, 3000);
			timeout = setTimeout(function() {
				console.log('2 minutes passed, bailing');
				reject(name + '.herokuapp.com/' + url + ' not responding with an ok response within 2 minutes');
				clearInterval(checker);
			}, 2*60*1000);
		});

	}));
};
