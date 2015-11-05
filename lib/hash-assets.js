'use strict';

const denodeify = require('denodeify');
const readFile = denodeify(require('fs').readFile);
const writeFile = denodeify(require('fs').writeFile);
const glob = denodeify(require('glob'));
const crypto = require('crypto');
const path = require('path');

module.exports = () => {
	console.log('Hashing assets…');
	return glob(process.cwd() + '/public/*.@(css|js)')
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
					file.hashedName = `${hash.substring(0, 8)}/${file.name}`;
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
		// add maps
		.then(hashes => {
			return glob(process.cwd() + '/public/*.@(map)')
				.then(mapFiles => {
					mapFiles.forEach(mapFile => {
						// get associated source file
						const mapBasename = path.basename(mapFile);
						const srcBasename = mapBasename.replace(/\.map$/, '');
						if (hashes[srcBasename]) {
							hashes[mapBasename] = hashes[srcBasename].replace(srcBasename, mapBasename);
						};
					});
					return hashes;
				});
		})
		.then(hashes => {
			console.log("Writing public/asset-hashes.json");
			return writeFile(process.cwd() + '/public/asset-hashes.json', JSON.stringify(hashes, undefined, 2));
		});
};
