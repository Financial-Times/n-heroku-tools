require('isomorphic-fetch');
const nock = require('nock');

jest.mock('./github-api');
const reviewApps = require('./review-apps');
const BASE_HEROKU_API_URL = 'https://api.heroku.com';

describe('review-apps', () => {
	let nockScope;
	let reviewAppsNockScope;
	beforeAll(() => {
		nockScope = nock(BASE_HEROKU_API_URL)
			.matchHeader('accept', 'application/vnd.heroku+json; version=3');
		reviewAppsNockScope = nock(BASE_HEROKU_API_URL)
			.matchHeader('accept', 'application/vnd.heroku+json; version=3.review-apps');
		jest.mock('shellpromise', () => a => a, { virtual: true });

		// WARNING: Disable error logs, to clean up test output
		// Re-enable here if need be
		jest.spyOn(console, 'error').mockImplementation();
	});

	afterAll(() => {
		jest.unmock('shellpromise');
		jest.unmock('./github-api');
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('createReviewApp', () => {
		const { createReviewApp } = reviewApps;

		it('returns created review app', async () => {
			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			const repoName = 'next-amazing';
			const commit = 'a00000000000';
			const githubToken = '';

			reviewAppsNockScope.post('/review-apps')
				.reply(200, {});

			return createReviewApp({
				pipelineId,
				branch,
				repoName,
				commit,
				githubToken
			})
				.then(async res => {
					const { ok } = res;
					expect(ok).toBeTruthy();

					const reviewApp = await res.json();
					expect(reviewApp).toBeTruthy();
				});
		});

		it('returns an error', async () => {
			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			const repoName = 'next-amazing';
			const commit = 'a00000000000';
			const githubToken = '';

			reviewAppsNockScope.post('/review-apps')
				.reply(400, {});

			return createReviewApp({
				pipelineId,
				branch,
				repoName,
				commit,
				githubToken
			})
				.then(async res => {
					const { ok } = res;
					expect(ok).toBeFalsy();

					const error = await res.json();
					expect(error).toBeTruthy();
				});
		});
	});

	describe('findCreatedReviewApp', () => {
		const { findCreatedReviewApp } = reviewApps;

		it('returns review app of branch', async () => {
			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			reviewAppsNockScope.get('/pipelines/pipeline123/review-apps')
				.reply(200, [
					{
						branch
					}
				]);
			const reviewApp = await findCreatedReviewApp({
				pipelineId,
				branch
			});
			expect(reviewApp).toEqual({
				branch
			});
		});

		it('returns undefined if branch review app is not found', async () => {
			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			reviewAppsNockScope.get('/pipelines/pipeline123/review-apps')
				.reply(200, []);
			const reviewApp = await findCreatedReviewApp({
				pipelineId,
				branch
			});
			expect(reviewApp).toBeUndefined();
		});

		it('throws an error', async () => {
			const pipelineId = 'pipeline123';
			reviewAppsNockScope.get('/pipelines/pipeline123/review-apps')
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await findCreatedReviewApp({
					pipelineId
				});
			} catch (error) {
				expect(error.message).toEqual('Some error occurred');
			}
		});
	});

	describe('getAppName', () => {
		const { getAppName } = reviewApps;

		it('returns name', async () => {
			const appId = 'app123';
			nockScope.get('/apps/app123')
				.reply(200, {
					name: 'the-app'
				});
			const name = await getAppName(appId);
			expect(name).toEqual('the-app');
		});

		it('throws an error', async () => {
			const appId = 'app123';
			nockScope.get('/apps/app123')
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await getAppName(appId);
			} catch (error) {
				expect(error.message).toEqual('Some error occurred');
			}
		});
	});

	describe('getBuilds', () => {
		const { getBuilds } = reviewApps;
		it('returns builds', async () => {
			const appId = 'app123';
			nockScope.get('/apps/app123/builds')
				.reply(200, []);
			const builds = await getBuilds(appId);
			expect(builds).toBeTruthy();
		});

		it('throws an error', async () => {
			const appId = 'app123';
			nockScope.get('/apps/app123/builds')
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await getBuilds(appId);
			} catch (error) {
				expect(error.message).toEqual('Some error occurred');
			}
		});
	});

	describe('waitForReviewAppBuild', () => {
		const { waitForReviewAppBuild } = reviewApps;

		it('returns appId of succeeded review app build', async () => {
			const commit = 'a00000000000';
			const appId = 'app123';
			const reviewAppBuild = {
				app: {
					id: appId
				},
				source_blob: {
					version: commit
				},
				status: 'succeeded'
			};
			nockScope.get('/apps/app123/builds')
				.reply(200, [ reviewAppBuild ]);

			const waitedReviewAppBuild = await waitForReviewAppBuild({
				commit
			})(appId);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('waits for succeeded review app build from no review apps', async () => {
			const commit = 'a00000000000';
			const appId = 'app123';
			const succeededReviewAppBuild = {
				app: {
					id: appId
				},
				source_blob: {
					version: commit
				},
				status: 'succeeded'
			};
			nockScope
				.get('/apps/app123/builds')
				.reply(200, [])
				.get('/apps/app123/builds')
				.reply(200, [ succeededReviewAppBuild ]);

			const waitedReviewAppBuild = await waitForReviewAppBuild({
				commit,
				minTimeout: 0
			})(appId);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('waits for succeeded review app build even with errors', async () => {
			const commit = 'a00000000000';
			const appId = 'app123';
			const succeededReviewAppBuild = {
				app: {
					id: appId
				},
				source_blob: {
					version: commit
				},
				status: 'succeeded'
			};
			nockScope
				.get('/apps/app123/builds')
				.reply(400, [])
				.get('/apps/app123/builds')
				.reply(200, [ succeededReviewAppBuild ]);

			const waitedReviewAppBuild = await waitForReviewAppBuild({
				commit,
				minTimeout: 0
			})(appId);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('waits for succeeded review app build from pending', async () => {
			const commit = 'a00000000000';
			const appId = 'app123';
			const pendingReviewAppBuild = {
				source_blob: {
					version: commit
				},
				status: 'pending'
			};
			const succeededReviewAppBuild = {
				app: {
					id: appId
				},
				source_blob: {
					version: commit
				},
				status: 'succeeded'
			};
			nockScope
				.get('/apps/app123/builds')
				.reply(200, [ pendingReviewAppBuild ])
				.get('/apps/app123/builds')
				.reply(200, [ succeededReviewAppBuild ]);

			const waitedReviewAppBuild = await waitForReviewAppBuild({
				commit,
				minTimeout: 0
			})(appId);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('times out', async () => {
			const commit = 'a00000000000';
			const appId = 'app123';
			nockScope
				.get('/apps/app123/builds')
				.times(60)
				.reply(200, []);

			return waitForReviewAppBuild({
				commit,
				minTimeout: 0
			})(appId)
				.catch((error) => {
					const { message } = error;
					expect(message).toMatch('No review app build found');
				});
		});
	});

	describe('waitTillReviewAppCreated', () => {
		const { waitTillReviewAppCreated } = reviewApps;

		it('returns review app id', async () => {
			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'created'
				});

			const waitedReviewAppBuild = await waitTillReviewAppCreated()(reviewApp);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('waits for review app id until created', async () => {
			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope
				.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'pending'
				})
				.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'created'
				});

			const waitedReviewAppBuild = await waitTillReviewAppCreated({
				minTimeout: 0
			})(reviewApp);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('waits for review app id even if there is an error', async () => {
			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope
				.get('/review-apps/reviewApp123')
				.reply(400, {})
				.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'created'
				});

			const waitedReviewAppBuild = await waitTillReviewAppCreated({
				minTimeout: 0
			})(reviewApp);

			expect(waitedReviewAppBuild).toEqual(appId);
		});

		it('throws error if review app is deleted', async () => {
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					status: 'deleted'
				});

			return waitTillReviewAppCreated()(reviewApp)
				.catch(error => {
					const { message } = error;
					expect(message).toMatch('Review app was deleted');
				});
		});

		it('throws error if review app errors', async () => {
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					status: 'errored'
				});

			return waitTillReviewAppCreated()(reviewApp)
				.catch(error => {
					const { message } = error;
					expect(message).toMatch('Review app errored');
				});
		});

		it('times out', async () => {
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				id: reviewAppId
			};
			reviewAppsNockScope
				.get('/review-apps/reviewApp123')
				.times(60)
				.reply(200, []);

			return waitTillReviewAppCreated({ minTimeout: 0 })(reviewApp)
				.catch((error) => {
					const { message } = error;
					expect(message).toMatch('Review app not created yet');
				});
		});
	});
});
