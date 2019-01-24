const pRetry = require('p-retry');

const { info: pipelineInfo } = require('../lib/pipelines');
const herokuAuthToken = require('../lib/heroku-auth-token');
const { getGithubArchiveRedirectUrl } = require('./github-api');

const REVIEW_APPS_URL = 'https://api.heroku.com/review-apps';
const DEFAULT_HEADERS = {
	'Accept': 'application/vnd.heroku+json; version=3',
	'Content-Type': 'application/json'
};

const NUM_RETRIES = 60;
const RETRY_EXP_BACK_OFF_FACTOR = 1;
const MIN_TIMEOUT = 10 * 1000;
const REVIEW_APP_STATUSES = {
	pending: 'pending',
	deleted: 'deleted',
	creating: 'creating',
	created: 'created',
	errored: 'errored'
};
const BUILD_STATUSES = {
	succeeded: 'succeeded',
	failed: 'failed'
};

const getReviewAppUrl = reviewAppId => `https://api.heroku.com/review-apps/${reviewAppId}`;
const getPipelineReviewAppsUrl = pipelineId => `https://api.heroku.com/pipelines/${pipelineId}/review-apps`;
const getAppUrl = appId => `https://api.heroku.com/apps/${appId}`;
const getBuildsUrl = appId => `https://api.heroku.com/apps/${appId}/builds`;

function herokuHeaders ({ useReviewAppApi } = {}) {
	const defaultHeaders = useReviewAppApi
		? Object.assign({}, DEFAULT_HEADERS, {
			Accept: 'application/vnd.heroku+json; version=3.review-apps',
		})
		: DEFAULT_HEADERS;
	return herokuAuthToken()
		.then(key => {
			return {
				...defaultHeaders,
				Authorization: `Bearer ${key}`
			};
		});
}

const throwIfNotOk = async res => {
	const { ok, status, url } = res;
	if (!ok) {
		const errorBody = await res.json();
		console.error('Fetch error:', status, url, errorBody); // eslint-disable-line no-console
		throw errorBody;
	}
	return res;
};

