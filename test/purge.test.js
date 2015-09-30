/* global describe, it */
var expect = require('chai').expect;

var purge = require('../tasks/purge');

describe('Purge', function(){

	it('Should be able to PURGE a given url', function(done){
		purge('https://next.ft.com/opt-in').then(function(result){
			expect(result).to.contain('"status": "ok"');
			done();
		});
	});

});
