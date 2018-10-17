const pRetry = require('p-retry');

const herokuAuthToken = require('../lib/heroku-auth-token');
const { info: pipelineInfo } = require('../lib/pipelines');
const REVIEW_APPS_URL = 'https://api.heroku.com/review-apps';

const DEFAULT_HEADERS = {
	'Accept': 'application/vnd.heroku+json; version=3',
	'Content-Type': 'application/json'
};

const NUM_RETRIES = 30;
const RETRY_EXP_BACK_OFF_FACTOR = 1;
const RETRY_INTERVAL = 10 * 1000;
const REVIEW_APP_STATUSES = {
	pending: 'pending',
	deleted: 'deleted',
	creating: 'creating',
	created: 'created'
};

const getReviewAppUrl = reviewAppId => `https://api.heroku.com/review-apps/${reviewAppId}`;
const getAppUrl = appId => `https://api.heroku.com/apps/${appId}`;
const getGithubArchiveUrl = ({ repoName, branch }) => `https://api.github.com/repos/Financial-Times/${repoName}/tarball/${branch}`;

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

const throwIfNon2xx = async res => {
	const { status, url } = res;
	if (!status || !status.toString().match(/^2.*/)) {
		const errorBody = await res.json();

		console.error('Fetch error:', status, url, errorBody); // eslint-disable-line no-console
		throw errorBody;
	}
	return res;
};

const getGithubArchiveRedirectUrl = ({ repoName, branch, githubToken }) => {
	const url = getGithubArchiveUrl({ repoName, branch });

	return fetch(url, {
		headers: {
			Authorization: `token ${githubToken}`
		},
		redirect: 'manual' // Don't follow redirect, just want the URL
	}).then(res => {
		if (res.status !== 302) {
			throw new Error(`Unexpected response for ${url} (${status})`);
		}

		const { headers: { _headers: { location } } } = res;
		const [ redirectUrl ] = location || [];

		return redirectUrl;
	});
};

const waitTillReviewAppCreated = (data) => {
	const { id } = data;
	const checkForCreatedStatus = async () => {
		const headers = await herokuHeaders({ useReviewAppApi: true });
		const result = await fetch(getReviewAppUrl(id), {
			headers
		})
			.then(throwIfNon2xx)
			.then(res => res.json())
			.then(data => {
				const { status, message, app } = data;

				if (status === REVIEW_APP_STATUSES.deleted) {
					throw new pRetry.AbortError(`Review app was deleted: ${message}`);
				}

				if (status !== REVIEW_APP_STATUSES.created) {
					const appIdOutput = (status === REVIEW_APP_STATUSES.creating)
						? `, appId: ${app.id}`
						: '';
					throw new Error(`Review app not created yet. Current status: ${status}${appIdOutput}`);
				};

				return app.id;
			});
		return result;
	};

	return pRetry(checkForCreatedStatus, {
		factor: RETRY_EXP_BACK_OFF_FACTOR,
		retries: NUM_RETRIES,
		minTimeout: RETRY_INTERVAL,
		onFailedAttempt: (err) => {
			const { attemptNumber, message } = err;
			console.error(`${attemptNumber}/${NUM_RETRIES}: ${message}`); // eslint-disable-line no-console
		}
	});
};

const getAppWebUrl = async (appId) => {
	const headers = await herokuHeaders();
	return fetch(getAppUrl(appId), {
		headers
	})
		.then(throwIfNon2xx)
		.then(res => res.json())
		.then((result) => {
			const { web_url } = result;
			return web_url;
		});
};

async function task (app, options) {
	const { repoName, branch, commit, githubToken } = options;

	const { id: pipelineId } = await pipelineInfo(app);
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
	})
		.then(throwIfNon2xx)
		.then(res => res.json())
		.then(waitTillReviewAppCreated)
		.then(getAppWebUrl)
		.then(appWebUrl => {
			console.log(appWebUrl); // eslint-disable-line no-console
		});
}

/**
* Assume
* 	* app is VAULT_SOURCE, and is package.json name (could assume it's the package.json name, like `nht configure`)
*/
module.exports = function (program) {
	program
		.command('review-app [app]')
		.description('Create a heroku review app and print out the app name created')
		.option('-r, --repo-name <name>', 'github repository name')
		.option('-b, --branch <name>', 'branch of the review app')
		.option('-c, --commit <commit>', 'commit SHA-1')
		.option('-g, --github-token <token>', 'github personal token to access source code (generate from https://github.com/settings/tokens)')
		.action(async function (app, options) {
			try {
				await task(app, options);
			} catch (error) {
				console.error(error); // eslint-disable-line no-console
				process.exit(1);
				return;
			}
		});
};
