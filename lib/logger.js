'use strict';
const colors = require('colors');
const util = require('util');

const SHIP = `
     .  o ..
     o . o o.o
          ...oo
            __[]__
         __|_o_o_o\\__
        \\""""""""""/
         \\. ..  . /
     ^^^^^^^^^^^^^^^^^^^^
`;

function log(args, color){
	if(process.env.CI){
		return;
	}

	let msg = util.format.apply(null, args);
	if(color){
		msg = colors[color](msg);
	}

	console.log(msg);
}

module.exports = {
	info: function() {
		log([].slice.apply(arguments), 'cyan');
	},
	warn: function() {
		log([].slice.apply(arguments), 'yellow');
	},
	error: function() {
		log([].slice.apply(arguments), 'red');
	},
	log: function() {
		log([].slice.apply(arguments));
	},
	success: function() {
		log([].slice.apply(arguments), 'green');
	},
	art : {
		ship : () => console.log(colors.green(SHIP))
	}
};
