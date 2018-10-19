function herokuApi ({ endpoint, authToken }) {
	return fetch(
		`https://api.heroku.com${endpoint}`,
		{
			headers: {
				Accept: 'Accept: application/vnd.heroku+json; version=3',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${authToken}`
			}
		}
	).then(response => {
		const { ok, status, statusText } = response;
		if (!ok) {
			let err = new Error(`BadResponse: ${status} ${statusText}`);
			err.name = 'BAD_RESPONSE';
			err.status = status;
			throw err;
		}

		return response.json();
	});
}

module.exports = herokuApi;
