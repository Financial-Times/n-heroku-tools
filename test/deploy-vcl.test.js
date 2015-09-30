/* global describe, it, before, after */
'use strict';
var sinon = require('sinon');
var expect = require('chai').expect;
process.env.FASTLY_APIKEY ='12345';
var mockery = require('mockery');
var fastlyMock = require('./mocks/fastly.mock');

mockery.registerMock('fastly', fastlyMock);
var path = require('path');

describe('Deploy VCL', function(){

	var deployVcl;

	before(function(){
		mockery.enable({warnOnUnregistered:false});
		deployVcl = require('../tasks/deploy-vcl');
	});

	after(function(){
		mockery.disable();
	});

	it('Should be able to deploy some vcl', function(done){
		deployVcl(path.resolve(__dirname, './fixtures/vcl')+'/', {service:fastlyMock.fakeServiceId}).then(function(){
			sinon.assert.called(fastlyMock().updateVcl);
			done();
		});
	});

	it('Should replace placeholders with environment vars', function(done){
		var value = "value";
		process.env.AUTH_KEY = value;
		deployVcl(
			path.resolve(__dirname, './fixtures/vcl')+'/',
			{service:fastlyMock.fakeServiceId,vars:'AUTH_KEY'})
		.then(function(){
			var vcl = fastlyMock().updateVcl.lastCall.args[1].content;
				console.log(vcl);
			expect(vcl).to.contain(value);
				expect(vcl).not.to.contain('${AUTH_KEY}');
			done();
		});
	});

});
