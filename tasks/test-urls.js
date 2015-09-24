'use strict';
require('array.prototype.find');
var path = require('path');
var normalizeName = require('../lib/normalize-name');
var directly = require('directly');
var packageJson = require(process.cwd() + '/package.json');
var baseUrl;

var getExpectation = function (expected) {

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
	return expected;
};


var UrlTest = function (url, headers, expectation, timeout) {
	this.url = url;
	this.timeout = timeout;
	this.headers = headers || {};
	this.expected = getExpectation(expectation);
	this.failures = [];
	this.checkUrl = this.checkUrl.bind(this);
};

UrlTest.prototype.runner = function () {
	return function () {
		return this.run();
	}.bind(this);
};

UrlTest.prototype.end = function (message) {
	console.log(message);
	clearTimeout(this.timeout);
	delete this.timeout;
	this.resolve();
};

UrlTest.prototype.run  = function () {
	console.log('polling:' + this.url);
	this.checkUrl();
	this.timeout = setTimeout(function() {

		var message = this.url;
		if (Object.keys(this.headers).length) {
			var headers = this.headers;
			message += ' (with ' + Object.keys(headers).reduce(function (arr, key) {
				arr.push(key + ': ' + headers[key]);
				return arr;
			}, []).join(', ') + ')';
		}
		message += ' keeps failing with: ' + this.failures.join(', ');
		console.error(message);
		this.reject('Test url polling failed');
	}.bind(this), 2 * 60 * 1000);

	return new Promise(function (resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));

};

UrlTest.prototype.checkUrl = function () {

	fetch(this.url, {
		timeout: this.timeout || 2000,
		headers: this.headers
	})
		.then(function(response) {
			if (this.expected.status) {
				if (response.status !== this.expected.status) {
					throw 'bad status: ' + response.status;
				}
			}

			if (this.expected.redirect) {
				var arrivedAt = response.url.replace(baseUrl, '');
				if (arrivedAt !== this.expected.redirect) {
					throw 'bad redirect: ' + arrivedAt;
				}
			}

			if (this.expected.headers) {
				var badHeaders = Object.keys(this.expected.headers).filter(function (key) {
					return response.headers.get(key) !== this.expected.headers[key];
				}.bind(this));

				if (badHeaders.length) {
					badHeaders = badHeaders.map(function (header) {
						return header + ':' + response.headers.get(header);
					}).join('; ');

					throw 'bad headers: ' + badHeaders;
				}
			}

			if (this.expected.content) {
				return response
					.text()
					.then(function (text) {
						if (text !== this.expected.content) {
							throw 'bad content: ' + text;
						}
					}.bind(this));
			}

			return;
		}.bind(this))
		.then(function () {
			this.end(this.url + ' responded as expected');
		}.bind(this))
		.catch(function(err) {

			if (err.message) {
				err = err.message;
			}
			if (err.indexOf('timeout') > -1 ) {
				err = 'endpoint too slow';
			}

			if (this.failures.indexOf(err) === -1) {
				this.failures.push(err);
			}
		}.bind(this))
		.then(function () {
			if (!this.timeout) {
				throw 'Already exited';
			}
		}.bind(this))
		.then(this.checkUrl);
};

function testUrls (opts) {

	var fetchers = Object.keys(opts.urls).map(function (url) {
		return new UrlTest(baseUrl + url, opts.headers, opts.urls[url], opts.timeout).runner();
	});
	return directly(1, fetchers);
}


module.exports = function(opts) {
	var appName = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	baseUrl = 'http://' + appName + '.herokuapp.com';
	var urlConfig = require(path.join(process.cwd(), 'test/smoke.js'));
	return Promise.all(urlConfig.map(testUrls));
};
