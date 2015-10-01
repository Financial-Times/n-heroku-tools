'use strict';

const packageJson = require(process.cwd() + '/package.json');
const denodeify = require('denodeify');
const normalizeName = require('../lib/normalize-name');
const readFile = denodeify(require('fs').readFile);
const writeFile = denodeify(require('fs').writeFile);
const glob = denodeify(require('glob'));
const crypto = require('crypto');
const path = require('path');

module.exports = () => {
	console.log('Hashing assets…');
	return glob(process.cwd() + '/public/*.@(css|js|map)')
		.then(files => {
			return Promise.all(files.map(file => {
				return readFile(file)
					.then(content => {
						return {
							name: path.basename(file),
							content: content
						};
					});
			}));
		})
		.then(files => {
			return files
				.map(file => {
					var hash = crypto.createHash('sha1').update(file.content.toString('utf8')).digest('hex');
					file.hashedName = file.name.replace(/(.*)(\.[a-z0-9])/i, '$1-' + hash.substring(0, 8) + '$2');
					return {
						name: file.name,
						hashedName: file.hashedName
					};
				})
				.reduce((previous, current) => {
					previous[current.name] = current.hashedName;
					return previous;
				}, {});
		})
		.then(hashes => {
			console.log("Writing public/asset-hashes.json");
			return writeFile(process.cwd() + '/public/asset-hashes.json', JSON.stringify(hashes, undefined, 2));
		});
};
