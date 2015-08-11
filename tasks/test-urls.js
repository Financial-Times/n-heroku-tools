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
			function checkGtg() {
				console.log('polling:' + baseUrl + url);
				fetch(baseUrl + url, {
						timeout: opts.timeout || 2000,
						headers: headers
					})
					.then(function(response) {
						if (typeof expected === 'string') {
							if (response.url.replace(baseUrl, '') === expected) {
								end('poll ' + url + ' redirected ok');
							}
						} else {
							if (response.status === expected) {
								end('poll ' + url + ' status as expected');
							} else {
								console.log('poll ' + url + ' not ok');
							}
						}
					});
			}
			checker = setInterval(checkGtg, 3000);
			timeout = setTimeout(function() {
				console.log('2 minutes passed, bailing');
				reject(baseUrl + url + ' not responding as expected within 2 minutes');
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
