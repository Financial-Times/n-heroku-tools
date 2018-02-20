const verifyCacheHeaders = (headers, path) => {

	const cacheErrors = [];

	if (!headers['surrogate-control'] && !headers['cache-control']) {
		cacheErrors.push(`Each ${path} should specify a Cache-Control and/or a Surrogate-Control header`);
	}
	if (headers['cache-control'] && headers['cache-control'].includes('private')) {
		if (headers['surrogate-control'] && !headers['surrogate-control'].includes('max-age=0')) {
			cacheErrors.push(`${path} has a private cache-control, which will mean surrogate-control gets ignored by fastly`);
		}
	} else {
		if (headers['surrogate-control'] && !(headers['surrogate-control'].includes('stale-while-revalidate')|| headers['surrogate-control'].includes('stale-if-error'))) {
			cacheErrors.push(`${path} should specify stale-while-revalidate and stale-if-error cache headers`);
		}

		if (!headers['surrogate-control'] || !headers['cache-control']) {
			cacheErrors.push(`Cachable path ${path} should specify both a Cache-Control and a Surrogate-Control header`);
		}

		if (headers['cache-control'] && headers['cache-control'].includes('public') && /max-age=[^0]/.test(headers['cache-control'])) {
			cacheErrors.push(`${path} should not have a public Cache-Control header of max-age greater than 0`);
		}

		if (headers['surrogate-control'] && !headers['cache-control']) {
			cacheErrors.push(`As ${path} uses surrogate-control, you should set an aoutbound cache-control header too, usually res.set('Cache-Control', res.FT_NO_CACHE)`);
		}
	}

	if (cacheErrors.length) {
		console.error(cacheErrors.join('\n')); // eslint-disable-line no-console
		// eslint-disable-next-line no-console
		console.error(`\
n-express contains a few helpful cache constants you can use to rectify these issues:
res.FT_NO_CACHE = 'max-age=0, no-cache, no-store, must-revalidate';
res.FT_SHORT_CACHE = 'max-age=600, stale-while-revalidate=60, stale-if-error=86400';
res.FT_HOUR_CACHE = 'max-age=3600, stale-while-revalidate=60, stale-if-error=86400';
res.FT_DAY_CACHE = 'max-age=86400, stale-while-revalidate=60, stale-if-error=86400';
res.FT_LONG_CACHE = 'max-age=86400, stale-while-revalidate=60, stale-if-error=259200';
e.g. res.set('Cache-Control', res.FT_NO_CACHE).set('Surrogate-Control', res.FT_HOUR_CACHE);
`);
		throw new Error('Unwise Cache headers');
	}
};

module.exports = (testPage) => {
	let okay = true;
	let problems;
	try {
		verifyCacheHeaders(testPage.response.headers(), testPage.url);
	} catch(errors) {
		okay = false;
		problems = errors;
	}
	return {
		expected: 'Cache-Control headers should be sensible',
		actual: okay || problems,
		result: okay
	};
};
