'use strict';

module.exports = function (name, opts) {
	let matches;
	opts = opts || {};
	if (opts.version === false) {
		// allow a component to deploy hashed assets
		if (/^@financial-times\//.test(name)) {
			matches = [null, name.split('/').pop()];
		} else {
			// extracts e.g. name from ft-next-name-v123, with the 'ft', 'next' and 'v123' bits optional
			matches = name.match(/^(?:ft-)?(?:next-)?(.*?)(?:-v[0-9]{3,})?$/);
		}
	} else {
		// extracts e.g. name from ft-next-name, with the 'ft' and 'next' bits optional
		// TODO: figure out whether 'options.version' is ever true
		matches = name.match(/^(?:ft-)?(?:next-)?(.*)/);
	}
	if (matches) {
		return matches[1];
	}
	return name;
};
