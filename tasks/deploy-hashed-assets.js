
'use strict';

const packageJson = require(process.cwd() + '/package.json');
const denodeify = require('denodeify');
const normalizeName = require('../lib/normalize-name');
const readFile = denodeify(require('fs').readFile);
const waitForOk = require('../lib/wait-for-ok');
const path = require('path');
const aws = require('aws-sdk');

const AWS_ACCESS_HASHED_ASSETS = process.env.AWS_ACCESS_HASHED_ASSETS || process.env.aws_access_hashed_assets;
const AWS_SECRET_HASHED_ASSETS = process.env.AWS_SECRET_HASHED_ASSETS || process.env.aws_secret_hashed_assets;

const bucket = 'ft-next-hashed-assets-prod';
const usBucket = 'ft-next-hashed-assets-prod-us';
const region = 'eu-west-1';
const usRegion = 'us-east-1';

aws.config.update({
	accessKeyId: AWS_ACCESS_HASHED_ASSETS,
	secretAccessKey: AWS_SECRET_HASHED_ASSETS,
	region
});

const s3bucket = new aws.S3({ params: { Bucket: bucket } });

function upload(params) {
	return new Promise((resolve, reject) => {
		return s3bucket.upload(params, err => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
}

function task (app) {
	let assetHashes;
	try {
		console.log(process.cwd() + '/public/assets-hashes.json');
		assetHashes = require(process.cwd() + '/public/asset-hashes.json');
	} catch(err) {
		return Promise.reject('Must run `nbt build` (or `nbt hash-assets`) before running `nbt deploy-hashed-assets`');
	}

	if (!(AWS_ACCESS_HASHED_ASSETS && AWS_SECRET_HASHED_ASSETS)) {
		return Promise.reject('Must set AWS_ACCESS_HASHED_ASSETS and AWS_SECRET_HASHED_ASSETS');
	}

	app = app || normalizeName(packageJson.name, { version: false });

	console.log('Deploying hashed assets to S3...');

	return Promise.all(Object.keys(assetHashes)
		.map(file => {
			const hashedName = assetHashes[file];
			const key = 'hashed-assets/' + app + '/' + hashedName;
			const extension = path.extname(file).substring(1);

			console.log(`sending ${key} to S3`);

			return readFile(path.join(process.cwd(), 'public', file))
				.then(content => {
					let params = {
						Key: key,
						Body: content,
						ACL: 'public-read',
						CacheControl: 'public, max-age=31536000'
					};
					switch(extension) {
						case 'js':
							params.ContentType = 'text/javascript';
							break;
						case 'css':
							params.ContentType = 'text/css';
							break;
					}
					return upload(params)
						.then(() => Promise.all([
							waitForOk(`http://${bucket}.s3-website-${region}.amazonaws.com/${key}`),
							waitForOk(`http://${usBucket}.s3-website-${usRegion}.amazonaws.com/${key}`)
						]));
				});
		}));
};

module.exports = function (program, utils) {
	program
		.command('deploy-hashed-assets')
		.description('deploys hashed asset files to S3 (if AWS keys set correctly)')
		.action(function() {
			task().catch(utils.exit);
		});
};

module.exports.task = task;
