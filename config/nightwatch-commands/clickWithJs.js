exports.command = function (selector, callback) {
	this.execute(function (s) {
		document.querySelector(s).click();
	}, [selector], callback);

	return this;
};
