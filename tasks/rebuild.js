const fetchres = require('fetchres');
const keys = require('../lib/keys');

const DEFAULT_REGISTRY_URI = 'https://next-registry.ft.com/services.json';

const getCircleToken = () =>
	process.env.CIRCLECI_REBUILD_KEY
		? Promise.resolve(process.env.CIRCLECI_REBUILD_KEY)
		: keys().then(env => env.CIRCLECI_REBUILD_KEY);

async function circleFetch (path, opts) {
	const defaultOptions = {
		timeout: 3000,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	};

	const circleToken = await getCircleToken();
	const options = Object.assign(defaultOptions, opts);
	const url = `https://circleci.com/api/v1${path}?circle-token=${circleToken}`;
	const res = await fetch(url, options);

	if (res.ok) {
		return await res.json();
	} else {
		console.log(`Response not OK for ${path}, got: ${res.status}`); // eslint-disable-line no-console
		throw new Error(res.status);
	}
}

const clearCache = (project) => circleFetch(`/project/Financial-Times/${project}/build-cache`, { method: 'DELETE' });

const rebuildMasterBuild = (project) => circleFetch(`/project/Financial-Times/${project}/tree/master`, { method: 'POST' });

const lastMasterBuild = (project) => circleFetch(`/project/Financial-Times/${project}/tree/master`);

const getRepoName = (app) => {
	const repoUrl = Object.values(app.versions).find(version => version.repo).repo;
	if (/https?:\/\/github\.com\/Financial-Times\//.test(repoUrl)) {
		return repoUrl
			.replace(/https?:\/\/github\.com\/Financial-Times\//, '')
			.replace(/\/$/, ''); // trim trailing "/"
	}
};

const hasVersions = (app) => app.versions['1'] || app.versions['2'];

const serves = type => app => type ? app.serves && app.serves.includes(type) : true;

async function task (options) {
	const apps = options.apps;
	const allApps = options.all;
	const registry = options.registry || DEFAULT_REGISTRY_URI;
	let appsToRebuild = [];

	const areAppsToRebuild = (apps.length) || allApps;
	if (!areAppsToRebuild) {
		console.log('Use the --all flag to rebuild all apps or supply a specific app name.'); // eslint-disable-line no-console
		process.exit(1);
	}

	if (apps.length) {
		appsToRebuild = apps;
	} else if (allApps) {
		const registryData = await fetch(registry).then(fetchres.json);
		appsToRebuild = registryData
			.filter(serves(options.serves))
			.filter(hasVersions)
			.map(getRepoName)
			.filter(repo => repo);
	}

	return Promise.all(appsToRebuild.map(async app => {
		console.log(`Considering whether to rebuild ${app}`); // eslint-disable-line no-console
		try {
			const [lastBuild] = await lastMasterBuild(app);

			if (lastBuild.status !== 'running' && lastBuild.status !== 'not_running') {
				console.log(`Clearing cache and triggering rebuild of last master build of ${app} ( ${lastBuild.committer_name}: ${lastBuild.subject ? lastBuild.subject.replace(/\n/g, ' ') : 'No subject'})`); // eslint-disable-line no-console
				await clearCache(app);
				await rebuildMasterBuild(app);
			} else {
				console.log(`Skipping rebuild of ${app} because job already exists.`); // eslint-disable-line no-console
			}
		} catch (error) {
			console.log(`Skipped rebuild of ${app} probably because Circle CI not set up for this repo`); // eslint-disable-line no-console
		}
	}));
};

module.exports = function (program, utils) {
	program
		.command('rebuild [apps...]')
		.option('--all', 'Trigger rebuilds of all apps.')
		.option('--registry [registry-uri]', `use this registry, instead of the default: ${DEFAULT_REGISTRY_URI}`, DEFAULT_REGISTRY_URI)
		.option('--serves <type>', 'Trigger rebuilds of apps where type is served.')
		.description('Trigger a rebuild of the latest master on Circle')
		.action((apps, opts) => {
			return task({
				apps: apps,
				serves: opts.serves,
				registry: opts.registry,
				all: opts.all
			}).catch(utils.exit);
		});
};

module.exports.task = task;
