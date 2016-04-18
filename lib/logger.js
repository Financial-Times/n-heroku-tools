'use strict';
const colors = require('colors');
const util = require('util');

const readFileSync = require('fs').readFileSync;
const SHIP_IN_BOTTLE = readFileSync(__dirname + '/../ascii/ship-in-bottle.ascii');
const YACHT = readFileSync(__dirname + '/../ascii/yacht.ascii');
const CANOE = readFileSync(__dirname + '/../ascii/canoe.ascii');
const BOTTLE = readFileSync(__dirname + '/../ascii/bottle.ascii');

function log(args, color){
	let msg = util.format.apply(null, args);
	if(color){
		msg = colors[color](msg);
	}

	console.log(msg);
}

function logArt(art, color, replacements){
	if(process.env.CI){
		return;
	}
	if (replacements) {
		Object.keys(replacements).forEach(k => {
			art = art.replace(RegExp(`\\{${k}\\}`, 'g'), replacements[k])
		});
	}
	console.log(colors[color](art));
}

module.exports = {
	info: function () {
		log([].slice.apply(arguments), 'cyan');
	},
	warn: function () {
		log([].slice.apply(arguments), 'yellow');
	},
	error: function () {
		log([].slice.apply(arguments), 'red');
	},
	log: function () {
		log([].slice.apply(arguments));
	},
	success: function () {
		log([].slice.apply(arguments), 'green');
	},
	art : {
		ship : () => logArt(YACHT, 'green'),
		yacht: () => logArt(SHIP_IN_BOTTLE, 'green'),
		canoe: () => logArt(CANOE, 'green'),
		bottle: (tag) => logArt(BOTTLE, 'green', {
			tag: tag.length < 6 ? tag + ' ' : tag.substr(0, 6)
		})
	}
};
