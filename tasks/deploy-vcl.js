'use strict';
var fs = require('fs');
var activeVersion, newVersion;
var debug = console.log;

function replaceVars(vcls, vars) {
	return vcls.map(function(vcl) {
		vars.forEach(function(v) {
			if (!process.env[v]) {
				throw 'Environment variable ' + v + ' is required to deploy this vcl';
			}
			var regex = new RegExp('\\\$\\\{'+ v.trim()+'\\\}', 'gm');
			vcl.content = vcl.content.replace(regex, process.env[v]);
		});

		return vcl;
	});
}

module.exports = function(folder, opts) {

	if(opts.env){
		require('dotenv').load();
	}

	var fastlyApiKey = process.env.FASTLY_APIKEY;
	var serviceId = process.env[opts.service] || opts.service;

	if(!serviceId) {
		throw new Error("Service ID required");
	}

	if(!fastlyApiKey) {
		throw new Error("Fastly API Key Required");
	}




	var options = opts || {};
	var mainVcl = options.main || 'main.vcl';
	var fastly = require('fastly')(fastlyApiKey, encodeURIComponent(serviceId), { verbose: false });
	options.vars = options.vars ? options.vars.split(',') : [];

	// if service ID is needed use the given serviceId
	if(options.vars.indexOf('SERVICEID') > -1){
		process.env.SERVICEID = serviceId;
	}


	// The VCL we want to deploy
	var vcls = fs.readdirSync(folder).map(function (name) {
		return {
			name: name,
			content: fs.readFileSync(folder + name, { encoding: 'utf-8' })
		};
	});

	// if vars option exists, replace ${VAR} with process.env.VAR
	if(options.vars.length) {
		vcls = replaceVars(vcls, options.vars);
	}

	return fastly
		.getServices()
		.then(function(services) {                                //   1. Derive the last version number and clone it
			var service = services.filter(function(svc) {
				return svc.id === serviceId ? true : false;
			})[0];
			activeVersion = service.active_version;
			debug('Cloning active version %s of %s', activeVersion, service.name);
			return fastly.cloneVersion(activeVersion);
		})
		.then(function(res) {                                  //   3. List VCLs
			debug('Successfully cloned version %s', res.number);
			newVersion = res.number;
			return fastly.getVcl(newVersion);
		})
		.then(function(res) {                                  //   4. Delete the VCL (all of them)
			return Promise.all(
				res.map(function(vcl) {
					debug('Deleting "%s" for version %s', vcl.name, newVersion);
					return fastly.deleteVcl(newVersion, vcl.name);
				})
			);
		})
		.then(function(res) {                                      // 5. Update with our shiny new VCL
			return Promise.all(
				vcls.map(function(vcl) {
					debug('Uploading new VCL ' + vcl.name + ' with version %s', newVersion);
					return fastly.updateVcl(newVersion, {
						name: vcl.name,
						content: vcl.content
					});
				})
			);
		})

		.then(function(res) {                                      // 6. Set the 'main' VCL as the main one
			debug('Set "%s" as the main entry point', mainVcl);
			return fastly.setVclAsMain(newVersion, mainVcl);
		})
		.then(function(res) {                                      // 7. Validate the new VCL
			debug('Validate version %s', newVersion);
			return fastly.validateVersion(newVersion);
		})
		.then(function(res) {                                      // 8. Activate the new VCL or report an error
			debug('Activate the version %s', newVersion);
			if (res.status === 'ok') {
				debug('Version %s looks ok', newVersion);
				return fastly.activateVersion(newVersion);
			} else {
				debug('Version %s looks bad', newVersion);
				debug(res);  // the vcl compile/syntax error
				throw new Error('VCL is invalid: ' +  res);
			}
		})
		.then(function(res) {
			debug('New version %s installed and activated', newVersion);        // 9. Complete
			return true;
		});
};
