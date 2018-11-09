require('isomorphic-fetch');
const nock = require('nock');

const { getAppName } = require('./review-apps');

describe('review-apps', function () {
	let nockScope;
	beforeAll(() => {
		nockScope = nock('https://api.heroku.com');
		jest.mock('shellpromise', () => a => a, { virtual: true });
	});

	afterEach(() => {
		nock.cleanAll();
	});

	describe('getAppName', function () {
		it('returns name', function () {
			const appId = 'app123';
			nockScope.get('/apps/app123')
				.reply(200, {
					name: 'the-app'
				});
			return getAppName(appId)
				.then(name => {
					expect(name).toEqual('the-app');
				});
		});

		it('throws an error', function () {
			const appId = 'app123';
			nockScope.get('/apps/app123')
				.reply(400, {
					message: 'Some error occurred'
				});
			return getAppName(appId)
				.catch((error) => {
					expect(error.message).toEqual('Some error occurred');
				});
		});
	});
});
