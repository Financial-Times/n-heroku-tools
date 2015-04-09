"use strict";

var packageJson = require(process.cwd() + '/package.json');
var denodeify = require('denodeify');
var normalizeName = require('../lib/normalize-name');
var readFile = denodeify(require('fs').readFile);
var writeFile = denodeify(require('fs').writeFile);
var glob = denodeify(require('glob'));
var crypto = require('crypto');
var basename = require('path').basename;
var aws = require('aws-sdk');

var AWS_ACCESS_HASHED_ASSETS = process.env.AWS_ACCESS_HASHED_ASSETS || process.env.aws_access_hashed_assets;
var AWS_SECRET_HASHED_ASSETS = process.env.AWS_SECRET_HASHED_ASSETS || process.env.aws_secret_hashed_assets;

aws.config.update({
	accessKeyId: AWS_ACCESS_HASHED_ASSETS,
	secretAccessKey: AWS_SECRET_HASHED_ASSETS
	region: 'eu-west-1'
});

function hashAndUpload(opts) {

	var file = opts.file;
	var app = opts.app;
	var bucket = 'ft-next-hashed-assets-prod';
	var key = 'hashed-assets/' + app + '/' + file.hashedName;
	var extension = (/\.([^.]+)$/.exec(file.name) || [undefined, undefined])[1];

	return new Promise(function(resolve, reject) {
		var s3bucket = new aws.S3({ params: { Bucket: bucket } });
		var params = {
			Key: key,
			Body: file.content,
			ACL: 'public-read',

			// @arjun, did you think this was in milliseconds?  It's fine to set a cache header of 19.165 years but seems like an odd choice
			CacheControl: 'public, max-age=604800000'
		};
		switch(extension) {
			case 'js':
				params.ContentType = 'text/javascript';
				break;
			case 'css':
				params.ContentType = 'text/css';
				break;
		}
		s3bucket.upload(params, function(err, data) {
			if (err) {
				console.log("Error uploading data: ", err);
				reject(err);
			} else {
				resolve({
					name: file.name,
					hashedName: file.hashedName
				});
			}
		});
	});
}

module.exports = function(app) {
	if(!(AWS_ACCESS_HASHED_ASSETS && AWS_SECRET_HASHED_ASSETS)) {
		return Promise.reject("Must set aws_access_hashed_assets and aws_secret_hashed_assets");
	}

	app = app || normalizeName(packageJson.name, { version: false });

	console.log('Deploying hashed assets to S3...');
	return glob(process.cwd() + '/public/*.@(css|js|map)')
		.then(function(files) {
			return Promise.all(files.map(function(file) {
				return readFile(file)
					.then(function(content) {
						return {
							name: basename(file),
							content: content
						};
					});
			}));
		})
		.then(function(files) {
			var mapHashName = '';
			return files
				.map(function(file) {
					var hash = crypto.createHash('sha1').update(file.content.toString('utf8')).digest('hex');
					file.hashedName = file.name.replace(/(.*)(\.[a-z0-9])/i, '$1-' + hash.substring(0, 8) + '$2');
					if (file.name === 'main.js.map') {
						mapHashName = file.hashedName;
					}
					return file;
				})
				.map(function(file) {
					var content;
					if (file.name === 'main.js') {
						content = file.content.toString('utf8');
						content = content.replace('/# sourceMappingURL=/' + app + '/' + file.name + '.map', '/# sourceMappingURL=/hashed-assets/' + app + '/' + mapHashName);
						file.content = new Buffer(content, 'utf8');
					}
					return file;
				});
		})
		.then(function(files) {
			var promise = files.reduce(function(promise, file) {
					return promise.then(function(obj) {
						return hashAndUpload({ app: app, file: file })
							.then(function(file) {
								obj[file.name] = file.hashedName;
								return obj;
							});
						});
				}, Promise.resolve({}));
			return promise;
		})
		.then(function(hashes) {
			console.log("Writing public/asset-hashes.json");
			return writeFile(process.cwd() + '/public/asset-hashes.json', JSON.stringify(hashes, undefined, 2));
		});
};
