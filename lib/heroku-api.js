const merge = require('lodash.merge');

function herokuApi ({ endpoint, authToken, options = {} }) {

	const defaultFetchOptions = {
		headers: {
			Accept: 'application/vnd.heroku+json; version=3',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${authToken}`
		}
	};

	const fetchOptions = merge(defaultFetchOptions, options);
	const url = `https://api.heroku.com${endpoint}`;

	return fetch(
		url,
		fetchOptions
	).then(response => {
		const { ok, status, statusText } = response;
		if (!ok) {
			let err = new Error(`BadResponse: ${url} - ${status} ${statusText}`);
			err.name = 'BAD_RESPONSE';
			err.status = status;
			url.search('/config-vars') > 0 && (status === 422 || status === 400) ?
				err.hint = 'Check Vault for invalid variable values (remove empty strings and change numbers to strings).' : '';
			return response.text().then(text => {
				try {
					err.responseJson = JSON.parse(text);
				} catch(_) {
					err.repsonseText = text;
				}

				throw err;
			});
		}

		return response.json();
	});
}

module.exports = herokuApi;
