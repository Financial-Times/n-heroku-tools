'use strict';
const herokuAuthToken = require('./heroku-auth-token');
const co = require('co');
const fetchres = require('fetchres');
const shellpromise = require('shellpromise');
const spawn = require('child_process').spawn;

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
	return new Promise(function (resolve){
		shellpromise('heroku pipelines')
			.then(function (){
				resolve(true);
			})
			.catch(function (){
				resolve(false);
			});
	});
}

function getApps(pipelineName){
	return co(function* (){
		let token = yield herokuAuthToken();
		let pipelines = yield api('/pipelines', token);
		let pipeline = pipelines.find(p => p.name === pipelineName);
		if(!pipeline){
			throw new Error('Could not find pipeline ' + pipeline);
		}
		let apps = yield api('/pipelines/' + pipeline.id + '/pipeline-couplings', token);
		let result = {staging:null, production:{us:null,eu:null}, all:[]};
		for(let app of apps){
			result.all.push(app.app.id);
			if(app.stage === 'staging'){
				result.staging = app.app.id
			}else{
				let region = yield api('/apps/' + app.app.id, token);
				result.production[region.region.name] = app.app.id
			}
		}
		// console.log(result)
		return result;
	});
}

function create(pipelineName, stagingApp){
	let command = `heroku`;
	let args = ['pipelines:create', pipelineName, '--stage', 'staging', '--app', stagingApp];

	return new Promise((resolve, reject) =>{
		let ps = spawn(command, args, {env:process.env, stdio:'inherit'});
		ps.on('error', reject);
		ps.on('exit', resolve);
	});
}


function promote(stagingApp){
	return shellpromise('heroku pipelines:promote -a ' + stagingApp)
}

function addAppToPipeline(pipeline, app, stage){
	let command = 'heroku';
	let args = ['pipelines:add', pipeline, '--app', app, '--stage', stage];
	return new Promise((resolve, reject) =>{
		let ps = spawn(command, args, {env:process.env, stdio:'inherit'});
		ps.on('error', reject);
		ps.on('exit', resolve);
	});
}

function destroyPipeline(pipeline, silent){
	let command = 'heroku';
	let args = ['pipelines:destroy', pipeline];
	return new Promise((resolve, reject) =>{
		let ps = spawn(command, args, {env:process.env, stdio:'inherit'});
		if(!silent){
			ps.on('error', reject);
		}

		ps.on('exit', resolve);
	});
}

module.exports = {
	getApps: getApps,
	promote: promote,
	supported: supported,
	create: create,
	addAppToPipeline: addAppToPipeline,
	destroy: destroyPipeline
};
