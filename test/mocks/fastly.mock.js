'use strict';
let sinon = require('sinon');

let fakeServiceId = '1234567';

function mockPromiseMethod (obj, name, value){
	obj[name] = sinon.stub().returns(Promise.resolve(value));
}

let methods = {
	'getServices': [{id:fakeServiceId}],
	'cloneVersion': {number:1},
	'getVcl': [{name:'blah.vcl'}],
	'deleteVcl' : null,
	'updateVcl' : null,
	'setVclAsMain': null,
	'validateVersion': {status:'ok'},
	'activateVersion': null
};

let mock = {};
let called = false;

module.exports = function (){
	if(called){
		return mock;
	}

	mock = {};
	let func = mockPromiseMethod.bind(null, mock);
	Object.keys(methods).forEach(function (key){
		func(key, methods[key]);
	});

	called = true;
	return mock;
};

module.exports.fakeServiceId = fakeServiceId;