const { info: pipelineInfo } = require('../lib/pipelines');
const {
	createReviewApp,
	findCreatedReviewApp,
	waitTillReviewAppCreated,
	waitForReviewAppBuild,
	getAppName
} = require('../lib/review-apps');

async function task (appName, options) {
	const { repoName, branch, commit, githubToken } = options;
	const { id: pipelineId } = await pipelineInfo(appName);

	return createReviewApp({ pipelineId, repoName, commit, branch, githubToken })
		.then(res => {
			const { status } = res;
			if (status === 409) {
				console.error(`Review app already created for ${branch} branch. Using existing review app for build.`); // eslint-disable-line no-console
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
					.then(waitTillReviewAppCreated)
					.then(waitForReviewAppBuild(commit))
					.then(getAppName);
			}
			return Promise.resolve(res)
				.then(res => res.json())
				.then(waitTillReviewAppCreated)
				.then(getAppName);
		})
		.then(appName => {
			console.log(appName); // eslint-disable-line no-console
		});
}

const description = 'Create or find an existing heroku review app and print out the app name. [appName] is the package.json name (which is also the value of VAULT_SOURCE). On the first build of a branch, Heroku will create a review app with a build. On subsequent builds, Heroku will automatically generate a new build, which this task looks for. See https://devcenter.heroku.com/articles/review-apps-beta for more details of the internals';

module.exports = function (program) {
	program
		.command('review-app [appName]')
		.description(description)
		.option('-r, --repo-name <name>', 'github repository name')
		.option('-b, --branch <name>', 'branch of the review app')
		.option('-c, --commit <commit>', 'commit SHA-1')
		.option('-g, --github-token <token>', 'github personal token to access source code (generate from https://github.com/settings/tokens)')
		.action(async function (appName, options) {
			try {
				await task(appName, options);
			} catch (error) {
				console.error(error); // eslint-disable-line no-console
				process.exit(1);
				return;
			}
		});
};
