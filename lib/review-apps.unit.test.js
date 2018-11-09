require('isomorphic-fetch');
const nock = require('nock');

const { getAppName } = require('./review-apps');

describe('review-apps', () => {
	let nockScope;
	beforeAll(() => {
		nockScope = nock('https://api.heroku.com');
		jest.mock('shellpromise', () => a => a, { virtual: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('getAppName', () => {
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
});
