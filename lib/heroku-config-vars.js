const herokuApi = require('./heroku-api');

class HerokuConfigVars {

	constructor (settings) {
		const { target, pipelineId, authToken } = settings;

		this.authToken = authToken;

		this.headers = {};
		this.endpoint = null;

		if (target === 'review-app') {
			this.headers.Accept = 'application/vnd.heroku+json; version=3.pipelines';
			this.endpoint = `/pipelines/${pipelineId}/stage/review/config-vars`;
		} else {
			this.headers.Accept = 'application/vnd.heroku+json; version=3';
			this.endpoint = `/apps/${target}/config-vars`;
		}
	}

	get () {
		return this.makeApiCall();
	}

	set (patch) {
		return this.makeApiCall({
			method: 'patch',
			body: JSON.stringify(patch)
		});
	}

	async makeApiCall (options = {}) {

		let herokuApiResponse;

		try {
			herokuApiResponse = await herokuApi({
				endpoint: this.endpoint,
				authToken: this.authToken,
				options: {
					headers: this.headers,
					...options
				}
			});
		} catch(err) {
			if (err.name === 'BAD_RESPONSE' && err.status === 404) {
				throw new Error('The specified app does not seem to exist in Heroku');
			} else {
				throw err;
			}
		}

		return herokuApiResponse;
	}

}

module.exports = HerokuConfigVars;
