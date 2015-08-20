'use strict';
require('array.prototype.find');
var path = require('path');
var normalizeName = require('../lib/normalize-name');
var Directly = require('directly');
var packageJson = require(process.cwd() + '/package.json');
var appName;

function testUrls (opts) {

	var baseUrl = 'http://' + appName + '.herokuapp.com';
	var headers = opts.headers || {};

	var fetchers = Object.keys(opts.urls).map(function (url) {
		var expected = opts.urls[url];

		if (typeof expected === 'string') {
			expected = {
				redirect: expected
			};
		} else {
			if (typeof expected === 'number') {
				expected = {
					status: expected
				};
			}
			expected.status = expected.status || 200;
		}

		return function() {

			return new Promise(function(resolve, reject) {

				function end(message) {
					console.log(message);
					clearTimeout(timeout);
					clearInterval(checker);
					resolve();
				}
				var timeout;
				var checker;
				var failures = [];
				function checkGtg() {
					console.log('polling:' + baseUrl + url);
					fetch(baseUrl + url, {
							timeout: opts.timeout || 2000,
							headers: headers
						})
						.then(function(response) {
							return new Promise(function (resolve, reject) {
								if (expected.status) {
									if (response.status !== expected.status) {
										if (failures.indexOf('bad status: ' + response.status) === -1) {
											failures.push('bad status: ' + response.status);
										}
										return reject();
									}
								}

								if (expected.redirect) {
									var arrivedAt = response.url.replace(baseUrl, '');
									if (arrivedAt !== expected.redirect) {
										if (failures.indexOf('bad redirect: ' + arrivedAt) === -1) {
											failures.push('bad redirect: ' + arrivedAt);
										}
										return reject();
									}
								}

								if (expected.headers) {
									var badHeaders = Object.keys(expected.headers).filter(function (key) {
										return response.headers.get(key) !== expected.headers[key];
									});

									if (badHeaders.length) {
										badHeaders = badHeaders.map(function (header) {
											return header + ':' + response.headers.get(header);
										}).join('; ');

										if (failures.indexOf('bad headers: ' + badHeaders) === -1) {
											failures.push('bad headers: ' + badHeaders);
										}
										return reject();
									}
								}

								if (expected.content) {
									return response
										.text()
										.then(function (text) {
											if (text !== expected.content) {
												if (failures.indexOf('bad content: ' + text) === -1) {
													failures.push('bad content: ' + text);
												}
												reject();
											} else {
												resolve();
											}
										});
								}

								resolve();
							})
								.then(function () {
									end(baseUrl + url + ' responded as expected');
								});

						})
						.catch(function(err) {
							if (err.message.indexOf('timeout') > -1 ) {
								failures.push('endpoint too slow');
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

		};

	});

	return new Directly(10, fetchers);

}


module.exports = function(opts) {
	appName = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	var urlConfig = require(path.join(process.cwd(), 'test/smoke.js'));
	return Promise.all(urlConfig.map(testUrls));
};
