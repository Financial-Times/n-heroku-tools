'use strict';

const shell = require('shellpromise');
const semver = require('semver');
const path = require('path');
const logger = require('../lib/logger');
const denodeify = require('denodeify');
const fs = require('fs');
const writeFile = denodeify(fs.writeFile);

const increments = ['major', 'minor', 'patch', 'v1'];
let isBeta = false;

const getLatestTag = () => {
	return shell('git tag')
		.then(tagList => {
			const latest = tagList.split('\n')
				.filter(semver.valid)
				.sort(semver.compare)
				.pop()

			return latest ? latest.replace(/^v/, '') : null;
		});
}

function npmSetVersion (version) {
	console.log('Setting package.json version');
	const packageJson = require(path.join(process.cwd(), 'package.json'));
	packageJson.version = version.substr(1);

	return writeFile(path.join(process.cwd(), 'package.json'), JSON.stringify(packageJson, null, '\t'))
		.then(() => shell(`git add package.json`))
		.then(() => shell(`git commit -m 'version ${version}'`))
		.then(() => shell(`git tag ${version}`))
		.then(() => shell(`git push origin HEAD`));
}

function checkIncrement(increment, forceNpm) {

	if (!increment) {
		if (forceNpm) {
			return Promise.resolve();
		} else {
			return Promise.reject(`Unless forcing npm to publish a version at the latest tag
always specify an increment`);
		}
	}

	if (increments.indexOf(increment) === -1 && !semver.valid(increment)) {
		return Promise.reject(`Incorrect version identifier. Accepted values: major, minor, patch, v1 or a prerelease semver
e.g. nbt bottle minor`);
	}

	if (semver.valid(increment)) {
		if (semver.major(increment) === 0) {
			isBeta = 'pre';
		} else if (/v?\d+.\d+\.\d+.*-beta\.\d+$/.test(increment)) {
			isBeta = 'beta';
		} else {
			return Promise.reject(`Semver release only allowed for prereleases e.g. 0.1.3 or 2.0.0-beta.3.
For non prereleases you should use major, minor or patch, or v1 for first releases`);
		}
	} else {
		return Promise.resolve();
	}
	return Promise.resolve();
}

function verifyBranch () {
	console.log('Verifying git branch');
	// make sure on master and up to date with origin
	return shell('git rev-parse --abbrev-ref HEAD')
		.then(branchName => {
			if (branchName.trim() !== 'master' && (!isBeta || isBeta === 'pre')) {
				throw 'Components should only be published from the master branch, unless releasing a beta version';
			} else {
				return shell('git remote update')
					.catch(error => {
						console.log(error);
						throw error;
					})
					.then(() => shell('git status -uno | grep up-to-date'))
						.catch(() => {
							throw 'Your branch is either ahead or behind origin/master. Please push or pull before attempting a release';
						});
			}
		});
}

function fetchVersions () {
	console.log('Fetching existing versions');
	// get current version from npm, from git tag and from package.json and bower.json
	return Promise.all([
		// get version from npm registry
		shell('npm view --json')
			.then(info => {
				const versions = JSON.parse(info).versions
				if (Array.isArray(versions)) {
					return versions.pop();
				} else if (typeof versions === 'string') {
					return versions;
				}
			})
			.catch(() => null),
		// get version from github tags (aka bower version)
		shell('git fetch --tags')
			.then(getLatestTag),
		// get version from bower.json
		new Promise((resolve, reject) => {

			let bowerVersion;
			try {

				bowerVersion = require(path.join(process.cwd(), 'bower.json')).version;
				// if bower.json version exists throw (or maybe launch interactive dialog asking to correct)
				if (bowerVersion) {
					// TODO: interactive cli to do correct this for the user
					reject('bower.json should not contain a version property; versioning is done with git tags');
				} else {
					resolve(true);
				}
			} catch (e) {
				return resolve(null);
			}
		}),
		// get version from package.json
		new Promise((resolve, reject) => {

			let packageVersion;
			try {
				packageVersion = require(path.join(process.cwd(), 'package.json')).version;
				if (packageVersion) {
					resolve(packageVersion);
				} else {
					reject('package.json must have a version number. If this is not an npm module please set to \'0.0.0\'');
				}
			} catch (e) {
				return resolve(null);
			}
		})
	])
}


