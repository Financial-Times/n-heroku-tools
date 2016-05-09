'use strict';
require('isomorphic-fetch');
const expect = require('chai').expect;
const co = require('co');
const mockery = require('mockery');
const sinon = require('sinon');

describe('lib/pipelines', function (){

	var pipelines;
	var shellPromiseMock;

	after(function (){
		mockery.disable();
	});

	afterEach(function (){
		mockery.deregisterMock('shellpromise');
		mockery.resetCache();
		shellPromiseMock = null;
	});

	function setup(options){
		shellPromiseMock = sinon.stub().returns(options.shellPromiseReturns);
		if(options.mockShellPromise){
			mockery.registerMock('shellpromise', shellPromiseMock);
		}

		mockery.enable({warnOnUnregistered:false,useCleanCache:true});
		pipelines = require('../lib/pipelines');
	}

	it('Should be able to test if pipelines are supported on the host system', function (){
		setup({mockShellPromise:true,shellPromiseReturns:Promise.reject(new Error('blah'))});
		return co(function* (){
			let result = yield pipelines.supported();

			expect(result).to.be.false;
		});
	});

	it('Should be able to get the apps associated with a given pipeline', function (){
		this.timeout(10000);
		setup({mockShellPromise:false});
		return co(function* (){
			let apps = yield pipelines.getApps('ft-next-health');
			expect(apps.production.eu).to.equal('ft-next-health-eu');
		});
	});

	it('Should be able to promote a slug on a given pipeline', function (){
		setup({mockShellPromise:true, shellPromiseReturns:Promise.resolve(null)});
		let appName = 'ft-next-health-staging';
		return co(function* (){
			yield pipelines.promote(appName);

			sinon.assert.calledWith(shellPromiseMock, 'heroku pipelines:promote -a ' + appName);
		});
	});


});
