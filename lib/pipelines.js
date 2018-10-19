'use strict';
const herokuAuthToken = require('./heroku-auth-token');
const co = require('co');
const shellpromise = require('shellpromise');
const api = require('./heroku-api');
const spawn = require('child_process').spawn;

async function info (pipelineName){
	const authToken = await herokuAuthToken();
	const pipeline = await api({
		endpoint: `/pipelines/${pipelineName}`,
		authToken
	});

	return pipeline;
}

function getApps (pipelineName){
	return co(function* (){
		let authToken = yield herokuAuthToken();
		let pipelines = yield api({
			endpoint: '/pipelines',
			authToken
		});
		let pipeline = pipelines.find(p => p.name === pipelineName);
		if(!pipeline){
			throw new Error('Could not find pipeline ' + pipeline);
		}

		let couplings = yield api({
			endpoint: `/pipelines/${pipeline.id}/pipeline-couplings`,
			authToken
		});
		let result = { staging:null, production:{ us:null,eu:null }, all:[] };
		for(let coupling of couplings){
			let app = yield api({
				endpoint: `/apps/${coupling.app.id}`,
				authToken
			});
			result.all.push(app.name);
			if(coupling.stage === 'staging'){
				result.staging = app.name;
			}else{
				result.production[app.region.name] = app.name;
			}
		}

		return result;
	});
}

function create (pipelineName, { stagingApp, organisation }){
	let command = 'heroku';
	let args = ['pipelines:create', pipelineName, '--org', organisation, '--stage', 'staging', '--app', stagingApp];

	return new Promise((resolve, reject) =>{
		let ps = spawn(command, args, { env:process.env, stdio:'inherit' });
		ps.on('error', reject);
		ps.on('exit', resolve);
	});
}


function promote (stagingApp){
	return shellpromise('heroku pipelines:promote -a ' + stagingApp);
}

function addAppToPipeline (pipeline, app, stage){
	let command = 'heroku';
	let args = ['pipelines:add', pipeline, '--app', app, '--stage', stage];
	return new Promise((resolve, reject) =>{
		let ps = spawn(command, args, {env:process.env, stdio:'inherit'});
		ps.on('error', reject);
		ps.on('exit', resolve);
	});
}

function destroyPipeline (pipeline, silent){
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
	info,
	getApps,
	promote,
	create,
	addAppToPipeline,
	destroy: destroyPipeline
};
