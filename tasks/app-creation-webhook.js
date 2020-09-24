const {
	getReviewAppName
} = require('../lib/review-apps');

async function task (appName, options) {
	const { repoName, branch, commit, githubToken } = options;

	return getReviewAppName({
		appName,
		repoName,
		branch,
		commit,
		githubToken
	}).then(appName => {
		console.log(appName); // eslint-disable-line no-console
	});
}

const description = 'Create or find an existing heroku review app and print out the app name. [appName] is the package.json name (which is also the value of VAULT_NAME). On the first build of a branch, Heroku will create a review app with a build. On subsequent builds, Heroku will automatically generate a new build, which this task looks for. See https://devcenter.heroku.com/articles/review-apps-beta for more details of the internals';

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
				const { message } = error || {};
				console.error(`${message}\n\n`, error); // eslint-disable-line no-console
				process.exit(1);
				return;
			}
		});
};
