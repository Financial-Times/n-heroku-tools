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
	fetch('http://konstructor.ft.com/v1/changerequest/fyi', {
		headers: {
			Authorization: process.env.KONSTRUCTOR_API_KEY
		},
		body: JSON.stringify({
			ownerEmailAddress: 'matthew.andrews@ft.com',
			summaryOfChange: options.summary,
			changeDescription: options.description,
			reasonForChangeDetails: 'New is always better',
			scheduledStartDate: getKonstructorFormattedDate(getTimeInLondon((new Date()).valueOf() + 60 * 1000)),
			scheduledEndDate: getKonstructorFormattedDate(getTimeInLondon((new Date()).valueOf() + 61 * 1000)),
			changeCategory: 'Minor',
			riskProfile: 'Low',
			environment: options.environment,
			willThereBeAnOutage: 'No',
			resourceOne: 'matthew.andrews@ft.com',
			serviceIds: options.app,
			notifyChannel: '#ft-next-builds'
		})
	})
		.then(function(res) {
			if (res.ok) {
				console.log("Change logged to SalesForce");
			} else {
				throw new Error("Could not log change to SalesForce");
			}
		});
};
