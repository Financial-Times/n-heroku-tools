'use strict';
const mockery = require('mockery');
const sinon = require('sinon');
const co = require('co');

describe('tasks/ship', function(){

	function stubbedPromise(value){
		return sinon.stub().returns(Promise.resolve(value));
	}

	var mockApps = {
		staging: 'ft-next-app-staging',
		production: {
			eu: 'ft-next-app-eu',
			us: 'ft-next-app-us'
		}
	};

	var ship;
	var mockScale = stubbedPromise(null);
	var mockConfigure = stubbedPromise(null);
	var mockDeploy = stubbedPromise(null);
	var mockPipelines = {getApps: stubbedPromise(mockApps), supported:stubbedPromise(true), promote:stubbedPromise(null)};

	before(function(){
		mockery.registerMock('./configure', mockConfigure);
		mockery.registerMock('./deploy', mockDeploy);
		mockery.registerMock('./scale', mockScale);
		mockery.registerMock('../lib/pipelines', mockPipelines);
		mockery.enable({warnOnUnregistered:false,useCleanCache:true});
		ship = require('../tasks/ship');
	});

	after(function(){
		mockery.disable();
	});

	it('Should be able to run the configure task on all apps, using the pipeline name as the source', function(){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({pipeline:pipelineName, configure:true, multiregion:true});

			sinon.assert.calledWith(mockConfigure, {source:pipelineName, target:mockApps.staging});
			sinon.assert.calledWith(mockConfigure, {source:pipelineName, target:mockApps.production.eu, overrides: ["REGION=EU"]});
			sinon.assert.calledWith(mockConfigure, {source:pipelineName, target:mockApps.production.us, overrides: ["REGION=US"]});
		});
	});

	it('Should scale to staging app up to 1 web dyno before deploying', function(){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({pipeline:pipelineName});

			sinon.assert.calledWith(mockScale, {target:mockApps.staging, scale:'web=1'});
		});
	});

	it('Should be able to deploy to the staging app', function(){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({pipeline:pipelineName});

			sinon.assert.calledWith(mockDeploy, {app:mockApps.staging, skipEnablePreboot:true});
		});
	});

	it('Should be able to promote the slug to production', function(){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({pipeline:pipelineName});

			sinon.assert.calledWith(mockPipelines.promote, mockApps.staging);
		});
	});

	it('Should be able to run the scale task on the production apps', function(){
		let pipelineName = 'test';
		let appName = 'build-tools';
		return co(function* (){
			yield ship({pipeline:pipelineName,scale:true,multiregion:true});

			sinon.assert.calledWith(mockScale, {source:appName, target:mockApps.staging});
			sinon.assert.calledWith(mockScale, {source:appName, target:mockApps.production.eu});
			sinon.assert.calledWith(mockScale, {source:appName, target:mockApps.production.us});

		});
	});

	it('Should scale the staging app down to 0 when complete', function(){
		let pipelineName = 'test';
		return co(function* (){
			yield ship({pipeline:pipelineName});

			sinon.assert.calledWith(mockScale, {target:mockApps.staging, scale:'web=0'});
		});
	});

});