const waitTillReviewAppCreated = ({ commit, minTimeout = MIN_TIMEOUT } = {}) => reviewApp => {
	const { id } = reviewApp;
	const checkForCreatedStatus = async () => {
		const headers = await herokuHeaders({ useReviewAppApi: true });
		const result = await fetch(getReviewAppUrl(id), {
			headers
		})
			.then(throwIfNotOk)
			.then(res => res.json())
			.then(async data => {
				const { status, message, app = {} } = data;
				const appId = !!app ? app.id : undefined;
				if (status === REVIEW_APP_STATUSES.deleted) {
					throw new pRetry.AbortError(`Review app was deleted: ${message}`);
				}

				if ((status === REVIEW_APP_STATUSES.errored)) {
					if (!appId) {
						throw new pRetry.AbortError(`Review app errored: ${message}`);
					}

					try {
						const {
							output_stream_url
						} = await getAppBuildWithCommit({ appId, commit });
						console.error(`App (${appId}, commit: ${commit}) errored.\n\nFor Heroku output see:\n${output_stream_url}`); // eslint-disable-line no-console
					} catch (e) {
						console.error(`Could not get app build for app id ${appId}, commit: ${commit}, ${e}`); // eslint-disable-line no-console
					}

					throw new pRetry.AbortError(`Review app errored: (appId: ${appId}) ${message}`);
				}

				if (status !== REVIEW_APP_STATUSES.created) {
					const appIdOutput = (status === REVIEW_APP_STATUSES.creating)
						? `, appId: ${appId}`
						: '';
					throw new Error(`Review app not created yet. Current status: ${status}${appIdOutput}`);
				};

				return appId;
			});
		return result;
	};

	return pRetry(checkForCreatedStatus, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: (err) => {
			const { attemptNumber, message } = err;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const getAppName = async (appId) => {
	const headers = await herokuHeaders();
	return fetch(getAppUrl(appId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json())
		.then((result) => {
			const { name } = result;
			return name;
		});
};

const findCreatedReviewApp = async ({ pipelineId, branch }) => {
	const headers = await herokuHeaders({ useReviewAppApi: true });
	return fetch(getPipelineReviewAppsUrl(pipelineId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json())
		.then((reviewApps = []) =>
			reviewApps.find(({ branch: reviewAppBranch }) => reviewAppBranch === branch));
};

const getBuilds = async (appId) => {
	const headers = await herokuHeaders();
	return fetch(getBuildsUrl(appId), {
		headers
	})
		.then(throwIfNotOk)
		.then(res => res.json());
};

const getAppBuildWithCommit = ({ appId, commit }) => {
	return getBuilds(appId)
		.then(builds => {
			const build = builds.find(({ source_blob: { version } }) => version === commit);

			return build;
		});
};

const waitForReviewAppBuild = ({ commit, minTimeout = MIN_TIMEOUT }) => async (appId) => {
	const checkForBuildAppId = () =>
		getAppBuildWithCommit({ commit, appId })
			.then(async build => {
				if (!build) {
					throw new Error(`No review app build found for app id '${appId}';, commit '${commit}'`);
				}

				const { status, output_stream_url } = build;
				if ((status === BUILD_STATUSES.failed)) {
					throw new pRetry.AbortError(`Review app build failed, appId: ${appId}, commit: ${commit}.\n\nFor Heroku output see:\n${output_stream_url}`);
				}

				if (status !== BUILD_STATUSES.succeeded) {
					throw new Error(`Review app build for app id '${appId}' (commit '${commit}') not done yet: ${status}`);
				}

				return build;
			})
			.then(({ app: { id } }) => id);

	return pRetry(checkForBuildAppId, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: (err) => {
			const { attemptNumber, message } = err;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const createReviewApp = async ({ pipelineId, repoName, commit, branch, githubToken }) => {
	const headers = await herokuHeaders({ useReviewAppApi: true });
	const body = {
		pipeline: pipelineId,
		branch,
		source_blob: {
			url: await getGithubArchiveRedirectUrl({ repoName, branch, githubToken }),
			version: commit
		}
	};
	return fetch(REVIEW_APPS_URL, {
		headers,
		method: 'post',
		body: JSON.stringify(body)
	});
};

/**
* Get the review app name based on the review app build.
* Create a review app if it does not exist, otherwise
* use the existing review app and make a new build
*
* @param {string} appName Heroku application name
* @param {string} repoName GitHub repository name
* @param {string} branch GitHub branch name
* @param {string} commit git commit SHA-1 to find the build
* @param {string} githubToken GitHub token for getting source code
*/
const getReviewAppName = async ({
	appName,
	repoName,
	branch,
	commit,
	githubToken
}) => {
	const { id: pipelineId } = await pipelineInfo(appName);

	return createReviewApp({
		pipelineId,
		repoName,
		commit,
		branch,
		githubToken
	})
		.then(res => {
			const { status } = res;
			if (status === 409) {
				console.error(`Review app already created for '${branch}' branch. Using existing review app for build.`); // eslint-disable-line no-console
				return findCreatedReviewApp({
					pipelineId,
					branch
				})
					.then(reviewApp => {
						if (!reviewApp) {
							throw new Error(`No review app found for pipeline ${pipelineId}, branch ${branch}`);
						}

						return reviewApp;
					})
					.then(waitTillReviewAppCreated({ commit }))
					.then(waitForReviewAppBuild({ commit }))
					.then(getAppName);
			}
			return Promise.resolve(res)
				.then(res => res.json())
				.then(waitTillReviewAppCreated({ commit }))
				.then(getAppName);
		});
};

module.exports = {
	createReviewApp,
	findCreatedReviewApp,
	getAppName,
	getBuilds,
	getAppBuildWithCommit,
	waitForReviewAppBuild,
	waitTillReviewAppCreated,
	getReviewAppName
};
