'use strict';

let exec = require('../lib/exec');
let spawn = require('child_process').spawn;
let packageJson = require(process.cwd() + '/package.json');
let normalizeName = require('../lib/normalize-name');
let keys = require('../lib/keys');
let path = require('path');

function toStdOut (data) {
	process.stdout.write(data.toString());
}

function toStdErr (data) {
	process.stderr.write(data.toString());
}

function extractLocalApps (localApps) {
	return localApps.split(',')
		.reduce(function (currentLocalApps, localApp) {
			const localAppParts = localApp.split('=');
			currentLocalApps.push({ name: localAppParts[0], port: localAppParts[1] });
			return currentLocalApps;
		}, []);
}

function configureAndSpawn (opts, func) {
	return keys()
		.then(function (env) {
			// Overwrite any key specified locally
			Object.keys(process.env).forEach(function (key) {
				env[key] = process.env[key];
			});

			Object.keys(opts).forEach(function (key) {
				env[key] = opts[key];
			});

			let processToRun = func(env);

			return new Promise(function (resolve, reject) {
				let local = spawn.apply(null, processToRun);

				local.stdout.on('data', toStdOut);
				local.stderr.on('data', toStdErr);
				local.on('error', reject);
				local.on('close', resolve);
			});
		});
}

function runLocal (opts) {
	return configureAndSpawn(opts, function (env) {
		let args = [];

		if(opts.script) {
			args.push(opts.script);
		} else {
			args.push(packageJson.main || 'server/app.js');
		}

		if (opts.harmony) {
			args.push('--harmony');
		}

		if (opts.debug) {
			args.unshift('--debug');
		}

		if (opts.inspect) {
			args.unshift('--inspect');
		}

		if (opts.https) {
			// pass argument to the script
			args.push('--https');
		}

		if(opts.nodemon) {
			args.push('--ignore', 'public/');
			args.push('--ignore', 'node_modules/');
			return ['nodemon', args, { cwd: process.cwd(), env: env }];
		} else {
			return ['node', args, { cwd: process.cwd(), env: env }];
		}

	});
}

function runScript (opts) {

	return configureAndSpawn({}, function (env) {
		let args = [path.join(process.cwd(), opts.script)];
		if (opts.debug) {
			args.push('--debug');
		}
		if (opts.inspect) {
			args.unshift('--inspect');
		}
		if (opts.subargs) {
			args = args.concat(opts.subargs.replace(/^\[/, '').replace(/]$/, '').split(','));
		}

		/**
		* The default maximum size of HTTP headers is 8KB.
		* To override the default, we must pass in the --max-http-header-size option
		* and specify a maximum size.
		*
		* @see https://nodejs.org/docs/latest-v8.x/api/cli.html#cli_max_http_header_size_size
		*/
		args.unshift('--max-http-header-size=80000');

		return ['node', args, { cwd: process.cwd(), env: env }];
	});
}


function runProcfile () {
	return configureAndSpawn({}, function (env) {
		return ['foreman', ['start'], { cwd: process.cwd(), env: env }];
	});
}

function runRouter (opts) {
	let envVars = {
		DEBUG: 'proxy',
		REGION: 'us',
		PORT: opts.PORT
	};

	// Only use the cert/key in the arguments if both provided
	// Fallback to defaults if not
	if (opts.https && opts.cert && opts.key) {
		envVars.CERT = opts.cert;
		envVars.CERT_KEY = opts.key;
	}

	(opts.localApps || [])
		.concat({ name: normalizeName(packageJson.name, { version: false }), port: opts.localPort })
		.forEach(function (localApp) {
			const localAppEnvVar = localApp.name.toUpperCase().replace(/\-/g, '_'); // see https://github.com/Financial-Times/n-heroku-tools/issues/489
			envVars[localAppEnvVar] = localApp.port;
			envVars[localApp.name] = localApp.port;
		});

	return configureAndSpawn(envVars, function (env) {
		let bin = opts.https ? `${opts.router}-https` : opts.router;
		return [bin, { env }];
	});
}

function ensureRouterInstall (router) {
	return exec(`which ${router}`)
		.catch(function () { throw new Error(`You need to install the ${router} first!  See docs here: https://github.com/Financial-Times/${router}`); });
}

function task (opts) {
	let localPort = process.env.PORT || 3002;

	if (opts.local) {
		return runLocal({ PORT: localPort, harmony: opts.harmony, debug: opts.debug, script: opts.script, nodemon: opts.nodemon, https: opts.https, inspect: opts.inspect, router: opts.router });
	} else if (opts.procfile) {
		return runProcfile();
	} else if (opts.script) {
		return runScript({ script: opts.script, harmony: opts.harmony, debug: opts.debug, subargs: opts.subargs, router: opts.router, inspect: opts.inspect });
	} else {
		const localApps = opts.localApps ? extractLocalApps(opts.localApps) : [];
		return ensureRouterInstall(opts.router)
			.then(function () {
				return Promise.all([
					runLocal({ PORT: localPort, harmony: opts.harmony, debug: opts.debug, nodemon: opts.nodemon, inspect: opts.inspect, router: opts.router }),
					runRouter({ PORT: opts.port, localPort: localPort, harmony: opts.harmony, https: opts.https, cert: opts.cert, key: opts.key, localApps: localApps, router: opts.router })
				]);
			});
	}
};

module.exports = function (program, utils) {
	program
		.command('run')
		.description('Runs the local app through the router')
		.option('-l, --local', 'Run the app but don\'t start the router')
		.option('--harmony', 'Runs the local app with harmony')
		.option('--debug', 'Runs the local app with debug flag')
		.option('--inspect', 'Runs the local app with the inspect flag (experimental - will only work with latest node versions)')
		.option('--procfile', 'Runs all processes specified in the Procfile')
		.option('-s, --script <file>', 'Runs a single javascript file')
		.option('--subargs [subargs]', 'Sub arguments to pass to a single script', /^\[.+]$/)
		.option('--no-nodemon', 'Do not run through nodemon')
		.option('--https', 'Run with HTTPS')
		.option('--cert <file>', 'Specify a certificate to use with HTTPS. Use with --https.')
		.option('--key <file>', 'Specify a certificate key to use with HTTPS. Use with --https.')
		.option('--local-apps <apps>', 'Specify extra apps that are running locally, as comma-seperated `[name]=[port]`, e.g. `service-worker=3001,front-page=3002`')
		.option('-p --port <port>', 'Port to run the router through', 5050)
		.option('--router <router>', 'Router to run using', 'next-router')
		.action(function (opts){
			task(opts).catch(utils.exit);
		});
};

module.exports.task = task;
