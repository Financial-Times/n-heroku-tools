require('isomorphic-fetch');
const nock = require('nock');
const herokuApi = require('./heroku-api');

describe('heroku-api', () => {
	let nockScope;
	beforeAll(() => {
		nockScope = nock('https://api.heroku.com');
	});

	afterEach(() => {
		nock.cleanAll();
	});

	it('calls the endpoint', async () => {
		const endpoint = '/something';
		nockScope.get(endpoint)
			.reply(200, {
				something: 'yes'
			});
		const output = await herokuApi({ endpoint });

		expect(output).toEqual({
			something: 'yes'
		});
	});

	it('uses the auth token', async () => {
		const endpoint = '/';
		const authToken = 'some123';
		nockScope.get(endpoint)
			.reply(200, function () {
				const { headers } = this.req;
				return {
					headers
				};
			});
		const { headers: { authorization } } = await herokuApi({ endpoint, authToken });
		const [ bearerToken ] = authorization;
		expect(bearerToken).toEqual(`Bearer ${authToken}`);
	});

	it('throws an error on failure', async () => {
		const endpoint = '/';
		const authToken = 'some123';
		nockScope.get(endpoint)
			.reply(400, {});

		try {
			await herokuApi({ endpoint, authToken });
		} catch (error) {
			const { name, status } = error;
			expect(name).toEqual('BAD_RESPONSE');
			expect(status).toEqual(400);
		};
	});
});
