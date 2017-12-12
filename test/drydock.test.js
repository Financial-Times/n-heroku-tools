const expect = require('chai').expect;
const sinon = require('sinon');

const drydockTask = require('../tasks/drydock').task;
const pipelines = require('../lib/pipelines');
const provision = require('../tasks/provision');
const destroy = require('../tasks/destroy');

describe('Drydock', () => {

	const mockAppName = 'ft-next-testing';
	const mockOrganisation = 'unit-test-ft';
	let sandbox;
	let provisionStub;
	let destroyStub;

	beforeEach(() => {
		sandbox = sinon.sandbox.create();
		sandbox.stub(pipelines, 'create').resolves({});
		sandbox.stub(pipelines, 'addAppToPipeline').resolves({});
		provisionStub = sandbox.stub(provision, 'task');
		destroyStub = sandbox.stub(destroy, 'task');
	});

	afterEach(() => {
		sandbox.restore();
	});

	it('should always provision a staging app', () => {
		return drydockTask(mockAppName, { organisation: mockOrganisation })
			.then(() => {
				expect(provisionStub.calledWith(`${mockAppName}-staging`)).to.equal(true);
			});
	});

	it('should only provision an eu production stage app if not multiregion', () => {
		return drydockTask(mockAppName, { organisation: mockOrganisation })
			.then(() => {
				expect(provisionStub.calledWith(`${mockAppName}-eu`, { region: 'eu', organisation: mockOrganisation })).to.equal(true);
				expect(provisionStub.calledWith(`${mockAppName}-us`)).to.equal(false);
			});
	});

	it('should create the pipeline properly', () => {
		return drydockTask(mockAppName, { organisation: mockOrganisation })
			.then(() => {
				expect(pipelines.create.calledWith(mockAppName, { stagingApp: `${mockAppName}-staging`, organisation: mockOrganisation })).to.equal(true);
			});
	});

	it('should only add the eu app to the pipeline', () => {
		return drydockTask(mockAppName, { organisation: mockOrganisation })
			.then(() => {
				expect(pipelines.addAppToPipeline.calledWith(mockAppName, `${mockAppName}-eu`, 'production')).to.equal(true);
				expect(pipelines.addAppToPipeline.calledWith(mockAppName, `${mockAppName}-us`, 'production')).to.equal(false);
			});
	});

	context('when multiregion', () => {

		it('should provision an app in both EU and the US regions', () => {
			return drydockTask(mockAppName, { multiregion: true, organisation: mockOrganisation })
				.then(() => {
					expect(provisionStub.calledWith(`${mockAppName}-eu`, { region: 'eu', organisation: mockOrganisation })).to.equal(true);
					expect(provisionStub.calledWith(`${mockAppName}-us`, { region: 'us', organisation: mockOrganisation })).to.equal(true);
				});
		});

		it('should add both region apps to the pipeline', () => {
			return drydockTask(mockAppName, { multiregion: true, organisation: mockOrganisation })
				.then(() => {
					expect(pipelines.addAppToPipeline.calledWith(mockAppName, `${mockAppName}-eu`, 'production')).to.equal(true);
					expect(pipelines.addAppToPipeline.calledWith(mockAppName, `${mockAppName}-us`, 'production')).to.equal(true);
				});
		});

	});

	context('if an error occurs', () => {

		beforeEach(() => {
			pipelines.create.rejects(new Error('Some test pipeline creation error'));
		});

		it('should cleanup', () => {
			return drydockTask(mockAppName, { multiregion: true, organisation: mockOrganisation })
				.catch(() => {
					expect(destroyStub.calledWith({ app: `${mockAppName}-staging` }), 'staging app destroyed').to.equal(true);
					expect(destroyStub.calledWith({ app: `${mockAppName}-eu` }), 'eu app destroyed').to.equal(true);
					expect(destroyStub.calledWith({ app: `${mockAppName}-us` }), 'us app destroyed').to.equal(true);
				});
		});

	});

});
