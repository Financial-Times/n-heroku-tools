'use strict';

var extname = require('path').extname;

module.exports = function (name) {
	switch(extname(name).substring(1)) {
		default:
			throw new Error("ContentType undetermined for " + name);
		case 'json':
			return 'application/json';
		case 'js':
			return 'text/javascript';
		case 'css':
			return 'text/css';
		case 'png':
			return 'image/png';
		case 'gif':
			return 'image/gif';
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'ico':
			return 'image/x-icon';
		case 'svg':
			return 'image/svg+xml';
		case 'txt':
			return 'text/plain';
		case 'html':
			return 'text/html';
		case 'xml':
			return 'text/xml';
	}
};
