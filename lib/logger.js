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
             /====\
            / FT   \
           /========\
          :HHHHHHHH H:
          |HHHHHHHH H|
          |HHHHHHHH H|
          |HHHHHHHH H|
   \______|=/========\________/
    \     :/oO/      |\      /
     \    / oOOO  Le | \    /
      \__/| OOO Grape|  \__/
       )( |  O       |   )(
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
		ship : () => logArt(YACHT, 'green'),
		yacht: () => logArt(SHIP_IN_BOTTLE, 'green'),
		canoe: () => logArt(CANOE, 'green'),
		bottle: () => logArt(BOTTLE, 'green')
	}
};
