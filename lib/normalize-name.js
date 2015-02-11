'use strict';

module.exports = function(name) {
	var matches = name.match(/^(?:ft-)?(?:next-)?(.*)/);
	if (matches) {
		return matches[1];
	}
	return name;
};
