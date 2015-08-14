'use strict';
var path = require('path');
var normalizeName = require('../lib/normalize-name');
var packageJson = require(process.cwd() + '/package.json');
var appName;

function testUrls (opts) {

	var baseUrl = 'http://' + appName + '.herokuapp.com';
	var headers = opts.headers || {};
	return Promise.all(Object.keys(opts.urls).map(function (url) {
		var expected = opts.urls[url];

		return new Promise(function(resolve, reject) {

			function end (message) {
				console.log(message);
				clearTimeout(timeout);
				clearInterval(checker);
				resolve();
			}
			var timeout;
			var checker;
			var failures = [];
			console.log('polling:' + baseUrl + url);
			function checkGtg() {

				fetch(baseUrl + url, {
						timeout: opts.timeout || 2000,
						headers: headers
					})
					.then(function(response) {
						if (typeof expected === 'string') {
							var arrivedAt = response.url.replace(baseUrl, '');
							if (arrivedAt === expected) {
								end('poll ' + url + ' redirected ok');
							} else {
								if (arrivedAt !== failures[failures.length -1]) {
									failures.push(arrivedAt);
								}
							}
						} else {
							if (response.status === expected) {
								end('poll ' + url + ' status as expected');
							} else {
								if (response.status !== failures[failures.length -1]) {
									failures.push(response.status);
								}
							}
						}
					});
			}
			checker = setInterval(checkGtg, 3000);
			timeout = setTimeout(function() {
				console.log(baseUrl + url + ' keeps failing with: ' + failures.join(', '));
				reject('Test url polling failed');
				clearInterval(checker);
			}, 2*60*1000);
		});

	}));
}


module.exports = function(opts) {
	appName = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	var urlConfig = require(path.join(process.cwd(), 'test/smoke.js'));
	return Promise.all(urlConfig.map(testUrls));
};
