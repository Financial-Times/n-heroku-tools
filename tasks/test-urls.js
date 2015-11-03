'use strict';
require('array.prototype.find');
const path = require('path');
const normalizeName = require('../lib/normalize-name');
const directly = require('directly');
const packageJson = require(process.cwd() + '/package.json');
const shell = require('shellpromise');

let baseUrl;

function getExpectation (expected) {
	if (typeof expected === 'string') {
		expected = {
			redirect: expected
		};
	} else {
		if (typeof expected === 'number') {
			if (String(expected).charAt(0) === '3') {
				expected = {
					redirect: expected
				};
			} else {
				expected = {
					status: expected
				};
			}
		}
		expected.status = expected.status || 200;
	}
	return expected;
};


class UrlTest {
	constructor (opts) {
		this.url = opts.url;
		this.timeout = opts.timeout;
		this.headers = opts.headers || {};
		this.method = opts.method || 'GET';
		this.body = opts.body;
		this.expected = getExpectation(opts.expectation);
		this.failures = [];
		this.checkUrl = this.checkUrl.bind(this);
	}

	end (error, message) {
		if (error) {
			this.reject(error);
		} else {
			console.log(message);
			this.resolve(message);
		}
	}

	run () {

		this.checkUrl();

		return new Promise(function (resolve, reject) {
			this.resolve = resolve;
			this.reject = reject;
		}.bind(this));
	}

	checkUrl () {
		let promise;
		if (this.expected.redirect) {
			promise = this.getRedirect()
				.then(redirect => {
					if (redirect !== this.expected.redirect) {
						throw 'bad redirect: ' + redirect;
					}
				});
		} else {
			promise = fetch(this.url, {
				timeout: this.timeout || 5000,
				headers: this.headers,
				method: this.method,
				body: this.body
			})
				.then(response => {
					if (response.url !== this.url) {
						throw 'bad redirect: ' + response.url;
					}
					
					if (this.expected.status) {
						if (response.status !== this.expected.status) {
							throw 'bad status: ' + response.status;
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
				});

		}

		promise
			.then(() => {
				this.end(null, this.url + ' responded as expected');
			})
			.catch(err => {
				if (err.message) {
					err = err.message;
				}

				if (err.indexOf('timeout') > -1 ) {
					err = 'endpoint too slow';
				}

				if (this.failures.indexOf(err) === -1) {
					this.failures.push(err);
				}

				this.end(this.url + ': ' + err, null);
			});
	}


	getRedirect () {
		let curl = `curl -s '${this.url}' -D-`;

		if (this.method) {
			curl += ` -X ${this.method}`;
		}

		if (this.body) {
			curl += ` -d '${JSON.stringify(this.body)}'`;
		}

		if (this.headers) {
			for(let h of Object.keys(this.headers)) {
				curl += ` -H '${h}: ${this.headers[h]}'`
			}
		}

		if (typeof this.expected.redirect === 'number') {
			return shell(`${curl} -o /dev/null -w "%{http_code}"`)
				.then(status => Number(status))
		} else {
			return shell(`${curl} | grep ^Location | sed s/'Location\: '/''/`)
				.then(location => location.replace(baseUrl, '').trim());
		}

	}
}

function testUrls (opts) {
	const fetchers = Object.keys(opts.urls).map(function (url) {
		const test = new UrlTest({
			url: baseUrl + url,
			headers: opts.headers,
			expectation: opts.urls[url],
			timeout:  opts.timeout,
			method: opts.method,
			body: opts.body
		});
		return test.run.bind(test);
	});

	return directly(opts.throttle || 5, fetchers);
}


module.exports = function(opts) {
	const appName = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	const urlConfig = require(path.join(process.cwd(), 'test/smoke.js'));
	baseUrl = 'http://' + appName;
	if (!/:|\./.test(appName)) {
		baseUrl += '.herokuapp.com';
	}
	return Promise.all(urlConfig.map(testUrls));
};
