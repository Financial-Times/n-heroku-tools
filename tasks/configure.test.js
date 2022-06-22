require('isomorphic-fetch');
const nock = require('nock');

const configure = require('./configure');
const createMockProgram = require('./__mocks__/create-mock-program');

const REGISTRY_URL = 'https://some-registry.com';

const mockConfigureEndpoints = ({
	herokuScope,
	registryScope,
	vaultScope,
	source,
	target,
	pipelineId,
	systemCode,
	registryName
}) => {
	// Get pipelines information
	const endpoint = `/pipelines/${source}`;
	herokuScope.get(endpoint).reply(200, () => {
		return {
			id: pipelineId
		};
	});

	// Get registry info for vault location
	registryScope.get('/').reply(200, () => {
		return [
			{
				name: registryName,
				code: systemCode,
				config: `https://vault.in.ft.com/v1/secret/data/teams/next/${systemCode}`
			}
		];
	});

	// Get vault vars
	vaultScope
		.get('/v1')
		.reply(200, () => {
			return {};
		})
		.get('/v1/secret/data/teams/next/shared/production')
		.reply(200, () => {
			return {};
		})
		.get(`/v1/secret/data/teams/next/${systemCode}/production`)
		.reply(200, () => {
			return {};
		})
		.get(`/v1/secret/data/teams/next/${systemCode}/shared`)
		.reply(200, () => {
			return {
				data: {
					env: []
				}
			};
		});

	// Get environment variables from heroku
	herokuScope
		.get(`/apps/${target}/config-vars`)
		.reply(200, () => {
			return {};
		})
		.patch(`/apps/${target}/config-vars`)
		.reply(200, () => {
			return {};
		});
};

describe('configure', () => {
	let mockProgram;
	let herokuScope;
	let registryScope;
	let vaultScope;
	beforeAll(() => {
		herokuScope = nock('https://api.heroku.com');
		registryScope = nock(REGISTRY_URL);
		vaultScope = nock('https://vault.in.ft.com');
	});

	beforeEach(() => {
		mockProgram = createMockProgram();
		configure(mockProgram, {
			list: () => {},
			exit: () => {}
		});
	});

	afterEach(() => {
		jest.resetAllMocks();
		nock.cleanAll();
	});

	afterAll(() => {
		jest.unmock('shellpromise');
	});

	it('shows help', () => {
		const [firstCall] = mockProgram.command.mock.calls;
		const [commandFn] = firstCall;
		expect(commandFn).toContain('configure');
	});

	it('run action', async () => {
		const [firstCall] = mockProgram.action.mock.calls;
		const [actionFn] = firstCall;

		const source = 'ft-next-hello';
		const target = 'ft-next-hello-staging';
		const pipelineId = 'ft-next-hello-id';
		const systemCode = 'next-hello';
		const registryName = 'hello';

		mockConfigureEndpoints({
			herokuScope,
			registryScope,
			vaultScope,
			source,
			target,
			pipelineId,
			systemCode,
			registryName
		});

		await actionFn(source, target, {
			registry: REGISTRY_URL
		});
	});
});
