'use strict';

module.exports = function(name, opts) {
	var version = opts.version;
	var matches;
	if (opts.version === false) {
		matches = name.match(/^(?:ft-)?(?:next-)?(.*?)(?:-v[0-9]{3,})?$/);
	} else {
		matches = name.match(/^(?:ft-)?(?:next-)?(.*)/);
	}
	if (matches) {
		return matches[1];
	}
	return name;
};
