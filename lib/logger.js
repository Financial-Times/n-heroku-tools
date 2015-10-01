'use strict';
const colors = require('colors');
const util = require('util');

const CANOE = `

                                \\
                                  \\   O,
                        \\___________\\/ )_________/
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ \\~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                        \\
`;

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


	let msg = util.format.apply(null, args);
	if(color){
		msg = colors[color](msg);
	}

	console.log(msg);
}

function logArt(art, color){
	if(process.env.CI){
		return;
	}

	console.log(colors[color](art));
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
		ship : () => logArt(SHIP, 'green'),
		canoe: () => logArt(CANOE, 'green')
	}
};
