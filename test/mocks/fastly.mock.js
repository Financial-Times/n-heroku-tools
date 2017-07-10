'use strict';
const sinon = require('sinon');

const fakeServiceId = '1234567';

function mockPromiseMethod (obj, name, value){
	obj[name] = sinon.stub().returns(Promise.resolve(value));
}

const methods = {
	'getServices': [{id: fakeServiceId}],
	'cloneVersion': {number: 1},
	'getVcl': [{name: 'blah.vcl'}],
	'deleteVcl': null,
	'updateVcl': null,
	'setVclAsMain': null,
	'validateVersion': {status: 'ok'},
	'activateVersion': null
};

let mock = {};
let called = false;

module.exports = function (){
	if(called){
		return mock;
	}

	mock = {};
	const func = mockPromiseMethod.bind(null, mock);
	Object.keys(methods).forEach(function (key){
		func(key, methods[key]);
	});

	called = true;
	return mock;
};

module.exports.fakeServiceId = fakeServiceId;
