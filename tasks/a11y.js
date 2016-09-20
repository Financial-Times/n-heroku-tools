'use strict';


module.exports = function (program, utils) {
	program
		.command('pa11y-ci [app]')
		.action(function () {
			task({
				app: app
			})
			.catch(utils.exit);
		});
};

module.exports.task = task;
