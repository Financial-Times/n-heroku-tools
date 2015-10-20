'use strict';

const shell = require('shellpromise');
const semver = require('semver');
const path = require('path');

function npmBottle (increment) {//, isBeta, newModule) {
	return shell('npm whoami')
		.then(user => {
			if (user.trim() !== 'financial-times') {
				throw 'Wrong user';
			}
		})
		.catch(() => {
			throw `Sign in to npm as financial-times before releasing anything.
Ask somebody about getting access to the account`;
		})
		.then(() => shell(`npm version ${increment}`))
		.then(() => shell('npm publish'))
		.then(() => shell('git push --tags origin HEAD'))
}

function bowerBottle (increment, currentVersion) {//, isBeta) {
	return shell(`git tag ${semver.inc(currentVersion, increment)}`)
		.then(() => shell('git push --tags origin HEAD'));
}

module.exports = function (increment, forceNpm, isBeta) {
	if (['major', 'minor', 'patch'].indexOf(increment) === -1) {
		return Promise.reject(`Incorrect version identifier. Accepted values: major, minor, patch`);
	}

	if (isBeta) {
		return Promise.reject('Beta releases not yet supported using nbt bottle. Coming soon if there\'s demand for it');
	}

	// make sure on master and up to date with origin
	return shell('git rev-parse --abbrev-ref HEAD')
		.then(branchName => {
			if (branchName.trim() !== 'master' && !isBeta) {
				throw 'Components should only be published from the master branch, unless releasing a beta version';
			} else {
				return shell('git remote update')
								.then(() => shell('git status -uno | grep up-to-date'))
								.catch(() => {
									throw 'Your branch is either ahead or behind origin/master. Please push or pull before attempting a release';
								})
			}
		})

	// get current version from npm, from git tag and from package.json and bower.json
		.then(() => Promise.all([
			// get version from npm registry
			shell('npm view --json')
				.then(info => {
					return JSON.parse(info).versions.pop();
				})
				.catch(() => null),
			// get version from github tags (aka bower version)
			shell('git fetch --tags')
				.then(() => shell('git tags'))
				.then(tagList => {
					const latest = tagList.split('\n')
						.filter(semver.valid)
						.sort(semver.gt)
						.pop()

					return latest ? latest.replace(/^v/, '') : null;
				}),
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
		]))
		.then(versions => {
			const npmVersion = versions[0];
			const tagVersion = versions[1];
			const bowerVersion = versions[2];
			const packageVersion = versions[3];
			let publishToNpm = true;
			// if npm version exists use as canonical version as it's the hardest to alter
			if (npmVersion) {
				if (semver.neq(npmVersion, packageVersion)) {
					throw `Version last published on npm is different to version in package.json.
Please set version to ${npmVersion} in package.json`;
				}

				if (semver.lt(npmVersion, tagVersion)) {
					throw `It looks like your tags have got ahead of your npm releases.
Please set version to ${tagVersion} in package.json or check out the
relevant tag in git and manually release to npm if there's a definite
need to correct previous releases`;
				}
			}

			if (bowerVersion && packageVersion === '0.0.0' && !forceNpm) {
				publishToNpm = false;
			}

			const currentVersion = npmVersion || tagVersion;
			const isNewNpmModule = forceNpm && !npmVersion;

			if (isNewNpmModule) {
				throw 'First releases of new npm modules not yet supported by nbt bottle';
			}

			return publishToNpm ? npmBottle(increment, isBeta, isNewNpmModule) : bowerBottle(increment, currentVersion, isBeta);
		});

};
