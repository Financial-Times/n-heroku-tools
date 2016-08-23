'use strict';

const path = require('path');
const normalizeName = require('../lib/normalize-name');
const directly = require('directly');
const packageJson = require(process.cwd() + '/package.json');
const shell = require('shellpromise');
const url = require('url');
let baseUrl;
let authenticate = false;
const cacheHeaders = {};

function getExpectation (expected) {
	if (typeof expected === 'string') {
		expected = {
			redirect: expected
		};
	} else {
		if (typeof expected === 'number') {
			if (String(expected).charAt(0) === '3') {
				expected = {
					status: expected
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
		if (opts.url === '/__gtg') {
			throw new Error(`A smoke test for /__gtg is cheating!! Do not pass GO!
Smoke tests MUST be for a genuine url served by the app.
Any old app can serve a /__gtg, but it takes a smooth running one to serve a real page.
See https://github.com/Financial-Times/n-heroku-tools/blob/master/docs/smoke.md for docs.`)
		}
		this.url = opts.url;
		this.timeout = opts.timeout;
		this.headers = opts.headers || {};
		if (authenticate) {
			this.headers['FT-Next-Backend-Key'] = process.env.FT_NEXT_BACKEND_KEY;
		}
		this.method = (opts.method || 'GET').toUpperCase();
		this.body = typeof opts.body === 'object' ? JSON.stringify(opts.body) : opts.body;
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
		fetch(this.url, {
			timeout: this.timeout || 5000,
			headers: this.headers,
			method: this.method,
			body: this.body,
			redirect: 'manual'
		})
			.then(response => {
				cacheHeaders[this.url] = {
					'Cache-Control': response.headers.get('Cache-Control') || '',
					'Surrogate-Control': response.headers.get('Surrogate-Control') || '',
					'FT-Outbound-Cache-Control': response.headers.get('FT-Outbound-Cache-Control') || ''
				}


				if (this.expected.redirect) {
					const location = response.headers.get('location');
					const locationUrl = url.parse(location)
					const locationPath = locationUrl.host === url.parse(this.url).host ? url.parse(location).path : '';
					if (location !== this.expected.redirect && locationPath !== this.expected.redirect) {
						throw 'bad redirect: ' + location;
					}
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

}

function testUrls (opts) {
	const fetchers = Object.keys(opts.urls).map(function (url) {
		const test = new UrlTest({
			url: (opts.https ? 'https' : 'http') + '://' + baseUrl + url,
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

function verifyUserFacingApp (appName, services, urlConfig) {
	const service = services.find(service => {
		return service.nodes.some(node => appName.indexOf(node.url.replace(/-(eu|us)$/)) === 0)
	})

	// it's a user-facing service, so we'll be very strict
	if (service) {

		// Expect a smoke test for every url served by the app
		const urls = urlConfig.reduce((arr, conf) => {
			return arr.concat(Object.keys(conf.urls));
		}, [])
		service.paths.forEach(path => {
			const rx = new RegExp(path);
			if (!urls.some(url => rx.test(url))) {
				throw new Error(`No smoke tests defined to cover the path ${path} served by this app`);
			}
		})

		const cacheErrors = [];

		// Expect cache headers to match what fastly deals with well
		Object.keys(cacheHeaders).map(path => {
			const headers = cacheHeaders(path);
			if (headers['Cache-Control'].indexOf('private') > -1) {
				if (headers['Surrogate-Control'] && headers['Surrogate-Control'].indexOf('max-age=0') === -1) {
					cacheErrors.push(`${path} has a private cache-control, which will mean surrogate-control gets ignored by fastly`);
				}
			} else {
				if (headers['Surrogate-Control'] && (headers['Surrogate-Control'].indexOf('stale-while-revalidate') === -1 || headers['Surrogate-Control'].indexOf('stale-if-error') === -1)) {
					cacheErrors.push(`${path} should specify stale-while-revalidate and stale-if-error cache headers`);
				}

				if (!headers['Surrogate-Control'] || !headers['Cache-Control']) {
					cacheErrors.push(`Cachable path ${path} shoudl specify both a Cache-Control and a Surrogate-Control header`);
				}

				if (headers['Cache-Control'].indexOf('public') > -1 && /max-age=[^0]/.test(headers['Cache-Control'])) {
					cacheErrors.push(`${path} should not have a public Cache-Control header of max-age greater than 0`);
				}
			}
		})

		if (cacheErrors.length) {
			console.error(cacheErrors.join('\n'));
			console.error(`\
n-express contains a few helpful cache constants you can use to rectify these issues:

res.FT_NO_CACHE = 'max-age=0, no-cache, no-store, must-revalidate';
res.FT_SHORT_CACHE = 'max-age=600, stale-while-revalidate=60, stale-if-error=86400';
res.FT_HOUR_CACHE = 'max-age=3600, stale-while-revalidate=60, stale-if-error=86400';
res.FT_DAY_CACHE = 'max-age=86400, stale-while-revalidate=60, stale-if-error=86400';
res.FT_LONG_CACHE = 'max-age=86400, stale-while-revalidate=60, stale-if-error=259200';

e.g. res.set('Cache-Control', res.FT_NO_CACHE).set('Surrogate-Control', res.FT_HOUR_CACHE);
`)
			throw new Error('Unwise Cache headers');
		}
	}
}

function runTest (opts) {
	const appName = (opts.app) ? opts.app : 'ft-next-' + normalizeName(packageJson.name);
	const urlConfig = require(path.join(process.cwd(), opts.configPath || 'test/smoke.js'));
	baseUrl = appName;
	if (!/:|\./.test(appName)) {
		baseUrl += '.herokuapp.com';
	}
	if (opts.authenticated) {
		authenticate = true;
	}
	return Promise.all(
		[fetch('https://next-registry.ft.com/v2/routed-services.json').then(res => res.json())]
			.concat(urlConfig.map(testUrls))
		)
		.then(results => {
			verifyUserFacingApp(appName, results[0], urlConfig);
		})
};

module.exports.run = runTest;
