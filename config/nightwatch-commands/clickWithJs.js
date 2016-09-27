exports.command = function (selector, callback) {
	return this.execute(function (s) {
		document.querySelector(s).click();
	}, [selector], callback);
};
