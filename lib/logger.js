'use strict';
const colors = require('colors');
const util = require('util');

const SHIP = `
     .  o ..
     o . o o.o
          ...oo
            __[]__
         __|_o_o_o\__
         \""""""""""/
          \. ..  . /
     ^^^^^^^^^^^^^^^^^^^^
`;

module.exports = {
	info: function() {
		let msg = util.format.apply(null, [].slice.apply(arguments));
		console.log(colors.cyan(msg));
	},
	warn: function() {
		let msg = util.format.apply(null, [].slice.apply(arguments));
		console.log(colors.yellow(msg));
	},
	error: function() {
		let msg = util.format.apply(null, [].slice.apply(arguments));
		console.log(colors.red(msg));
	},
	log: function() {
		let msg = util.format.apply(null, [].slice.apply(arguments));
		console.log(msg);
	},
	success: function() {
		let msg = util.format.apply(null, [].slice.apply(arguments));
		console.log(colors.green(msg));
	},
	art : {
		ship : () => console.log(colors.green(SHIP))
	}
};
