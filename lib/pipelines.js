'use strict';
const herokuAuthToken = require('./heroku-auth-token');
const co = require('co');
const fetchres = require('fetchres');
const shellpromise = require('shellpromise');

function api(url, token){
	return fetch(
		'https://api.heroku.com' + url,
		{
			headers: {
				'Accept': 'Accept: application/vnd.heroku+json; version=3.pipelines',
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token
			}
		}
	).then(fetchres.json)
}

function supported(){
	return new Promise(function(resolve){
		shellpromise('heroku pipelines')
			.then(function(){
				resolve(true);
			})
			.catch(function(){
				resolve(false);
			});
	});
}

function getApps(pipelineName){
	return co(function* (){
		let token = yield herokuAuthToken();
		let pipelines = yield api('/pipelines/', token);
		let pipeline = pipelines.find(p => p.name === pipelineName);
		if(!pipeline){
			throw new Error('Could not find pipeline ' + pipeline);
		}

		let apps = yield api('/pipelines/' + pipeline.id + '/apps', token);
		let result = {staging:null, production:{us:null,eu:null}, all:[]};
		for(let app of apps){
			result.all.push(app.name);
			if(app.coupling.stage === 'staging'){
				result.staging = app.name
			}else{
				result.production[app.region.name] = app.name
			}
		}

		return result;
	});
}


function promote(stagingApp){
	return shellpromise('heroku pipelines:promote -a ' + stagingApp)
}

module.exports = {
	getApps: getApps,
	promote: promote,
	supported: supported
};

