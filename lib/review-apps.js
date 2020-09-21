const pRetry = require('p-retry');

const { info: pipelineInfo } = require('../lib/pipelines');
const herokuAuthToken = require('../lib/heroku-auth-token');
const { getGithubArchiveRedirectUrl } = require('./github-api');

const REVIEW_APPS_URL = 'https://api.heroku.com/review-apps';
const DEFAULT_HEADERS = {
	'Accept': 'application/vnd.heroku+json; version=3',
	'Content-Type': 'application/json'
};

const CONFLICT_STATUS_CODE = 409;
const GET_REVIEW_APP_NAME_NUM_RETRIES = 1;
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

const herokuHeaders = async ({ useReviewAppApi } = {}) => {

	const defaultHeaders = useReviewAppApi
		? Object.assign({}, DEFAULT_HEADERS, { Accept: 'application/vnd.heroku+json; version=3.review-apps' })
		: DEFAULT_HEADERS;

	const key = await herokuAuthToken();

	return {
		...defaultHeaders,
		Authorization: `Bearer ${key}`
	};

};

const performFetch = async (requestUrl, settings) => {

	const response = await fetch(requestUrl, settings);

	const { ok, status, url } = response;

	if (!ok) {

		const errorBody = await response.json();

		console.error('Fetch error:', status, url, errorBody); // eslint-disable-line no-console

		throw new Error(errorBody.message);

	}

	return response;

};

const getAppName = async appId => {

	const headers = await herokuHeaders();

	const response = await performFetch(getAppUrl(appId), { headers });

	const { name } = await response.json();

	return name;

};

const repeatedCheckForBuildSuccessStatus = async ({ commit, appId, minTimeout = MIN_TIMEOUT }) => {

	const checkForBuildSuccessStatus = async () => {

		const { status } = await getAppBuildWithCommit({ commit, appId });

		if (status !== BUILD_STATUSES.succeeded) throw new Error(`Review app build for app id '${appId}' (commit '${commit}') not done yet: ${status}`);

		return;

	};

	return pRetry(checkForBuildSuccessStatus, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: error => {
			const { attemptNumber, message } = error;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});

};

const runCheckForBuildSuccessStatus = async ({ commit, appId, minTimeout = MIN_TIMEOUT }) => {

	try {

		await repeatedCheckForBuildSuccessStatus({ commit, appId, minTimeout });

	} catch (error) {

		throw new pRetry.AbortError(error);

	}

	return;

};

const deleteReviewAppAndThrowError = async ({ reviewApp, commit, appId }) => {

	try {

		const headers = await herokuHeaders({ useReviewAppApi: true });

		await performFetch(getReviewAppUrl(reviewApp.id), { headers, method: 'delete' });

	} catch (error) {

		throw new pRetry.AbortError(`Review app deletion failed. reviewAppId: ${reviewApp.id}; commit: ${commit}; ${error}.`);

	}

	throw new Error(`No review app build found for app id '${appId}'; commit '${commit}'.\nThe presence of a review app without a corresponding build is likely the result of a rebase.\nThe review app has been deleted and a rebuild will now be attempted.`);

};

const getBuilds = async appId => {

	const headers = await herokuHeaders();

	const response = await performFetch(getBuildsUrl(appId), { headers });

	const data = await response.json();

	return data;

};

const getAppBuildWithCommit = async ({ appId, commit }) => {

	const builds = await getBuilds(appId);

	const build = builds.find(({ source_blob: { version } }) => version === commit);

	return build;

};

