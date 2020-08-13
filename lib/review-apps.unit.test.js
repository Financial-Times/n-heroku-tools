require('isomorphic-fetch');
const nock = require('nock');
const pRetry = require('p-retry');

const reviewApps = require('./review-apps');

const BASE_HEROKU_API_URL = 'https://api.heroku.com';

jest.mock('./github-api');

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
		jest.spyOn(console, 'error').mockImplementation().mockName('console.error');

	});

	afterAll(() => {

		jest.unmock('shellpromise');
		jest.unmock('./github-api');

	});

	afterEach(() => {

		nock.cleanAll();
		jest.resetAllMocks();

	});

	describe('runCheckForBuildSuccessStatus', () => {

		const { runCheckForBuildSuccessStatus } = reviewApps;

		it('returns without throwing an error if awaiting the review app build does not error', async () => {

			const commit = 'a00000000000';
			const appId = 'app123';

			nockScope
				.get('/apps/app123/builds')
				.reply(200, [
					{
						status: 'succeeded',
						app: {
							id: appId
						},
						source_blob: {
							version: commit
						}
					}
				]);

			const returnValue = await runCheckForBuildSuccessStatus({ commit, appId });

			expect(returnValue).toBeUndefined();

		});

		it('throws pRetry.AbortError if the awaiting the review app build errors', async () => {

			const commit = 'a00000000000';
			const appId = 'app123';

			nockScope
				.get('/apps/app123/builds')
				.times(60)
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await runCheckForBuildSuccessStatus({ commit, appId, minTimeout: 0 });
			} catch (error) {
				expect(error.message).toMatch('Some error occurred');
				expect(error).toBeInstanceOf(pRetry.AbortError);
			}

		});

	});

	describe('createReviewApp', () => {

		const { createReviewApp } = reviewApps;

		it('returns created review app', async () => {

			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			const repoName = 'next-amazing';
			const commit = 'a00000000000';
			const githubToken = '';

			const reviewAppResponse = {
				app: {
					id: 'app123'
				},
				branch,
				pipeline: {
					id: pipelineId
				},
				status: 'succeeded'
			};

			const requestBody = {
				pipeline: pipelineId,
				branch,
				source_blob: {
					url: 'https://github.com/some-tarball-link',
					version: commit
				}
			};

			reviewAppsNockScope.post('/review-apps', JSON.stringify(requestBody))
				.reply(200, reviewAppResponse);

			const response = await createReviewApp({ pipelineId, branch, repoName, commit, githubToken });

			const { ok } = response;

			const reviewApp = await response.json();

			expect(ok).toBeTruthy();
			expect(reviewApp).toEqual(reviewAppResponse);

		});

		it('returns an error', async () => {

			const pipelineId = 'pipeline123';
			const branch = 'some-branch';
			const repoName = 'next-amazing';
			const commit = 'a00000000000';
			const githubToken = '';

			reviewAppsNockScope.post('/review-apps')
				.reply(400, {});

			const response = await createReviewApp({ pipelineId, branch, repoName, commit, githubToken });

			const { ok } = response;

			const error = await response.json();

			expect(ok).toBeFalsy();
			expect(error).toBeTruthy();

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

			const reviewApp = await findCreatedReviewApp({ pipelineId, branch });
			expect(reviewApp).toEqual({ branch });

		});

		it('returns undefined if branch review app is not found', async () => {

			const pipelineId = 'pipeline123';
			const branch = 'some-branch';

			reviewAppsNockScope.get('/pipelines/pipeline123/review-apps')
				.reply(200, []);

			const reviewApp = await findCreatedReviewApp({ pipelineId, branch });
			expect(reviewApp).toBeUndefined();

		});

		it('throws an error', async () => {

			const pipelineId = 'pipeline123';

			reviewAppsNockScope.get('/pipelines/pipeline123/review-apps')
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await findCreatedReviewApp({ pipelineId });
			} catch (error) {
				expect(error.message).toEqual('Some error occurred');
			}

		});

	});

	describe('runCheckForReviewAppCreatedStatus', () => {

		const { runCheckForReviewAppCreatedStatus } = reviewApps;

		it('returns appId', async () => {

			const appId = 'app123';
			const commit = 'ababa';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'created'
				});

			const returnedAppId = await runCheckForReviewAppCreatedStatus({ commit, reviewApp });
			expect(returnedAppId).toEqual(appId);

		});

		it('throws pRetry.AbortError if an error when deleting the review app errors', async () => {

			const commit = 'ababa';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.times(60)
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await runCheckForReviewAppCreatedStatus({ commit, reviewApp, minTimeout: 0 });
			} catch (error) {
				expect(error.message).toMatch('Some error occurred');
				expect(error).toBeInstanceOf(pRetry.AbortError);
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

	describe('deleteReviewAppAndThrowError', () => {

		const { deleteReviewAppAndThrowError } = reviewApps;

		it('throws error (to trigger retry of calling function) after successful deletion of review app', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };
			const commit = 'ababa';
			const appId = 'app123';

			reviewAppsNockScope
				.delete('/review-apps/reviewApp123')
				.reply(200);

			try {
				await deleteReviewAppAndThrowError({ reviewApp, commit, appId });
			} catch (error) {
				expect(error.message).toMatch('No review app build found for app id \'app123\'; commit \'ababa\'');
				expect(error.message).toMatch('The presence of a review app without a corresponding build is likely the result of a rebase.');
				expect(error.message).toMatch('The review app has been deleted and a rebuild will now be attempted.');
				expect(error).toBeInstanceOf(Error);
			}

		});

		it('throws pRetry.AbortError if an error when deleting the review app errors', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };
			const commit = 'ababa';
			const appId = 'app123';

			reviewAppsNockScope
				.delete('/review-apps/reviewApp123')
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await deleteReviewAppAndThrowError({ reviewApp, commit, appId });
			} catch (error) {
				expect(error.message).toMatch('Some error occurred');
				expect(error).toBeInstanceOf(pRetry.AbortError);
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

	describe('getAppBuildWithCommit', () => {

		const { getAppBuildWithCommit } = reviewApps;

		it('returns build', async () => {

			const appId = 'app123';
			const commit = 'ababa';

			nockScope.get('/apps/app123/builds')
				.reply(200, [
					{
						source_blob: {
							version: commit
						}
					}
				]);

			const build = await getAppBuildWithCommit({ appId, commit });
			expect(build).toBeTruthy();

		});

		it('returns undefined if there is no build with the commit', async () => {

			const appId = 'app123';
			const commit = 'ababa';

			nockScope.get('/apps/app123/builds')
				.reply(200, [
					{
						source_blob: {
							version: 'wrong commit'
						}
					}
				]);

			const build = await getAppBuildWithCommit({ appId, commit });
			expect(build).toBeFalsy();

		});

		it('returns undefined if there is no builds', async () => {

			const appId = 'app123';
			const commit = 'ababa';

			nockScope.get('/apps/app123/builds')
				.reply(200, []);

			const build = await getAppBuildWithCommit({ appId, commit });
			expect(build).toBeFalsy();

		});

	});

	describe('repeatedCheckForBuildSuccessStatus', () => {

		const { repeatedCheckForBuildSuccessStatus } = reviewApps;

		it('returns without throwing an error if the app build is returned with a status of \'succeeded\'', async () => {

			const commit = 'a00000000000';
			const appId = 'app123';
			const reviewAppBuild = {
				source_blob: {
					version: commit
				},
				status: 'succeeded'
			};

			nockScope.get('/apps/app123/builds')
				.reply(200, [reviewAppBuild]);

			const returnValue = await repeatedCheckForBuildSuccessStatus({ commit, appId });

			expect(returnValue).toBeUndefined();

		});

		it('will retry if an error is thrown when attempting to get the app build status', async () => {

			const commit = 'a00000000000';
			const appId = 'app123';

			nockScope.get('/apps/app123/builds')
				.times(60)
				.reply(400, {
					message: 'Some error occurred'
				});

			try {
				await repeatedCheckForBuildSuccessStatus({ commit, appId, minTimeout: 0 });
			} catch (error) {
				expect(error.message).toMatch('Some error occurred');
				expect(error).toBeInstanceOf(Error);
			}

		});

		it('will retry if the build returned does not have a status of \'succeeded\'', async () => {

			const commit = 'a00000000000';
			const appId = 'app123';
			const reviewAppBuild = {
				source_blob: {
					version: commit
				},
				status: 'pending'
			};

			nockScope.get('/apps/app123/builds')
				.times(60)
				.reply(200, [reviewAppBuild]);

			try {
				await repeatedCheckForBuildSuccessStatus({ commit, appId, minTimeout: 0 });
			} catch (error) {
				expect(error.message).toMatch('Review app build for app id \'app123\' (commit \'a00000000000\') not done yet: pending');
				expect(error).toBeInstanceOf(Error);
			}

		});

	});

	describe('repeatedCheckForReviewAppCreatedStatus', () => {

		const { repeatedCheckForReviewAppCreatedStatus } = reviewApps;

		it('returns review app id', async () => {

			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'created'
				});

			const waitedReviewAppBuild = await repeatedCheckForReviewAppCreatedStatus({ reviewApp });

			expect(waitedReviewAppBuild).toEqual(appId);

		});

		it('waits for review app id until created', async () => {

			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

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

			const waitedReviewAppBuild = await repeatedCheckForReviewAppCreatedStatus({ reviewApp, minTimeout: 0 });
			expect(waitedReviewAppBuild).toEqual(appId);

		});

		it('waits for review app id even if there is a http error', async () => {

			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

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

			const waitedReviewAppBuild = await repeatedCheckForReviewAppCreatedStatus({ reviewApp, minTimeout: 0 });
			expect(waitedReviewAppBuild).toEqual(appId);

		});

		it('throws error if review app status is deleted', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					status: 'deleted'
				});

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp });
			} catch ({ message }) {
				expect(message).toMatch('Review app was deleted');
			}

		});

		it('throws error if review app status is errored', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					status: 'errored'
				});

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp });
			} catch ({ message }) {
				expect(message).toMatch('Review app errored');
			}

		});

		it('can error if app is null', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					app: null,
					status: 'errored'
				});

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp });
			} catch ({ message }) {
				expect(message).toMatch('Review app errored');
			}

		});

		it('logs output stream url if review app status is errored', async () => {

			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };
			const commit = 'ababab';

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, {
					app: {
						id: appId
					},
					status: 'errored'
				});

			nockScope.get('/apps/app123/builds')
				.reply(200, [
					{
						app: {
							id: appId
						},
						source_blob: {
							version: commit
						},
						output_stream_url: 'https://heroku.com/builds/output/app123'
					}
				]);

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp, commit });
			} catch (error) {
				expect(console.error.mock.calls[0][0]).toMatch('https://heroku.com/builds/output/app123'); // eslint-disable-line no-console
			}

		});

		it('logs error if review app status is errored and build endpoint errors', async () => {

			const appId = 'app123';
			const reviewAppId = 'reviewApp123';
			const reviewApp = {
				app: {
					id: appId
				},
				id: reviewAppId,
				status: 'errored'
			};

			reviewAppsNockScope.get('/review-apps/reviewApp123')
				.reply(200, reviewApp);

			nockScope.get('/apps/app123/builds')
				.reply(400);

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp });
			} catch (error) {
				expect(console.error.mock.calls[0][0]).toMatch('Could not get app build'); // eslint-disable-line no-console
			}

		});

		it('times out', async () => {

			const reviewAppId = 'reviewApp123';
			const reviewApp = { id: reviewAppId };

			reviewAppsNockScope
				.get('/review-apps/reviewApp123')
				.times(60)
				.reply(200, []);

			try {
				await repeatedCheckForReviewAppCreatedStatus({ reviewApp, minTimeout: 0 });
			} catch ({ message }) {
				expect(message).toMatch('Review app not created yet');
			}

		});

	});

	describe('getReviewAppName', () => {

		const { getReviewAppName } = reviewApps;

		describe('attempt to create review app for branch responds that it already exists', () => {

			it('throws error if it cannot find review app in pipeline for specified branch', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, []);

				try {
					await getReviewAppName({ appName, repoName, branch, commit, githubToken });
				} catch ({ message }) {
					expect(message).toMatch('No review app found for pipeline pipelineId, branch new-idea-branch');
				}

			});

			it('throws error if it can find review app in pipeline for specified branch but its status is \'deleted\'', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'deleted',
						app: {
							id: appId
						}
					});

				try {
					await getReviewAppName({ appName, repoName, branch, commit, githubToken, minTimeout: 0 });
				} catch ({ message }) {
					expect(message).toMatch('Review app was deleted');
				}

			});

			it('throws error if it can find review app in pipeline for specified branch but its status is \'errored\'', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					});
				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'errored',
						app: {
							id: appId
						}
					});

				try {
					await getReviewAppName({ appName, repoName, branch, commit, githubToken, minTimeout: 0 });
				} catch ({ message }) {
					expect(message).toMatch('Review app errored');
					expect(message).toMatch(appId);
				}

			});

			it('deletes review app if it cannot find corresponding build for commit; then recreates review app and returns its name', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123/builds')
					.reply(200, [
						{
							status: 'succeeded',
							app: {
								id: appId
							},
							source_blob: {
								version: 'b456' // i.e. does not match `commit`.
							}
						}
					])
					.get('/apps/app123')
					.reply(200, {
						name: appName
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.times(2)
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					})
					.delete('/review-apps/reviewAppId')
					.reply(200)
					.post('/review-apps')
					.reply(200, {
						id: reviewAppId,
						status: 'created'
					});

				const name = await getReviewAppName({ appName, repoName, branch, commit, githubToken, minTimeout: 0 });
				expect(name).toEqual(appName);

			});

			it('creates a new review app build if a review app already exists; then returns its name', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123/builds')
					.reply(200, [
						{
							status: 'succeeded',
							app: {
								id: appId
							},
							source_blob: {
								version: commit
							}
						}
					])
					.get('/apps/app123')
					.reply(200, {
						name: appName
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					});

				const name = await getReviewAppName({ appName, repoName, branch, commit, githubToken });
				expect(name).toEqual(appName);

			});

			it('errors if review app build status is \'errored\' and includes output stream link in the error message', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123/builds')
					.reply(200, [
						{
							source_blob: {
								version: commit
							},
							status: 'failed',
							output_stream_url: 'https://heroku.com/builds/output/app123'
						}
					]);

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					});

				try {
					await getReviewAppName({ appName, repoName, branch, commit, githubToken });
				} catch (error) {
					expect(error.message).toMatch('Review app build failed');
					expect(error.message).toMatch('https://heroku.com/builds/output/app123');
				}

			});

			it('waits for pending review app build to finish by retrying until the build status is \'succeeded\'', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123/builds')
					.reply(200, [
						{
							status: 'pending',
							app: {
								id: appId
							},
							source_blob: {
								version: commit
							}
						}
					])
					.get('/apps/app123/builds')
					.reply(200, [
						{
							status: 'succeeded',
							app: {
								id: appId
							},
							source_blob: {
								version: commit
							}
						}
					])
					.get('/apps/app123')
					.reply(200, {
						name: appName
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					});

				const name = await getReviewAppName({ appName, repoName, branch, commit, githubToken, minTimeout: 0 });
				expect(name).toEqual(appName);

			});

			it('times out if pending review app build does not achieve \'succeeded\' status after specified number of retries', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123/builds')
					.times(60)
					.reply(200, [
						{
							status: 'pending',
							app: {
								id: appId
							},
							source_blob: {
								version: commit
							}
						}
					]);

				reviewAppsNockScope
					.post('/review-apps')
					.reply(409, {
						id: 'conflict',
						message: 'A review app already exists for the post-build branch'
					})
					.get('/pipelines/pipelineId/review-apps')
					.reply(200, [
						{
							id: reviewAppId,
							branch
						}
					])
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					});

				try {
					await getReviewAppName({ appName, repoName, branch, commit, githubToken, minTimeout: 0 });
				} catch (error) {
					expect(error.message).toMatch('Review app build for app id \'app123\' (commit \'a123\') not done yet: pending');
				}

			});

		});

		describe('attempt to create review app for branch responds that it does not yet exist', () => {

			it('returns review app name', async () => {

				const appName = 'next-app';
				const repoName = 'next-app-repo';
				const branch = 'new-idea-branch';
				const commit = 'a123';
				const githubToken = 'github-token-123';

				const pipelineId = 'pipelineId';
				const reviewAppId = 'reviewAppId';
				const appId = 'app123';

				nockScope
					.get('/pipelines/next-app')
					.reply(200, {
						id: pipelineId
					})
					.get('/apps/app123')
					.reply(200, {
						name: appName
					});

				reviewAppsNockScope
					.post('/review-apps')
					.reply(200, {
						id: reviewAppId,
						status: 'created'
					})
					.get('/review-apps/reviewAppId')
					.reply(200, {
						status: 'created',
						app: {
							id: appId
						}
					});

				const name = await getReviewAppName({ appName, repoName, branch, commit, githubToken });
				expect(name).toEqual(appName);

			});

		});

	});
});
