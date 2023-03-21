/**
* Retrieves and sets config vars by calling the Heroku API.
*/
const herokuApi = require('./heroku-api');

class HerokuConfigVars {

	constructor (settings) {
		/**
		* @param target - The target app to be configured.
		* @param pipelineId - Unique identifier of the Heroku pipeline.
		* @param authToken - Heroku authentication token.
		*/
		const { target, pipelineId, authToken } = settings;

		this.authToken = authToken;

		this.headers = {};
		this.endpoint = null;

		/**
		* Review apps are configured on the pipeline since we don't want to have to wait
		* for the app to be created. This is done with a prototype API, which uses a
		* different URL and Accept header.
		*
		* This prototype API currently supports the test environment only, so staging
		* and prod apps are directly configured using the standard API.
		*
		* Prototype API docs: https://devcenter.heroku.com/articles/review-apps-beta#pipeline-config-vars
		*/

		if (target === 'review-app') {
			this.headers.Accept = 'application/vnd.heroku+json; version=3.pipelines';
			this.endpoint = `/pipelines/${pipelineId}/stage/review/config-vars`;
		} else {
			this.endpoint = `/apps/${target}/config-vars`;
		}
	}

	/**
	* Gets the config vars from Heroku.
	*/
	get () {
		return this.makeApiCall();
	}

	/**
	* Sets the config vars in Heroku.
	*/
	set (patch) {
		return this.makeApiCall({
			method: 'PATCH',
			body: JSON.stringify(patch)
		});
	}

	/**
	* Calls the Heroku API with the correct endpoint, authentication token and headers.
	* It accepts options, which are merged into one object with the headers.
	* @return object - The api response containing config vars.
	*/
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
