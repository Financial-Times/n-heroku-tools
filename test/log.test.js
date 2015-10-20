'use strict';
const expect = require('chai').expect;
var fetchMock = require('fetch-mock');

const file = require('../lib/log');

process.env.KONSTRUCTOR_API_KEY = '123'

fetchMock.registerRoute([
	{
		name: 'makeKonstructorCall',
		matcher: 'https://api.ft.com/konstructor/v1/changerequest/releaselog',
		response: {
			changeRequests: [
				{ id: "my-salesforce-id"}
			]
		}
	},
	{
		name: 'devsJson',
		matcher: 'http://bertha.ig.ft.com/republish/publish/gss/1mbJQYJOgXAH2KfgKUM1Vgxq8FUIrahumb39wzsgStu0/devs',
		response: {
			githubname: 'leggsimon'
		}
	}
]);

describe('Logs', function() {

	before(function() {
		fetchMock.mock();
	});

	after(function() {
		fetchMock.restore();
	});

	it('Should make a call to the API', function() {
		return file.open({
			summary: "test summary",
			environment: "Production",
			name: "ft-next-test-app",
			gateway: 'mashery'
		})
			.then(function(id) {
				expect(id).to.equal('my-salesforce-id');
			})
	});

	it('Should be able get the email of the dev', function() {
		process.env.CIRCLE_USERNAME = 'leggsimon'
		return file.open({
			summary: "test summary",
			environment: "Production",
			name: "ft-next-test-app",
			gateway: 'mashery'
		})
			.then(function(id) {
				expect(fetchMock.calls('makeKonstructorCall')[1][1].body).to.contain('simon.legg%40ft.com');
			})
	});
});
