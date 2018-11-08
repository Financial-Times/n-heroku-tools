const nock = require('nock');
const expect = require('chai').expect;
const herokuApi = require('../../lib/heroku-api');

describe('heroku-api', function () {
	it('calls the endpoint', async () => {
		const endpoint = '/something';
		nock('https://api.heroku.com')
			.get(endpoint)
			.reply(200, {
				something: 'yes'
			});
		const output = await herokuApi({ endpoint });

		expect(output).to.deep.equal({
			something: 'yes'
		});
	});

	it('uses the auth token', async () => {
		const endpoint = '/';
		const authToken = 'some123';
		nock('https://api.heroku.com')
			.get(endpoint)
			.reply(200, function () {
				const { headers } = this.req;
				return {
					headers
				};
			});
		const { headers: { authorization } } = await herokuApi({ endpoint, authToken });
		const [ bearerToken ] = authorization;
		expect(bearerToken).to.equal(`Bearer ${authToken}`);
	});

	it('throws an error on failure', async () => {
		const endpoint = '/';
		const authToken = 'some123';
		nock('https://api.heroku.com')
			.get(endpoint)
			.reply(400, {});

		await herokuApi({ endpoint, authToken })
			.catch((error) => {
				const { name, status } = error;
				expect(name).to.equal('BAD_RESPONSE');
				expect(status).to.equal(400);
			});
	});
});
