const expect = require('chai').expect;
const nock = require('nock');

const { getAppName } = require('../../lib/review-apps');

describe('review-apps', function () {
	let nockScope;
	before(() => {
		nockScope = nock('https://api.heroku.com');
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
					expect(name).to.equal('the-app');
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
					expect(error.message).to.equal('Some error occurred');
				});
		});
	});
});
