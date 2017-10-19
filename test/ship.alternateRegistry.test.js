'use strict';

const mockery = require('mockery');
const sinon = require('sinon');
const co = require('co');

const OVERRIDE_REGISTRY_URI = 'https://next-registry.ft.com/v2/services.kat.json';

describe('tasks/ship (using alternate registry)', function (){

	function stubbedPromise(value, property){
		const stub = sinon.stub().returns(Promise.resolve(value));
		if (property) {
			const obj = {};
			obj[property] = stub;
			return obj;
		} else {
			return stub;
		}
	}

	var mockApps = {
		staging: 'ft-kat-app-staging',
		production: {
			eu: 'ft-kat-app-eu',
			us: 'ft-kat-app-us'
		}
	};

	var ship;
	var mockScale = stubbedPromise(null, 'task');
	var mockConfigure = stubbedPromise(null, 'task');
	var mockDeploy = stubbedPromise(null, 'task');
	var mockPipelines = {getApps: stubbedPromise(mockApps), supported:stubbedPromise(true), promote:stubbedPromise(null)};

	before(function (){
		mockery.registerMock('./configure', mockConfigure);
		mockery.registerMock('./deploy', mockDeploy);
		mockery.registerMock('./scale', mockScale);
		mockery.registerMock('../lib/pipelines', mockPipelines);
		mockery.registerMock(process.cwd() + '/package.json', { name: 'ft-kat-app' });
		mockery.enable({warnOnUnregistered:false,useCleanCache:true});
		ship = require('../tasks/ship').task;
	});

	after(function (){
		mockery.deregisterMock('./configure');
		mockery.deregisterMock('./deploy');
		mockery.deregisterMock('./scale');
		mockery.deregisterMock('../lib/pipelines');
		mockery.deregisterMock(process.cwd() + '/package.json');
		mockery.disable();
	});

	it('Should be able to run the configure task on all apps, using the pipeline name as the source', function (){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				configure:true,
				multiregion:true,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockConfigure.task, {
				source: pipelineName,
				target: mockApps.staging,
				registry: OVERRIDE_REGISTRY_URI,
			});
			sinon.assert.calledWith(mockConfigure.task, {
				source: pipelineName,
				target: mockApps.production.eu,
				overrides: ['REGION=EU'],
				registry: OVERRIDE_REGISTRY_URI,
			});
			sinon.assert.calledWith(mockConfigure.task, {
				source: pipelineName,
				target: mockApps.production.us,
				overrides: ['REGION=US'],
				registry: OVERRIDE_REGISTRY_URI,
			});
		});
	});

	it('Should scale to staging app up to 1 web dyno before deploying', function (){
		let pipelineName = 'test';
		let appName = 'ft-kat-app';

		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockScale.task, {
				source: 'kat-app',
				target:mockApps.staging,
				minimal:true,
				registry: OVERRIDE_REGISTRY_URI
			});
		});
	});

	it('Should be able to deploy to the staging app', function (){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockDeploy.task, { app:mockApps.staging, authenticatedSmokeTests: true });
		});
	});

	it('Should be able to promote the slug to production', function (){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockPipelines.promote, mockApps.staging);
		});
	});

	it('Should be able to run the scale task on the production apps', function (){
		let pipelineName = 'test';
		let appName = 'ft-kat-app';
		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				scale:true,
				multiregion:true,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockScale.task, {
				source:'kat-app',
				target:mockApps.staging,
				registry: OVERRIDE_REGISTRY_URI
			});
			sinon.assert.calledWith(mockScale.task, {
				source:'kat-app',
				target:mockApps.production.eu,
				registry: OVERRIDE_REGISTRY_URI
			});
			sinon.assert.calledWith(mockScale.task, {
				source:'kat-app',
				target:mockApps.production.us,
				registry: OVERRIDE_REGISTRY_URI
			});

		});
	});

	it('Should scale the staging app down to 0 when complete', function (){
		let pipelineName = 'test';
		let appName = 'ft-kat-app';

		return co(function* (){
			yield ship({
				pipeline:pipelineName,
				registry: OVERRIDE_REGISTRY_URI
			});

			sinon.assert.calledWith(mockScale.task, {
				source:'kat-app',
				target:mockApps.staging,
				inhibit:true,
				registry: OVERRIDE_REGISTRY_URI
			});
		});
	});

});
