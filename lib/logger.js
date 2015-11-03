'use strict';
const colors = require('colors');
const util = require('util');

const SHIP_IN_BOTTLE = `
                             ______________________________________________
                          .-'                     _                        '.
                        .'                       |-'                        |
                      .'                         |                          |
                   _.'               p         _\_/_         p              |
                _.'                  |       .'  |  '.       |              |
           __..'                     |      /    |    \      |              |
     ___..'                         .T\    ======+======    /T.             |
  ;;;\::::                        .' | \  /      |      \  / | '.           |
  ;;;|::::                      .'   |  \/       |       \/  |   '.         |
  ;;;/::::                    .'     |   \       |        \  |     '.       |
        ''.__               .'       |    \      |         \ |       '.     |
             ''._          <_________|_____>_____|__________>|_________>    |
                 '._     (___________|___________|___________|___________)  |
                    '.    \;;;Dani;;;o;;;;;o;;;;;o;;;;;o;;;;;o;;;;;o;;;;/   |
                      '.~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~   |
                        '. ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~  |
                          '-.______________________________________________.'

`;

const YACHT = `
                 .
                .'|     .8
               .  |    .8:
              .   |   .8;:        .8
             .    |  .8;;:    |  .8;
            .     n .8;;;:    | .8;;;
           .      M.8;;;;;:   |,8;;;;;
          .    .,"n8;;;;;;:   |8;;;;;;
         .   .',  n;;;;;;;:   M;;;;;;;;
        .  ,' ,   n;;;;;;;;:  n;;;;;;;;;
       . ,'  ,    N;;;;;;;;:  n;;;;;;;;;
      . '   ,     N;;;;;;;;;: N;;;;;;;;;;
     .,'   .      N;;;;;;;;;: N;;;;;;;;;;
    ..    ,       N6666666666 N6666666666
    I    ,        M           M
   ---nnnnn_______M___________M______mmnnn
         "-.                          /
  __________"-_______________________/_________
`;

const CANOE = `
                                \\
                                  \\   O,
                        \___________\\/ )_________/
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ \\~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
                                        \\
`;


const BOTTLE = `
               __
              )==(
              )==(
              |H |
              |H |
              |H |
             /====\\
            / FT   \\
           /========\\
          :HHHHHHHH H:
          |HHHHHHHH H|
          |HHHHHHHH H|
          |HHHHHHHH H|
   \\______|=/========\\________/
    \\     :/o Chateau|\\      /
     \\    / oOO  de  | \\    /
      \\__/| OO Kaelig|  \\__/
       )( | O v{tag}|   )(
       )( |==========|   )(
       )( |HHHHHHHH H|   )(
       )( |HHHHHHHH H|   )(
      .)(.|HHHHHHHH H|  .)(.
     ~~~~~~~~~~~~~~~~  ~~~~~~
`;

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
		ship : () => logArt(YACHT, 'green'),
		yacht: () => logArt(SHIP_IN_BOTTLE, 'green'),
		canoe: () => logArt(CANOE, 'green'),
		bottle: (tag) => logArt(BOTTLE, 'green', {
      tag: tag.length < 6 ? tag + ' ' : tag.substr(0, 6)
    })
	}
};
