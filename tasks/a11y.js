'use strict';


module.exports = function (program, utils) {
	program
		.command('pa11y-ci')
		.action(function () {
			task()
			.catch(utils.exit);
		});
};

module.exports.task = task;
