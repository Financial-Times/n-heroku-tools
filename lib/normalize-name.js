'use strict';

module.exports = function (name, opts) {
	var matches;
	opts = opts || {};
	if (opts.version === false) {
		// allow a component to deploy hashed assets
		if (/^@financial-times\//.test(name)) {
			matches = [null, name.split('/').pop()];
		} else {
			matches = name.match(/^(?:ft-)?(?:next-)?(.*?)(?:-v[0-9]{3,})?$/);
		}
	} else {
		matches = name.match(/^(?:ft-)?(?:next-)?(.*)/);
	}
	if (matches) {
		return matches[1];
	}
	return name;
};