function getFixedVersion (currentVersion, proposedVersion) {
	if (proposedVersion) {
		if (['major', 'minor', 'patch'].indexOf(proposedVersion) > -1) {
			return;
		}
		if (currentVersion) {
			if (proposedVersion === 'v1') {
				if (semver.gt(currentVersion, '1.0.0')) {
					throw `Cannot release version 1 - latest published version already has a greater semver`;
				}
				return 'v1.0.0';
			} else if (isBeta) {
				if (semver.gt(currentVersion, proposedVersion)) {
					throw `Cannot release this beta - latest published version already has a greater semver`;
				}
				const currentMajor = semver.major(currentVersion);
				const proposedMajor = semver.major(proposedVersion);

				if (proposedMajor === 0) {
					return /^v/.test(proposedVersion) ? proposedVersion : ('v' + proposedVersion);
				}

				const currentMinor = semver.minor(currentVersion);
				const proposedMinor = semver.minor(proposedVersion);

				if (proposedMajor > currentMajor + 1) {
					throw `Beta releases must be no more than an increment of one major version`;
				}

				if (proposedMajor === currentMajor + 1 && proposedMinor !== 0) {
					throw `Beta releases for a new major version should have a minor version of 0`;
				}

				if (proposedMajor === currentMajor && proposedMinor > currentMinor + 1) {
					throw `Beta releases for a new minor version should be no more than an increment of one minor version`;
				}

				return /^v/.test(proposedVersion) ? proposedVersion : ('v' + proposedVersion);

			}
		} else if (proposedVersion === 'v1') {
			return 'v1.0.0';
		}


		return /^v/.test(proposedVersion) ? proposedVersion : ('v' + proposedVersion);
	}
}

function bottle(versions, increment, forceNpm) {
	console.log('Verifying version consistency');
	const npmVersion = versions[0];
	const tagVersion = versions[1];
	const bowerVersion = versions[2];
	const packageVersion = versions[3];
	let publishToNpm = true;
	// if npm version exists use as canonical version as it's the hardest to alter
	if (npmVersion) {
		if (semver.neq(npmVersion, packageVersion)) {
			// If the user has corrected package.json to match a newer git tag then this condition
			// wil probably be satisfied, so we ignore
			if (!(semver.lt(npmVersion, tagVersion) && semver.eq(tagVersion, packageVersion))) {
				throw `Version last published on npm is different to version in package.json.
Please set version to ${npmVersion} in package.json and commit`;
			}
		}

	if (semver.lt(npmVersion, tagVersion) && !semver.eq(tagVersion, packageVersion)) {
			throw `It looks like your tags have got ahead of your npm releases.
Please set version to ${tagVersion} in package.json and commit, or check out the
relevant tag in git and manually release to npm if there's a definite
need to correct previous releases`;
		}
	}


	if (!forceNpm && (!npmVersion || (bowerVersion && packageVersion === '0.0.0'))) {
		publishToNpm = false;
	}

	const currentVersion = npmVersion || tagVersion;
	const isNewNpmModule = forceNpm && !npmVersion;

	const fixedVersion = getFixedVersion(currentVersion, increment);
	return publishToNpm ? npmBottle(increment, fixedVersion, isNewNpmModule) : bowerBottle(increment, currentVersion, fixedVersion);
}


function npmBottle (increment, fixedVersion, newModule) {
	console.log('Publishing as npm module');
	let dots = setInterval(() => process.stdout.write('.'), 700)
	return shell('npm whoami --registry http://registry.npmjs.org')
		.then(user => {
			if (user.trim() !== 'financial-times') {
				throw 'Wrong user';
			}
		})
		.catch(() => {
			throw `Sign in to npm as financial-times before releasing anything.
Credentials are stored in lastpass. Ask somebody about getting access if you don't already have this`;
		})
		.then(() => {
			if (fixedVersion) {
				return npmSetVersion(fixedVersion, newModule);
			} else {
				return shell(`npm version ${increment}`)
					.then(() => shell('git push --tags origin HEAD'))
			}
		})
		.then(() => shell('npm publish --registry http://registry.npmjs.org'))
		.then(() => clearInterval(dots))
		.then(getLatestTag)
		.then(tag => {
			logger.art.bottle(tag);
			console.log(`\n${tag} published to npm and tagged in git`);
		});
}

function bowerBottle (increment, currentVersion, fixedVersion) {

	console.log('Publishing as bower component');
	const tag = fixedVersion || semver.inc(currentVersion, increment);
	if (!tag) {
		throw `Looks like it's trying to publish an invalid tag: ${tag}.
You might want to check how you've set up this bower component.`;
	}
	return shell(`git tag v${tag}`)
		.then(() => shell('git push --tags origin HEAD'))
		.then(getLatestTag)
		.then(tag => {
			logger.art.bottle(tag);
			console.log(`${tag} tagged in git (no requirement for npm release detected)`);
		});
}


function task (increment, forceNpm) {
	return checkIncrement(increment, forceNpm)
		.then(verifyBranch)
		.then(fetchVersions)
		.then(versions => bottle(versions, increment, forceNpm))
};

module.exports = function (program, utils) {
	program
		.command('bottle [increment]')
		.option('--npm', 'Force publishing of new component to npm')
		.description('releases a major, minor, patch or prerelease of a next component (similar to npm version + npm publish)')
		.action(function(increment, options) {
			task(increment, options.npm)
				.catch(utils.exit);
		});
};

module.exports.task = task;
