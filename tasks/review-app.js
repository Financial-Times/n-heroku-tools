const herokuAuthToken = require('../lib/heroku-auth-token');
const { info: pipelineInfo } = require('../lib/pipelines');
const REVIEW_APPS_URL = 'https://api.heroku.com/review-apps';
const DEFAULT_HEADERS = {
	'Accept': 'application/vnd.heroku+json; version=3.review-apps',
	'Content-Type': 'application/json'
};

const githubArchiveUrl = ({ repoName, branch }) => `https://api.github.com/repos/Financial-Times/${repoName}/tarball/${branch}`;

function herokuHeaders () {
	return herokuAuthToken()
		.then(key => {
			return {
				...DEFAULT_HEADERS,
				Authorization: `Bearer ${key}`
			};
		});
}

const getGithubArchiveRedirectUrl = ({ repoName, branch, githubToken }) => {
	const url = githubArchiveUrl({ repoName, branch });

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

async function task (app, options) {
	const { repoName, branch, commit, githubToken } = options;

	const { id: pipelineId } = await pipelineInfo(app);
	const headers = await herokuHeaders();
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
		.then(async res => {
			const { status } = res;
			if (status !== 200) {
				const errorBody = await res.json();
				throw errorBody;
			}
			return res;
		})
		.then(res => res.json())
		.then(data => {
			console.log(data); // eslint-disable-line no-console
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
