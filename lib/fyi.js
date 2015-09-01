'use strict';

var time = require('time');

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
		serviceIds: options.app,
		notifyChannel: '#ft-next-builds'
	};
	console.log("About to log the following payload to " = FYI_API);
	console.log(JSON.stringify(payload, undefined, 2));

	return fetch(FYI_API, {
		method: 'POST',
		headers: {
			Authorization: process.env.KONSTRUCTOR_API_KEY
		},
		body: JSON.stringify(payload)
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
