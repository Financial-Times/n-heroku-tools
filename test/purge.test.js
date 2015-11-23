/* global describe, it */
'use strict';
require('isomorphic-fetch');
var expect = require('chai').expect;

var purge = require('../tasks/purge');

describe('Purge', function(){

	//fixme It looks like someone has broken PURGE requests to next...
	it.skip('Should be able to PURGE a given url', function(){
		return purge('https://next.ft.com/opt-in').then(function(result){
			expect(result).to.contain('"status": "ok"');
		});
	});
});