const repeatedCheckForReviewAppCreatedStatus = async ({ commit, reviewApp, minTimeout = MIN_TIMEOUT } = {}) => {

	const checkForReviewAppCreatedStatus = async () => {

		const headers = await herokuHeaders({ useReviewAppApi: true });

		const response = await performFetch(getReviewAppUrl(reviewApp.id), { headers });

		const { status, message, app = {} } = await response.json();

		const appId = !!app ? app.id : undefined;

		if (status === REVIEW_APP_STATUSES.deleted) throw new pRetry.AbortError(`Review app was deleted: ${message}`);

		if ((status === REVIEW_APP_STATUSES.errored)) {

			if (!appId) throw new pRetry.AbortError(`Review app errored: ${message}`);

			try {

				const { output_stream_url } = await getAppBuildWithCommit({ appId, commit });

				console.error(`App (${appId}, commit: ${commit}) errored.\n\nFor Heroku output see:\n${output_stream_url}`); // eslint-disable-line no-console

			} catch (error) {

				console.error(`Could not get app build for app id ${appId}, commit: ${commit}, ${error}`); // eslint-disable-line no-console

			}

			throw new pRetry.AbortError(`Review app errored: (appId: ${appId}) ${message}`);

		}

		return appId;

	};

	return pRetry(checkForReviewAppCreatedStatus, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout,
		onFailedAttempt: error => {
			const { attemptNumber, message } = error;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const runCheckForReviewAppCreatedStatus = async ({ commit, reviewApp, minTimeout = MIN_TIMEOUT }) => {

	try {

		const appId = await repeatedCheckForReviewAppCreatedStatus({ commit, reviewApp, minTimeout });

		return appId;

	} catch (error) {

		throw new pRetry.AbortError(error);

	}

};

const findCreatedReviewApp = async ({ pipelineId, branch }) => {

	const headers = await herokuHeaders({ useReviewAppApi: true });

	const response = await performFetch(getPipelineReviewAppsUrl(pipelineId), { headers });

	const reviewApps = await response.json() || [];

	return reviewApps.find(({ branch: reviewAppBranch }) => reviewAppBranch === branch);

};

const createReviewApp = async ({ pipelineId, repoName, commit, branch, githubToken }) => {

	const headers = await herokuHeaders({ useReviewAppApi: true });

	const url = await getGithubArchiveRedirectUrl({ repoName, branch, githubToken });

	const body = {
		pipeline: pipelineId,
		branch,
		source_blob: {
			url,
			version: commit
		}
	};

	const response = await fetch(REVIEW_APPS_URL, { headers, method: 'post', body: JSON.stringify(body) });

	return response;

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
const getReviewAppName = async ({ appName, repoName, branch, commit, githubToken, minTimeout = MIN_TIMEOUT }) => {

	const { id: pipelineId } = await pipelineInfo(appName);

	const runReviewAppCreationProcess = async () => {

		const response = await createReviewApp({ pipelineId, repoName, commit, branch, githubToken });

		const { status } = response;

		let reviewApp;
		let appId;

		if (status === CONFLICT_STATUS_CODE) {

			console.error(`Review app already created for '${branch}' branch. Using existing review app for build.`); // eslint-disable-line no-console

			reviewApp = await findCreatedReviewApp({ pipelineId, branch });

			if (!reviewApp) throw new pRetry.AbortError(`No review app found for pipeline ${pipelineId}, branch ${branch}`);

			appId = await runCheckForReviewAppCreatedStatus({ commit, reviewApp });

			const build = await getAppBuildWithCommit({ commit, appId });

			if (!build) await deleteReviewAppAndThrowError({ reviewApp, commit, appId });

			const { status, output_stream_url } = build;

			if (status === BUILD_STATUSES.failed) throw new pRetry.AbortError(`Review app build failed, appId: ${appId}, commit: ${commit}.\n\nFor Heroku output see:\n${output_stream_url}`);

			if (status !== BUILD_STATUSES.succeeded) await runCheckForBuildSuccessStatus({ commit, appId, minTimeout });

			const appName = await getAppName(appId);

			return appName;

		}

		reviewApp = await response.json();

		appId = await runCheckForReviewAppCreatedStatus({ commit, reviewApp });

		const appName = await getAppName(appId);

		return appName;

	};

	return pRetry(runReviewAppCreationProcess, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: GET_REVIEW_APP_NAME_NUM_RETRIES,
		minTimeout,
		onFailedAttempt: error => {
			const { attemptNumber, message } = error;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});

};

module.exports = {
	getReviewAppName,
	createReviewApp,
	findCreatedReviewApp,
	runCheckForReviewAppCreatedStatus,
	repeatedCheckForReviewAppCreatedStatus,
	getAppBuildWithCommit,
	getBuilds,
	deleteReviewAppAndThrowError,
	runCheckForBuildSuccessStatus,
	repeatedCheckForBuildSuccessStatus,
	getAppName
};
