'use strict';

var time = require('time');
var FormData = require('form-data');
var packageJson = require(process.cwd() + '/package.json');

// Please provide the following options:
// - environment
// - summary
// - description
// - app

function getTimeInLondon(date) {
	date = new time.Date(date);
	date.setTimezone('Europe/London');
	return date;
}

function getKonstructorFormattedDate(date) {
	return date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate() + ' ' + date.getHours() + ':' + date.getMinutes();
}

module.exports = function(options) {
	var FYI_API = 'https://konstructor.ft.com/v1/changerequest/fyi';
	var payload = {
		ownerEmailAddress: 'matthew.andrews@ft.com',
		summaryOfChange: options.summary,
		changeDescription: 'See summary',
		reasonForChangeDetails: 'Deployment',
		scheduledStartDate: getKonstructorFormattedDate(getTimeInLondon((new Date()).valueOf() + 60 * 1000)),
		scheduledEndDate: getKonstructorFormattedDate(getTimeInLondon((new Date()).valueOf() + 120 * 1000)),
		changeCategory: 'Minor',
		riskProfile: 'Low',
		environment: options.environment,
		willThereBeAnOutage: 'No',
		resourceOne: 'matthew.andrews@ft.com',
		serviceIds: packageJson.name,
		notifyChannel: '#ft-next-builds'
	};
	var data = new FormData();
	Object.keys(payload).forEach(function(key) {
		data.append(key, payload[key]);
	});
	console.log("About to log the following payload to " + FYI_API);
	console.log(data);
	var headers = data.getHeaders();
	headers.Authorization = process.env.KONSTRUCTOR_API_KEY;

	return fetch(FYI_API, {
		method: 'POST',
		headers: headers,
		body: data
	})
		.then(function(res) {
			if (res.ok) {
				console.log("Change logged to SalesForce");
				return res.json()
					.then(function(data) {
						console.log("Got this back from SalesForce");
						console.log(data);
					});
			} else {
				console.log("Could not log change to SalesForce");
				return res.text()
					.then(function(data) {
						console.log(data);
						throw new Error("Could not log change to SalesForce");
					});
			}
		});
};
